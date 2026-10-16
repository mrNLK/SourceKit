// Pure request builders for candidate-source providers. Kept in sync with current docs (Oct 2026):
// - Exa: POST /search, category "people" (not "person"), type instant|fast|auto|deep*; useAutoprompt removed.
//   people category rejects excludeDomains and published-date filters (400).
// - Parallel: /v1/search, /v1/extract (advanced_settings), /v1beta/findall/entity-search, /v1beta/findall/runs (V1).
// - Apollo: POST /api/v1/mixed_people/api_search (0 credits, master key), filters as query params.

export const EXA_BASE = "https://api.exa.ai";
export const PARALLEL_BASE = "https://api.parallel.ai";
export const APOLLO_BASE = "https://api.apollo.io/api/v1";
export const EXA_WEBSETS_BASE = "https://api.exa.ai/websets/v0";

export type ExaSearchType = "instant" | "fast" | "auto" | "deep-lite" | "deep" | "deep-reasoning";

/** Structured filters (e.g. derived from parse-jd / research-role output). */
export interface CandidateFilters {
  titles?: string[];
  seniorities?: string[]; // Apollo values: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern
  locations?: string[];
  skills?: string[];
  companyDomains?: string[];
  companies?: string[];
  keywords?: string;
}

function list(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean).slice(0, 25);
}

export function sanitizeFilters(raw: unknown): CandidateFilters {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    titles: list(r.titles),
    seniorities: list(r.seniorities),
    locations: list(r.locations),
    skills: list(r.skills),
    companyDomains: list(r.companyDomains ?? r.company_domains),
    companies: list(r.companies),
    keywords: typeof r.keywords === "string" ? r.keywords.slice(0, 500) : undefined,
  };
}

/** Natural-language people query for Exa / Parallel from a free-text query + filters. */
export function buildPeopleQuery(query: string, f: CandidateFilters = {}): string {
  const parts = [`professional profiles of ${query.trim() || (f.titles || []).join(" or ") || "engineers"}`];
  if (f.titles?.length && query.trim()) parts.push(`with titles like ${f.titles.slice(0, 3).join(", ")}`);
  if (f.skills?.length) parts.push(`with experience in ${f.skills.slice(0, 5).join(", ")}`);
  if (f.companies?.length) parts.push(`working at ${f.companies.slice(0, 5).join(" or ")}`);
  if (f.locations?.length) parts.push(`based in ${f.locations.slice(0, 3).join(" or ")}`);
  return parts.join(" ");
}

export function buildExaPeopleSearch(query: string, opts: { numResults?: number; type?: ExaSearchType } = {}) {
  return {
    query,
    type: opts.type ?? "auto",
    category: "people",
    numResults: opts.numResults ?? 25,
    contents: { highlights: { maxCharacters: 500 } },
  };
}

export function buildParallelEntitySearch(objective: string, matchLimit = 100) {
  return { entity_type: "people", objective, match_limit: Math.max(5, Math.min(1000, Math.trunc(matchLimit))) };
}

export function buildParallelSearchV1(objective: string, searchQueries: string[], maxResults = 10) {
  return {
    objective,
    search_queries: searchQueries.slice(0, 5),
    advanced_settings: { max_results: maxResults },
  };
}

export function buildParallelExtractV1(url: string, objective?: string) {
  return {
    urls: [url],
    ...(objective ? { objective } : {}),
    advanced_settings: { full_content: true },
  };
}

export type FindAllGenerator = "preview" | "base" | "core" | "pro";

export interface DeepSearchInput {
  company?: string;
  role: string;
  location?: string;
  extraConditions?: { name: string; description: string }[];
}

export function buildFindAllPeopleRun(input: DeepSearchInput, opts: { generator?: FindAllGenerator; matchLimit?: number; excludeUrls?: string[] } = {}) {
  const conditions = [
    {
      name: "role_match",
      description: `The person currently works in a ${input.role} role (or a closely related engineering/research role).`,
    },
  ];
  if (input.company) {
    conditions.push({ name: "company_match", description: `The person currently works at ${input.company}.` });
  }
  if (input.location) {
    conditions.push({ name: "location_match", description: `The person is based in or near ${input.location}.` });
  }
  for (const c of input.extraConditions || []) conditions.push(c);
  return {
    objective: `Find people who work as ${input.role}${input.company ? ` at ${input.company}` : ""}${input.location ? ` in ${input.location}` : ""}. Prefer public professional profiles (LinkedIn, GitHub, personal sites).`,
    entity_type: "people",
    match_conditions: conditions,
    generator: opts.generator ?? "base",
    match_limit: Math.max(5, Math.min(1000, Math.trunc(opts.matchLimit ?? 25))),
    ...(opts.excludeUrls?.length ? { exclude_list: opts.excludeUrls.slice(0, 10000).map((url) => ({ name: url, url })) } : {}),
  };
}

export function buildWebsetPeopleSearch(input: DeepSearchInput, count = 25, maxPeoplePerCompany?: number) {
  const criteria = [{ description: `currently works as ${input.role} or a closely related role` }];
  if (input.company) criteria.push({ description: `currently works at ${input.company}` });
  if (input.location) criteria.push({ description: `based in ${input.location}` });
  return {
    search: {
      query: `${input.role}${input.company ? ` at ${input.company}` : ""}${input.location ? ` in ${input.location}` : ""}`,
      count: Math.max(1, Math.min(1000, Math.trunc(count))),
      entity: { type: "person" },
      criteria: criteria.slice(0, 5),
      ...(maxPeoplePerCompany ? { maxPeoplePerCompany } : {}),
    },
  };
}

/** Apollo api_search uses array query params like person_titles[]=x. */
export function buildApolloSearchUrl(f: CandidateFilters, page = 1, perPage = 25): string {
  const p = new URLSearchParams();
  for (const t of f.titles || []) p.append("person_titles[]", t);
  if (f.titles?.length) p.set("include_similar_titles", "true");
  for (const s of f.seniorities || []) p.append("person_seniorities[]", s);
  for (const l of f.locations || []) p.append("person_locations[]", l);
  for (const d of f.companyDomains || []) p.append("q_organization_domains_list[]", d);
  const kw = [f.keywords, ...(f.skills || [])].filter(Boolean).join(" ");
  if (kw) p.set("q_keywords", kw);
  p.set("page", String(Math.max(1, Math.min(500, page))));
  p.set("per_page", String(Math.max(1, Math.min(100, perPage))));
  return `${APOLLO_BASE}/mixed_people/api_search?${p.toString()}`;
}

export function hasApolloFilters(f: CandidateFilters): boolean {
  return !!(f.titles?.length || f.seniorities?.length || f.locations?.length || f.companyDomains?.length || f.keywords || f.skills?.length);
}
