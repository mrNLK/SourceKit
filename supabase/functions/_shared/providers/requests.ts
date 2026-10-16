// Pure request builders for candidate-source providers. Kept in sync with current docs (Oct 2026):
// - Exa: POST /search, category "people" (not "person"), type instant|fast|auto|deep*; useAutoprompt removed.
//   people category rejects excludeDomains and published-date filters (400).
// - Parallel: /v1/search, /v1/extract (advanced_settings), /v1beta/findall/entity-search, /v1beta/findall/runs (V1).
// - Harmonic: /search/search_agent (companies), /companies/{urn}/employees, /persons/batchGet, /search/typeahead?search_type=PERSON.
// - Airscale: POST /v1/email (Bearer key; 2 credits per found email, not_found free).

export const EXA_BASE = "https://api.exa.ai";
export const PARALLEL_BASE = "https://api.parallel.ai";
export const AIRSCALE_BASE = "https://api.airscale.io/v1";
export const EXA_WEBSETS_BASE = "https://api.exa.ai/websets/v0";

export type ExaSearchType = "instant" | "fast" | "auto" | "deep-lite" | "deep" | "deep-reasoning";

/** Structured filters (e.g. derived from parse-jd / research-role output). */
export interface CandidateFilters {
  titles?: string[];
  seniorities?: string[];
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

export function hasFilters(f: CandidateFilters): boolean {
  return !!(f.titles?.length || f.seniorities?.length || f.locations?.length || f.companyDomains?.length || f.companies?.length || f.keywords || f.skills?.length);
}

// ---------- keyword extraction (free, deterministic) ----------
// Long role descriptions ("senior ML infrastructure engineer, PyTorch, distributed training")
// return 0 results from Harmonic search_agent and GitHub search, which need short topical keywords.

const SENIORITY = /\b(senior|sr\.?|staff|principal|lead|junior|jr\.?|mid[- ]level|entry[- ]level|head of|experienced|expert|top|great|strong|world[- ]class)\b/gi;
const ROLE_NOUNS = /\b(engineers?|developers?|scientists?|researchers?|programmers?|architects?|specialists?|managers?|leads?|swe|sde|ic|people|candidates?|folks|someone|talent|hires?|roles?)\b/gi;
const FILLER = /\b(with|who|that|has|have|having|knows?|experience|experienced|background|skills?|in|on|of|for|at|the|a|an|and|or|plus|including|using|like|looking|find|me|years?|\d+\+?)\b/gi;

export interface SearchTerms {
  /** Topical keyword phrases, most important first ("ML infrastructure", "PyTorch", "distributed training"). */
  keywords: string[];
}

export function extractSearchTerms(query: string, f: CandidateFilters = {}): SearchTerms {
  const raw = [query, f.keywords || "", ...(f.skills || [])].join(", ");
  const phrases = raw.split(/[,;/|()\n]+|\s+(?:and|or|with|plus)\s+/i)
    .map((p) => p.replace(SENIORITY, " ").replace(ROLE_NOUNS, " ").replace(FILLER, " ").replace(/[^\w+#.\- ]/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1);
  const seen = new Set<string>();
  const keywords = phrases.filter((p) => !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase())).slice(0, 6);
  return { keywords };
}

/**
 * Company queries for Harmonic search_agent, tried in order until one returns companies.
 * Verified live (Oct 2026): "companies building senior ML infrastructure engineer, PyTorch, distributed training"
 * returns count 0, while "distributed training infrastructure" returns thousands.
 */
export function buildHarmonicCompanyQueries(query: string, f: CandidateFilters = {}): string[] {
  if (f.companies?.length) return [f.companies.slice(0, 5).join(", ")];
  const { keywords } = extractSearchTerms(query, f);
  const out = [keywords.slice(0, 3).join(" "), keywords.slice(0, 2).join(" "), keywords[keywords.length > 1 ? 1 : 0], keywords[0]]
    .filter((q): q is string => !!q && q.trim().length > 1);
  if (!out.length && query.trim()) out.push(query.trim().slice(0, 80));
  return [...new Set(out)].slice(0, 3);
}

/** Back-compat: first Harmonic company query. */
export function buildHarmonicCompanyQuery(query: string, f: CandidateFilters = {}): string {
  return buildHarmonicCompanyQueries(query, f)[0] ?? query;
}

/**
 * GitHub repository search queries: keyword pairs first (repos matching several query concepts),
 * then single keywords. Restricted to established, recently active repos. Ranking/relevance
 * filtering happens client-side (see scoreRepoRelevance).
 */
export function buildGithubRepoQueries(query: string, f: CandidateFilters = {}, now: Date = new Date()): string[] {
  const { keywords } = extractSearchTerms(query, f);
  const since = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const k = keywords.slice(0, 3);
  const pairs: string[] = [];
  for (let i = 0; i < k.length && pairs.length < 2; i++) for (let j = i + 1; j < k.length && pairs.length < 2; j++) pairs.push(`${k[j]} ${k[i]}`);
  return [
    ...pairs.map((q) => `${q} in:name,description,topics stars:>=100 pushed:>=${since}`),
    ...k.map((q) => `${q} in:name,description,topics stars:>=500 pushed:>=${since}`),
  ];
}

const normText = (s: string) => s.toLowerCase().replace(/[-_/]+/g, " ").replace(/[^a-z0-9+#. ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Repo-to-query relevance: each keyword phrase counts 1 if all its words appear in the repo
 * name/description, 0.5 if only via topics (a tag alone is weak evidence). A repo literally named
 * after a keyword and owned by the same org (pytorch/pytorch) is canonical.
 */
export function scoreRepoRelevance(repo: { name?: string; full_name?: string; description?: string | null; topics?: string[]; owner?: { login?: string } },
  keywords: string[]): { score: number; canonical: boolean } {
  const text = ` ${normText(`${repo.name || ""} ${repo.description || ""}`)} `;
  const topics = ` ${normText((repo.topics || []).join(" "))} `;
  let score = 0;
  for (const kw of keywords) {
    const words = normText(kw).split(" ").filter(Boolean);
    if (!words.length) continue;
    if (words.every((w) => text.includes(` ${w} `))) score += 1;
    else if (words.every((w) => topics.includes(` ${w} `) || text.includes(` ${w} `))) score += 0.5;
  }
  const name = (repo.name || "").toLowerCase();
  const canonical = keywords.some((k) => normText(k) === name) && (repo.owner?.login || "").toLowerCase() === name;
  return { score, canonical };
}

/** Minimum relevance for a non-canonical repo (with 2+ keywords): more than a single tag match. */
export const MIN_REPO_RELEVANCE = 1;
/** Harmonic employee group filter: leadership roles -> LEADERSHIP, else NON_LEADERSHIP-inclusive ALL. */
export function harmonicEmployeeGroup(f: CandidateFilters, query: string): "LEADERSHIP" | "FOUNDERS_AND_CEO" | "NON_LEADERSHIP" {
  const t = [query, ...(f.titles || []), ...(f.seniorities || [])].join(" ").toLowerCase();
  if (/\b(founders?|ceos?)\b/.test(t) && !/\bfounding\b/.test(t)) return "FOUNDERS_AND_CEO";
  if (/\b(vp|head of|director|chief|cto|c_suite|leadership)\b/.test(t)) return "LEADERSHIP";
  return "NON_LEADERSHIP"; // IC queries: engineers/staff, not founders/execs/board
}

/** True when the query targets individual contributors (not founders/execs). */
export function isIcQuery(f: CandidateFilters, query: string): boolean {
  return harmonicEmployeeGroup(f, query) === "NON_LEADERSHIP";
}

const ENGINEERING_TITLE = /\b(engineer|engineering|developer|scientist|researcher|swe|sde|programmer|architect|technical staff|mts|ml|machine learning|infrastructure|platform|sre|devops|research)\b/i;
const NON_IC_TITLE = /\b(co-?founder|founder|ceo|cto|coo|cfo|chief|vp|vice president|president|head of|director|board|partner|investor|advisor|recruiter|talent|sales|marketing|account|operations|hr|people partner)\b/i;

/** Rank for IC sourcing: 0 = engineering IC, 1 = unknown/other, 2 = exec/board/non-technical. */
export function icTitleRank(title: string | null | undefined): number {
  const t = title || "";
  if (!t) return 1;
  if (NON_IC_TITLE.test(t)) return 2;
  return ENGINEERING_TITLE.test(t) ? 0 : 1;
}

export interface AirscaleEmailInput {
  linkedin_profile_url?: string;
  first_name?: string;
  last_name?: string;
  domain?: string;
  company_name?: string;
}

/**
 * Airscale needs either a LinkedIn profile URL, or first+last name plus company name/domain.
 * Returns null if the candidate doesn't meet the minimum input (no call, no cost).
 */
export function buildAirscaleEmailInput(c: { fullName: string; linkedinUrl?: string | null; companyDomain?: string | null; currentCompany?: string | null }): AirscaleEmailInput | null {
  const out: AirscaleEmailInput = {};
  if (c.linkedinUrl) out.linkedin_profile_url = c.linkedinUrl;
  const parts = c.fullName.replace(/[^\p{L}\s'-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && !/\*/.test(c.fullName)) {
    out.first_name = parts[0];
    out.last_name = parts[parts.length - 1];
    if (c.companyDomain) out.domain = c.companyDomain;
    if (c.currentCompany) out.company_name = c.currentCompany;
  }
  const nameForm = !!(out.first_name && out.last_name && (out.domain || out.company_name));
  if (!out.linkedin_profile_url && !nameForm) return null;
  if (!nameForm) {
    delete out.first_name;
    delete out.last_name;
    delete out.domain;
    delete out.company_name;
  }
  return out;
}
