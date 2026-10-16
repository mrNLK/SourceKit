/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Pure mapping between UnifiedCandidate and DB rows + cost estimates. No Deno/network imports.
import { linkedinSlug, type Provider, type UnifiedCandidate } from "./candidate.ts";
import { dedupCandidates, sourcingScore } from "./dedup.ts";

export interface SourcedCandidateRow {
  id?: string;
  user_id: string;
  full_name: string;
  headline?: string | null;
  current_title?: string | null;
  current_company?: string | null;
  company_domain?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  linkedin_slug?: string | null;
  github_login?: string | null;
  apollo_id?: string | null;
  harmonic_urn?: string | null;
  emails: string[];
  profile_urls: string[];
  summary?: string | null;
  avatar_url?: string | null;
  providers: string[];
  sourcing_score: number;
  updated_at?: string;
}

export function toRow(userId: string, c: UnifiedCandidate, id?: string): SourcedCandidateRow {
  return {
    ...(id ? { id } : {}),
    user_id: userId,
    full_name: c.fullName,
    headline: c.headline ?? null,
    current_title: c.currentTitle ?? null,
    current_company: c.currentCompany ?? null,
    company_domain: c.companyDomain ?? null,
    location: c.location ?? null,
    linkedin_url: c.linkedinUrl ?? null,
    linkedin_slug: linkedinSlug(c.linkedinUrl),
    github_login: c.githubLogin ?? null,
    apollo_id: c.apolloId ?? null,
    harmonic_urn: c.harmonicUrn ?? null,
    emails: c.emails,
    profile_urls: c.profileUrls.slice(0, 20),
    summary: c.summary ?? null,
    avatar_url: c.avatarUrl ?? null,
    providers: [...new Set(c.sources.map((s) => s.provider))],
    sourcing_score: sourcingScore(c),
  };
}

export function fromRow(r: SourcedCandidateRow): UnifiedCandidate & { id?: string } {
  return {
    id: r.id,
    fullName: r.full_name,
    headline: r.headline,
    currentTitle: r.current_title,
    currentCompany: r.current_company,
    companyDomain: r.company_domain,
    location: r.location,
    linkedinUrl: r.linkedin_url,
    githubLogin: r.github_login,
    apolloId: r.apollo_id,
    harmonicUrn: r.harmonic_urn,
    emails: r.emails || [],
    profileUrls: r.profile_urls || [],
    summary: r.summary,
    avatarUrl: r.avatar_url,
    // Existing providers count toward agreement but carry no new hit rows.
    sources: (r.providers || []).map((p) => ({ provider: p as Provider, rank: 50 })),
  };
}

/**
 * Merge fresh candidates with existing rows. Fresh data wins field conflicts (more recent);
 * the existing row id is preserved so we update instead of inserting a duplicate.
 * Returns rows to upsert plus, per row, the fresh hits to record.
 */
export function mergeWithExisting(userId: string, fresh: UnifiedCandidate[], existing: SourcedCandidateRow[]) {
  const freshMerged = dedupCandidates(fresh);
  const tagged = [
    ...freshMerged.map((c) => ({ ...c, _fresh: true as const })),
    ...existing.map((r) => ({ ...fromRow(r), _fresh: false as const })),
  ];
  // dedupCandidates keeps first object's identity; carry ids/hits through via side maps.
  const groups = dedupCandidates(tagged.map((t, i) => ({ ...t, sources: t.sources.map((s) => ({ ...s, _i: i })) as any })));
  return groups
    .map((g) => {
      const idxs = [...new Set(g.sources.map((s: any) => s._i as number))];
      const existingIdx = idxs.find((i) => !tagged[i]._fresh);
      const freshIdxs = idxs.filter((i) => tagged[i]._fresh);
      if (!freshIdxs.length) return null; // untouched existing row
      const id = existingIdx !== undefined ? (tagged[existingIdx] as any).id : undefined;
      const freshHits = freshIdxs.flatMap((i) => tagged[i].sources);
      const clean = { ...g, sources: g.sources.map(({ _i, ...s }: any) => s) };
      return { row: toRow(userId, clean, id), hits: freshHits };
    })
    .filter((x): x is { row: SourcedCandidateRow; hits: UnifiedCandidate["sources"] } => x !== null);
}

/** Rough list-price cost estimates (USD) for logging. Verified Oct 2026: Exa search, Parallel Entity Search, FindAll base. FindAll preview/core/pro are placeholders: check docs.parallel.ai pricing. */
export const COST = {
  exaSearch: (results: number) => 0.007 + Math.max(0, results - 10) * 0.001,
  parallelEntitySearch: (results: number) => 0.005 + Math.max(0, results - 100) * 0.00005,
  apolloSearch: () => 0,
  githubSearch: () => 0,
  findAllRun: (generator: string, matches: number) =>
    generator === "preview" ? 0.1 : 0.25 + matches * (generator === "pro" ? 0.15 : generator === "core" ? 0.08 : 0.03),
};
