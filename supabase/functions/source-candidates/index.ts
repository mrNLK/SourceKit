import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, authErrorResponse } from "../_shared/auth.ts";
import {
  apolloPeopleSearch, exaPeopleSearch, githubUserSearch, parallelEntitySearchPeople,
} from "../_shared/providers/clients.ts";
import { buildPeopleQuery, hasApolloFilters, sanitizeFilters } from "../_shared/providers/requests.ts";
import { clamp, exaMaxResults, isApolloEnabled, isParallelPeopleEnabled } from "../_shared/providers/flags.ts";
import { COST } from "../_shared/providers/persist.ts";
import { persistCandidates } from "../_shared/providers/store.ts";
import type { UnifiedCandidate } from "../_shared/providers/candidate.ts";

/**
 * source-candidates: one query -> fan out to all enabled people sources -> normalize -> dedup -> persist.
 *
 * Body: { query: string, filters?: { titles, seniorities, locations, skills, company_domains, companies, keywords },
 *         sources?: ("exa"|"parallel"|"apollo"|"github")[], limit?: number, persist?: boolean }
 * Consumes one pilot "search" unit per call (same as other search functions).
 */
type SourceName = "exa" | "parallel" | "apollo" | "github";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const { user } = await requireAuth(req, { usage: "search" });
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 500) : "";
    const filters = sanitizeFilters(body.filters);
    if (!query && !hasApolloFilters(filters)) {
      return new Response(JSON.stringify({ error: "query or filters required" }), { status: 400, headers });
    }
    const getEnv = (n: string) => Deno.env.get(n);
    const limit = clamp(body.limit, 5, 200, 50);
    const requested = new Set<SourceName>(Array.isArray(body.sources) && body.sources.length ? body.sources : ["exa", "parallel", "apollo", "github"]);

    const enabled: Record<SourceName, boolean> = {
      exa: !!getEnv("EXA_API_KEY"),
      parallel: isParallelPeopleEnabled(getEnv) && !!getEnv("PARALLEL_API_KEY"),
      apollo: isApolloEnabled(getEnv) && hasApolloFilters(filters),
      github: !!query,
    };

    const nl = buildPeopleQuery(query, filters);
    const tasks: { source: SourceName; run: () => Promise<{ candidates: UnifiedCandidate[]; cost: number; total?: number | null }> }[] = [];
    if (requested.has("exa") && enabled.exa) {
      const n = Math.min(exaMaxResults(getEnv), limit);
      tasks.push({ source: "exa", run: async () => ({ candidates: await exaPeopleSearch(getEnv("EXA_API_KEY")!, nl, { numResults: n }), cost: COST.exaSearch(n) }) });
    }
    if (requested.has("parallel") && enabled.parallel) {
      const n = Math.max(limit, 100); // first 100 results are included in the per-request price
      tasks.push({ source: "parallel", run: async () => ({ candidates: await parallelEntitySearchPeople(getEnv("PARALLEL_API_KEY")!, nl, n), cost: COST.parallelEntitySearch(n) }) });
    }
    if (requested.has("apollo") && enabled.apollo) {
      tasks.push({ source: "apollo", run: async () => {
        const r = await apolloPeopleSearch(getEnv("APOLLO_API_KEY")!, filters, 1, Math.min(100, limit));
        return { candidates: r.candidates, cost: 0, total: r.total };
      } });
    }
    if (requested.has("github") && enabled.github) {
      const ghq = [query, ...(filters.locations || []).slice(0, 1).map((l) => `location:"${l.split(",")[0]}"`)].join(" ");
      tasks.push({ source: "github", run: async () => ({ candidates: await githubUserSearch(getEnv("GITHUB_TOKEN"), ghq, Math.min(30, limit)), cost: 0 }) });
    }

    if (!tasks.length) {
      return new Response(JSON.stringify({ error: "No enabled people sources for this request", enabled }), { status: 422, headers });
    }

    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const sources: Record<string, { count: number; est_cost_usd: number; total?: number | null; error?: string }> = {};
    // Order = merge priority for field conflicts: structured sources first.
    const priority: SourceName[] = ["apollo", "github", "exa", "parallel"];
    const bySource = new Map<SourceName, UnifiedCandidate[]>();
    settled.forEach((r, i) => {
      const s = tasks[i].source;
      if (r.status === "fulfilled") {
        sources[s] = { count: r.value.candidates.length, est_cost_usd: Number(r.value.cost.toFixed(4)), total: r.value.total };
        bySource.set(s, r.value.candidates);
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error(`source ${s} failed:`, msg);
        sources[s] = { count: 0, est_cost_usd: 0, error: msg.slice(0, 200) };
      }
    });
    const all = priority.flatMap((s) => bySource.get(s) || []);

    const supabase = createClient(getEnv("SUPABASE_URL")!, getEnv("SUPABASE_SERVICE_ROLE_KEY")!);
    const persist = body.persist !== false;
    let candidates: unknown[];
    if (persist) {
      candidates = (await persistCandidates(supabase, user.id, all, { query: query || nl })).slice(0, limit);
    } else {
      const { dedupCandidates, sourcingScore } = await import("../_shared/providers/dedup.ts");
      candidates = dedupCandidates(all).map((c) => ({ ...c, sourcing_score: sourcingScore(c) }))
        .sort((a, b) => b.sourcing_score - a.sourcing_score).slice(0, limit);
    }

    return new Response(JSON.stringify({
      candidates,
      sources,
      enabled,
      raw_count: all.length,
      est_cost_usd: Number(Object.values(sources).reduce((a, s) => a + s.est_cost_usd, 0).toFixed(4)),
    }), { headers });
  } catch (e) {
    const authResp = authErrorResponse(e, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error("source-candidates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "source-candidates failed" }), { status: 500, headers });
  }
});
