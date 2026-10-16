/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Persistence helpers for sourced candidates (Supabase service-role client).
import type { UnifiedCandidate } from "./candidate.ts";
import { linkedinSlug } from "./candidate.ts";
import { mergeWithExisting, type SourcedCandidateRow } from "./persist.ts";

// deno-lint-ignore no-explicit-any
type Supa = any;

function quote(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

/** Load existing rows for this user that share any hard identity with the fresh set. */
export async function loadExisting(supabase: Supa, userId: string, fresh: UnifiedCandidate[]): Promise<SourcedCandidateRow[]> {
  const li = [...new Set(fresh.map((c) => linkedinSlug(c.linkedinUrl)).filter(Boolean) as string[])];
  const gh = [...new Set(fresh.map((c) => c.githubLogin).filter(Boolean) as string[])];
  const ap = [...new Set(fresh.map((c) => c.apolloId).filter(Boolean) as string[])];
  const em = [...new Set(fresh.flatMap((c) => c.emails))];
  const ors: string[] = [];
  if (li.length) ors.push(`linkedin_slug.in.(${li.map(quote).join(",")})`);
  if (gh.length) ors.push(`github_login.in.(${gh.map(quote).join(",")})`);
  if (ap.length) ors.push(`apollo_id.in.(${ap.map(quote).join(",")})`);
  if (em.length) ors.push(`emails.ov.{${em.map(quote).join(",")}}`);
  if (!ors.length) return [];
  const { data, error } = await supabase.from("sourced_candidates").select("*").eq("user_id", userId).or(ors.join(",")).limit(1000);
  if (error) throw new Error(`load existing candidates: ${error.message}`);
  return data || [];
}

export async function persistCandidates(
  supabase: Supa,
  userId: string,
  fresh: UnifiedCandidate[],
  ctx: { query?: string; sourcingRunId?: string } = {},
): Promise<SourcedCandidateRow[]> {
  const existing = await loadExisting(supabase, userId, fresh);
  const merged = mergeWithExisting(userId, fresh, existing);
  const saved: SourcedCandidateRow[] = [];
  for (const { row, hits } of merged) {
    const payload = { ...row, updated_at: new Date().toISOString() };
    const q = row.id
      ? supabase.from("sourced_candidates").update(payload).eq("id", row.id).eq("user_id", userId).select().single()
      : supabase.from("sourced_candidates").insert(payload).select().single();
    const { data, error } = await q;
    if (error) {
      console.error("persist candidate failed:", error.message);
      continue;
    }
    saved.push(data);
    if (hits.length) {
      await supabase.from("candidate_source_hits").insert(hits.map((h) => ({
        candidate_id: data.id,
        user_id: userId,
        provider: h.provider,
        external_id: h.externalId ?? null,
        url: h.url ?? null,
        rank: h.rank ?? null,
        raw_score: h.rawScore ?? null,
        snippet: h.snippet ? String(h.snippet).slice(0, 1000) : null,
        query: ctx.query ?? null,
        sourcing_run_id: ctx.sourcingRunId ?? null,
      })));
    }
  }
  return saved.sort((a, b) => b.sourcing_score - a.sourcing_score);
}
