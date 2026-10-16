import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, authErrorResponse } from "../_shared/auth.ts";
import {
  findAllCreatePeopleRun, findAllGetResult, websetCreatePeople, websetGetPeople,
} from "../_shared/providers/clients.ts";
import { clamp, isParallelPeopleEnabled } from "../_shared/providers/flags.ts";
import { COST } from "../_shared/providers/persist.ts";
import { persistCandidates } from "../_shared/providers/store.ts";
import type { FindAllGenerator } from "../_shared/providers/requests.ts";

/**
 * Deep search tier (async, explicit, higher cost).
 *
 * POST { action: "start", company?, role, location?, engine?: "findall"|"webset", match_limit?, generator? }
 *   -> { run_id, engine, external_run_id, status, est_cost_usd }
 *   Consumes one pilot "search" unit.
 * POST { action: "status", run_id }
 *   -> { status, is_active, engineers[] (legacy shape), candidates[] (persisted) }
 *   Allowlist-only (no cap consumption) so polling is free.
 *
 * Engines: Parallel FindAll V1 (/v1beta/findall/runs; verified matches; gated by
 * PARALLEL_PEOPLE_SOURCES_ENABLED) or Exa Websets (entity person, criteria). Default: findall
 * when enabled, else webset.
 */
const MAX_MATCHES = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "start";
    const getEnv = (n: string) => Deno.env.get(n);
    const parallelOk = isParallelPeopleEnabled(getEnv) && !!getEnv("PARALLEL_API_KEY");
    const exaKey = getEnv("EXA_API_KEY");

    const { user } = await requireAuth(req, action === "start" ? { usage: "search" } : {});
    const supabase = createClient(getEnv("SUPABASE_URL")!, getEnv("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "start") {
      const role = typeof body.role === "string" ? body.role.trim().slice(0, 200) : "";
      const company = typeof body.company === "string" ? body.company.trim().slice(0, 200) : undefined;
      const location = typeof body.location === "string" ? body.location.trim().slice(0, 200) : undefined;
      if (!role) return reply({ error: "role is required and must be a string" }, 400);

      const engine = body.engine ?? (parallelOk ? "findall" : "webset");
      const matchLimit = clamp(body.match_limit ?? body.max_results, 5, MAX_MATCHES, 25);
      const input = { role, company, location };
      let external: { id: string; status: string };
      let est = 0;
      if (engine === "findall") {
        if (!parallelOk) return reply({ error: "Parallel people sources are disabled (PARALLEL_PEOPLE_SOURCES_ENABLED)" }, 422);
        const generator: FindAllGenerator = ["preview", "base", "core", "pro"].includes(body.generator) ? body.generator : "base";
        external = await findAllCreatePeopleRun(getEnv("PARALLEL_API_KEY")!, input, { generator, matchLimit });
        est = COST.findAllRun(generator, matchLimit);
      } else if (engine === "webset") {
        if (!exaKey) return reply({ error: "EXA_API_KEY not configured" }, 500);
        external = await websetCreatePeople(exaKey, input, matchLimit, clamp(body.max_people_per_company, 1, 50, 10));
      } else {
        return reply({ error: "engine must be findall or webset" }, 400);
      }
      const provider = engine === "findall" ? "parallel_findall" : "exa_webset";
      const { data: run, error } = await supabase.from("sourcing_runs").insert({
        user_id: user.id, provider, external_run_id: external.id, status: external.status, input, match_limit: matchLimit, est_cost_usd: est || null,
      }).select().single();
      if (error) throw new Error(`record run: ${error.message}`);
      return reply({ run_id: run.id, engine, external_run_id: external.id, status: external.status, est_cost_usd: est || null });
    }

    if (action === "status") {
      const { data: run, error } = await supabase.from("sourcing_runs").select("*").eq("id", body.run_id).eq("user_id", user.id).maybeSingle();
      if (error || !run) return reply({ error: "run not found" }, 404);
      const result = run.provider === "parallel_findall"
        ? await findAllGetResult(getEnv("PARALLEL_API_KEY")!, run.external_run_id)
        : await websetGetPeople(exaKey!, run.external_run_id);
      const company = run.input?.company;
      for (const c of result.candidates) if (!c.currentCompany && company) c.currentCompany = company;
      const saved = await persistCandidates(supabase, user.id, result.candidates, { query: `${run.input?.role ?? ""} ${company ?? ""}`.trim(), sourcingRunId: run.id });
      await supabase.from("sourcing_runs").update({ status: result.status, result_count: result.candidates.length, updated_at: new Date().toISOString() }).eq("id", run.id);
      const engineers = result.candidates.map((c) => ({
        name: c.fullName,
        title: c.currentTitle ?? "",
        linkedin_url: c.linkedinUrl ?? null,
        github_url: c.githubLogin ? `https://github.com/${c.githubLogin}` : null,
        notable_work: c.summary ?? "",
        company: c.currentCompany ?? company ?? "",
      }));
      return reply({ status: result.status, is_active: result.isActive, engineers, candidates: saved });
    }

    return reply({ error: "action must be start or status" }, 400);
  } catch (e) {
    const authResp = authErrorResponse(e, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error("map-company-talent error:", e);
    return reply({ error: e instanceof Error ? e.message : "deep search failed" }, 500);
  }
});
