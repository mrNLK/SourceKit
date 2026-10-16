import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, authErrorResponse } from "../_shared/auth.ts";
import { airscaleFindEmail } from "../_shared/providers/clients.ts";
import { buildAirscaleEmailInput } from "../_shared/providers/requests.ts";
import { AIRSCALE_MAX_BATCH, isAirscaleEnabled } from "../_shared/providers/flags.ts";

/**
 * Shortlist-only email enrichment via Airscale (POST https://api.airscale.io/v1/email).
 * Body: { candidate_ids: string[] } (sourced_candidates ids owned by the caller, max 25).
 * Skips candidates that already have an email or lack the minimum Airscale input.
 * Off unless AIRSCALE_API_KEY is set. Consumes one pilot "enrich" unit per call.
 * Cost: 2 Airscale credits per found email; not_found is free.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const getEnv = (n: string) => Deno.env.get(n);
    if (!isAirscaleEnabled(getEnv)) return reply({ error: "Email enrichment is not configured (AIRSCALE_API_KEY unset)" }, 422);
    const { user } = await requireAuth(req, { usage: "enrich" });
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.candidate_ids) ? body.candidate_ids.filter((x: unknown) => typeof x === "string") : [];
    if (!ids.length) return reply({ error: "candidate_ids required" }, 400);
    if (ids.length > AIRSCALE_MAX_BATCH) return reply({ error: `At most ${AIRSCALE_MAX_BATCH} candidates per call (shortlist only)` }, 400);

    const supabase = createClient(getEnv("SUPABASE_URL")!, getEnv("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rows, error } = await supabase.from("sourced_candidates").select("*").eq("user_id", user.id).in("id", ids);
    if (error) throw new Error(error.message);

    const apiKey = getEnv("AIRSCALE_API_KEY")!;
    const results: { id: string; status: string; email?: string | null }[] = [];
    let found = 0;
    for (const r of rows || []) {
      if ((r.emails || []).length) {
        results.push({ id: r.id, status: "already_has_email", email: r.emails[0] });
        continue;
      }
      const input = buildAirscaleEmailInput({ fullName: r.full_name, linkedinUrl: r.linkedin_url, companyDomain: r.company_domain, currentCompany: r.current_company });
      if (!input) {
        results.push({ id: r.id, status: "insufficient_input" });
        continue;
      }
      try {
        const res = await airscaleFindEmail(apiKey, input);
        const now = new Date().toISOString();
        if (res.status === "success" && res.email) {
          found++;
          await supabase.from("sourced_candidates").update({
            emails: [res.email.toLowerCase()], email_provider: "airscale", email_status: res.email_status ?? "valid", email_checked_at: now, updated_at: now,
          }).eq("id", r.id).eq("user_id", user.id);
          await supabase.from("candidate_source_hits").insert({ candidate_id: r.id, user_id: user.id, provider: "airscale", snippet: res.email_status ?? null });
        } else {
          await supabase.from("sourced_candidates").update({ email_status: res.status, email_checked_at: now }).eq("id", r.id).eq("user_id", user.id);
        }
        results.push({ id: r.id, status: res.status, email: res.email });
      } catch (e) {
        results.push({ id: r.id, status: "error" });
        console.error("airscale error:", e instanceof Error ? e.message : e);
      }
    }
    return reply({ results, found, est_credits: found * 2 });
  } catch (e) {
    const authResp = authErrorResponse(e, getCorsHeaders(req));
    if (authResp) return authResp;
    console.error("enrich-candidate-emails error:", e);
    return reply({ error: e instanceof Error ? e.message : "enrichment failed" }, 500);
  }
});
