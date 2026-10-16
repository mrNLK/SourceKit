/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Thin provider clients. fetch is injectable so tests never hit paid APIs.
import {
  AIRSCALE_BASE, EXA_BASE, EXA_WEBSETS_BASE, PARALLEL_BASE,
  buildExaPeopleSearch, buildFindAllPeopleRun, buildParallelEntitySearch,
  buildParallelExtractV1, buildParallelSearchV1, buildWebsetPeopleSearch,
  icTitleRank, scoreRepoRelevance, MIN_REPO_RELEVANCE,
  type AirscaleEmailInput, type DeepSearchInput, type ExaSearchType, type FindAllGenerator,
} from "./requests.ts";
import {
  fromExaResult, fromHarmonicPerson, fromExaWebsetItem, fromGithubUser, fromParallelEntity,
  fromParallelFindAllCandidate, type UnifiedCandidate,
} from "./candidate.ts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ProviderError extends Error {
  constructor(public provider: string, public status: number, message: string) {
    super(`${provider} ${status}: ${message}`);
  }
}

async function json(provider: string, res: Response): Promise<any> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(provider, res.status, body.slice(0, 300));
  }
  return res.json();
}

function compact<T>(xs: (T | null)[]): T[] {
  return xs.filter((x): x is T => x !== null);
}

export async function exaPeopleSearch(apiKey: string, query: string, opts: { numResults?: number; type?: ExaSearchType } = {}, f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  const data = await json("exa", await f(`${EXA_BASE}/search`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildExaPeopleSearch(query, opts)),
  }));
  return compact((data.results || []).map((r: any, i: number) => fromExaResult(r, i + 1)));
}

export async function parallelEntitySearchPeople(apiKey: string, objective: string, matchLimit = 100, f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  const data = await json("parallel_entity", await f(`${PARALLEL_BASE}/v1beta/findall/entity-search`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildParallelEntitySearch(objective, matchLimit)),
  }));
  return compact((data.entities || []).map((e: any, i: number) => fromParallelEntity(e, i + 1)));
}

export interface ParallelSearchResult { url: string; title?: string; excerpts?: string[]; publish_date?: string | null }

export async function parallelSearchV1(apiKey: string, objective: string, queries: string[], maxResults = 10, f: FetchLike = fetch): Promise<ParallelSearchResult[]> {
  const data = await json("parallel_search", await f(`${PARALLEL_BASE}/v1/search`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildParallelSearchV1(objective, queries, maxResults)),
  }));
  return data.results || [];
}

export async function parallelExtractV1(apiKey: string, url: string, objective?: string, f: FetchLike = fetch): Promise<string | null> {
  const data = await json("parallel_extract", await f(`${PARALLEL_BASE}/v1/extract`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildParallelExtractV1(url, objective)),
  }));
  const r = (data.results || [])[0];
  if (!r) return null;
  const text = r.full_content || (Array.isArray(r.excerpts) ? r.excerpts.join("\n\n") : "");
  return typeof text === "string" && text.trim() ? text : null;
}

// ---------- Harmonic ----------

export interface HarmonicConfig { apiKey: string; baseUrl: string }

function hHeaders(cfg: HarmonicConfig, body = false): Record<string, string> {
  return { apikey: cfg.apiKey, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) };
}

/** Pull URNs out of Harmonic search/employee responses (strings or objects). */
export function extractUrns(data: any, kind: "company" | "person"): string[] {
  const list = Array.isArray(data) ? data : (data?.results ?? data?.urns ?? data?.companies ?? data?.people ?? []);
  const out: string[] = [];
  for (const it of list) {
    const v = typeof it === "string" ? it : (it?.[`${kind}_urn`] ?? it?.entity_urn ?? it?.urn ?? null);
    if (typeof v === "string" && (v.includes(`:${kind}:`) || !v.startsWith("urn:"))) out.push(v);
  }
  return [...new Set(out)];
}

export async function harmonicPersonsByUrns(cfg: HarmonicConfig, urns: string[], f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  if (!urns.length) return [];
  const data = await json("harmonic", await f(`${cfg.baseUrl}/persons/batchGet`, {
    method: "POST",
    headers: hHeaders(cfg, true),
    body: JSON.stringify({ urns: urns.slice(0, 100) }),
  }));
  const people = Array.isArray(data) ? data : (data.results || data.persons || []);
  return compact(people.map((p: any, i: number) => fromHarmonicPerson(p, i + 1)));
}

/** Name lookup: typeahead PERSON -> person URNs -> batchGet. */
export async function harmonicPeopleByName(cfg: HarmonicConfig, name: string, limit = 10, f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  const q = new URLSearchParams({ query: name, search_type: "PERSON" });
  const data = await json("harmonic", await f(`${cfg.baseUrl}/search/typeahead?${q}`, { headers: hHeaders(cfg) }));
  return harmonicPersonsByUrns(cfg, extractUrns(data, "person").slice(0, limit), f);
}

/** Person by LinkedIn URL (enrich endpoint; same call the existing harmonic-person function uses). */
export async function harmonicPersonByLinkedin(cfg: HarmonicConfig, linkedinUrl: string, f: FetchLike = fetch): Promise<UnifiedCandidate | null> {
  const q = new URLSearchParams({ linkedin_url: linkedinUrl });
  const data = await json("harmonic", await f(`${cfg.baseUrl}/persons?${q}`, { method: "POST", headers: hHeaders(cfg) }));
  const p = data?.person ?? data;
  return p && (p.full_name || p.name) ? fromHarmonicPerson(p, 1) : null;
}

/**
 * Company-first sourcing: search_agent (NL company search) -> top companies ->
 * /companies/{urn}/employees (active, group filter) -> /persons/batchGet.
 */
export async function harmonicCompanyFirstPeople(
  cfg: HarmonicConfig,
  companyQuery: string | string[],
  opts: { companies?: number; perCompany?: number; group?: string } = {},
  f: FetchLike = fetch,
): Promise<{ candidates: UnifiedCandidate[]; companyUrns: string[]; queryUsed: string | null; attempts: number }> {
  const nCompanies = Math.max(1, Math.min(10, opts.companies ?? 5));
  const perCompany = Math.max(1, Math.min(50, opts.perCompany ?? 10));
  const queries = (Array.isArray(companyQuery) ? companyQuery : [companyQuery]).filter(Boolean).slice(0, 3);
  let companyUrns: string[] = [];
  let queryUsed: string | null = null;
  let attempts = 0;
  for (const cq of queries) {
    attempts++;
    const q = new URLSearchParams({ query: cq, size: String(nCompanies) });
    const search = await json("harmonic", await f(`${cfg.baseUrl}/search/search_agent?${q}`, { headers: hHeaders(cfg) }));
    companyUrns = extractUrns(search, "company").slice(0, nCompanies);
    if (companyUrns.length) { queryUsed = cq; break; }
  }
  const group = opts.group ?? "ALL";
  const ic = group === "NON_LEADERSHIP";
  const fetchSize = ic ? Math.min(50, perCompany * 2) : perCompany; // over-fetch, then keep engineers
  const employees = async (urn: string, g: string) => {
    const eq = new URLSearchParams({ employee_group_type: g, employee_status: "ACTIVE", size: String(fetchSize), page: "0" });
    const data = await json("harmonic", await f(`${cfg.baseUrl}/companies/${encodeURIComponent(urn)}/employees?${eq}`, { headers: hHeaders(cfg) }));
    return extractUrns(data, "person");
  };
  const employeeLists = await Promise.allSettled(companyUrns.map(async (urn) => {
    const urns = await employees(urn, group);
    return urns.length || !ic ? urns : await employees(urn, "ALL"); // some companies lack group tags
  }));
  const personUrns = [...new Set(employeeLists.flatMap((r) => (r.status === "fulfilled" ? r.value : [])))];
  let candidates = await harmonicPersonsByUrns(cfg, personUrns, f);
  if (ic) {
    // IC queries: drop founders/execs/board/non-technical, engineers first, cap per company.
    candidates = candidates.filter((c) => icTitleRank(c.currentTitle) < 2)
      .sort((a, b) => icTitleRank(a.currentTitle) - icTitleRank(b.currentTitle));
    const perCo = new Map<string, number>();
    candidates = candidates.filter((c) => {
      const k = (c.currentCompany || "").toLowerCase();
      const n = (perCo.get(k) ?? 0) + 1;
      perCo.set(k, n);
      return n <= perCompany;
    });
  }
  return { candidates, companyUrns, queryUsed, attempts };
}

// ---------- Airscale (email enrichment) ----------

export interface AirscaleEmailResult { status: "success" | "not_found" | string; email: string | null; email_status?: string; provider?: string }

export async function airscaleFindEmail(apiKey: string, input: AirscaleEmailInput, f: FetchLike = fetch): Promise<AirscaleEmailResult> {
  const data = await json("airscale", await f(`${AIRSCALE_BASE}/email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
  const r = data?.response && typeof data.response === "object" && "email" in data.response ? data.response : data;
  return { status: r.status ?? data.status ?? "unknown", email: r.email ?? null, email_status: r.email_status, provider: r.provider };
}

export async function githubUserSearch(token: string | undefined, q: string, perPage = 20, f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "SourceKit" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const data = await json("github", await f(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=${perPage}`, { headers }));
  return compact((data.items || []).map((u: any, i: number) => fromGithubUser(u, i + 1)));
}

function ghHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "SourceKit" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * Keyword -> people via repositories: search repos by topic keywords, take the top repos'
 * top human contributors, then load their profiles. Free (GitHub token), ~1 + repos + users calls.
 */
export async function githubContributorSearch(
  token: string | undefined,
  repoQueries: string[],
  opts: { repos?: number; perRepo?: number; maxUsers?: number; keywords?: string[] } = {},
  f: FetchLike = fetch,
): Promise<{ candidates: UnifiedCandidate[]; repos: string[]; rejected?: string[] }> {
  const headers = ghHeaders(token);
  // Run each query, merge, then keep repos that actually match the query (not just a tag).
  const found = await Promise.allSettled(repoQueries.slice(0, 5).map(async (q) =>
    (await json("github", await f(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`, { headers }))).items || []));
  const byName = new Map<string, any>();
  for (const r of found) if (r.status === "fulfilled") for (const it of r.value) if (it?.full_name && !it.fork && !it.archived) byName.set(it.full_name, it);
  const keywords = opts.keywords?.length ? opts.keywords : repoQueries.map((q) => q.split(" in:")[0].trim());
  const scored = [...byName.values()].map((r) => ({ r, ...scoreRepoRelevance(r, keywords) }));
  const minRel = keywords.length >= 2 ? MIN_REPO_RELEVANCE : 0.5;
  const kept = scored.filter((x) => x.canonical || x.score >= minRel)
    .sort((a, b) => Number(b.canonical) - Number(a.canonical) || b.score - a.score || (b.r.stargazers_count || 0) - (a.r.stargazers_count || 0));
  const repos = kept.slice(0, opts.repos ?? 3).map((x) => x.r.full_name as string);
  const rejected = scored.filter((x) => !kept.includes(x)).sort((a, b) => (b.r.stargazers_count || 0) - (a.r.stargazers_count || 0)).slice(0, 5).map((x) => x.r.full_name as string);
  const perRepo = opts.perRepo ?? 10;
  const lists = await Promise.allSettled(repos.map(async (full) => {
    const data = await json("github", await f(`https://api.github.com/repos/${full}/contributors?per_page=${perRepo + 5}`, { headers }));
    return (Array.isArray(data) ? data : []).filter((u: any) => u?.type !== "Bot" && !/\[bot\]$|bot$/i.test(u?.login || "")).slice(0, perRepo).map((u: any) => u.login as string);
  }));
  // Interleave repos so the top contributors of each core repo come first.
  const per = lists.map((r) => (r.status === "fulfilled" ? r.value : []));
  const order: string[] = [];
  for (let i = 0; i < perRepo; i++) for (const l of per) if (l[i]) order.push(l[i]);
  const logins = [...new Set(order)].slice(0, opts.maxUsers ?? 25);
  const users = await Promise.allSettled(logins.map(async (l) => json("github", await f(`https://api.github.com/users/${encodeURIComponent(l)}`, { headers }))));
  const candidates = compact(users.map((r, i) => (r.status === "fulfilled" ? fromGithubUser(r.value, i + 1) : null)));
  return { candidates, repos, rejected };
}

const norm = (s: string | null | undefined) => (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const CO_STOP = new Set(["inc", "llc", "ltd", "corp", "corporation", "co", "the", "ai", "labs", "lab", "technologies", "technology", "group", "company", "gmbh", "web", "services", "platforms"]);
const LOC_STOP = new Set(["united", "states", "greater", "area", "bay", "metropolitan", "county", "the", "of", "and"]);

/** Distinctive company tokens: "Amazon Web Services" -> ["amazon"], "Meta Platforms" -> ["meta"]. */
export function companyTokens(company: string): string[] {
  return norm(company).split(" ").filter((t) => t.length >= 2 && !CO_STOP.has(t)).slice(0, 2);
}

function locTokens(loc: string | null | undefined): string[] {
  return norm(loc).split(" ").filter((t) => t.length >= 3 && !LOC_STOP.has(t));
}

/**
 * Find a GitHub handle for a named person at a known company (free). Looser but safe:
 * - accept when the company appears in the GitHub profile's company/bio/blog, or in a public org;
 * - otherwise accept only a single exact-name hit whose location matches;
 * - location (then followers) breaks ties between several company matches.
 */
export async function githubHandleByNameCompany(
  token: string | undefined,
  fullName: string,
  company: string,
  f: FetchLike = fetch,
  location?: string | null,
): Promise<{ login: string; followers: number | null; via: "company" | "org" | "location" } | null> {
  const name = fullName.replace(/[,(|].*$/, "").replace(/\b(ph\.?d|mba|md|msc|ms)\.?\b/gi, "").replace(/\s+/g, " ").trim();
  const parts = name.split(" ");
  if (parts.length < 2 || parts.some((p) => /^[A-Z]\.?$/.test(p))) return null; // "Sertan A." is too ambiguous
  const coToks = companyTokens(company);
  if (!coToks.length) return null;
  const headers = ghHeaders(token);
  const data = await json("github", await f(`https://api.github.com/search/users?q=${encodeURIComponent(`fullname:"${name}" type:user`)}&per_page=5`, { headers }));
  const items = (data.items || []).slice(0, 4);
  const total = data.total_count ?? items.length;
  if (!items.length || total > 10) return null;
  const wantLoc = locTokens(location);
  type M = { login: string; followers: number | null; via: "company" | "org" | "location"; loc: boolean };
  const matches: M[] = [];
  for (const it of items) {
    const u = await json("github", await f(`https://api.github.com/users/${encodeURIComponent(it.login)}`, { headers }));
    const hay = ` ${norm(`${u.company || ""} ${u.bio || ""} ${u.blog || ""}`)} `;
    const locOk = wantLoc.length > 0 && locTokens(u.location).some((t) => wantLoc.includes(t));
    const followers = typeof u.followers === "number" ? u.followers : null;
    if (coToks.some((t) => hay.includes(` ${t} `))) { matches.push({ login: u.login, followers, via: "company", loc: locOk }); continue; }
    const orgs = await json("github", await f(`https://api.github.com/users/${encodeURIComponent(it.login)}/orgs`, { headers })).catch(() => []);
    if (Array.isArray(orgs) && orgs.some((o: any) => coToks.some((t) => norm(o?.login).replace(/ /g, "").includes(t)))) { matches.push({ login: u.login, followers, via: "org", loc: locOk }); continue; }
    if (total === 1 && locOk && norm(u.name) === norm(name)) matches.push({ login: u.login, followers, via: "location", loc: true });
  }
  if (!matches.length) return null;
  matches.sort((a, b) => Number(b.loc) - Number(a.loc) || (b.followers ?? 0) - (a.followers ?? 0));
  const { login, followers, via } = matches[0];
  return { login, followers, via };
}

// ---------- Deep search (async) ----------

export async function findAllCreatePeopleRun(apiKey: string, input: DeepSearchInput, opts: { generator?: FindAllGenerator; matchLimit?: number; excludeUrls?: string[] } = {}, f: FetchLike = fetch): Promise<{ id: string; status: string }> {
  const data = await json("parallel_findall", await f(`${PARALLEL_BASE}/v1beta/findall/runs`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildFindAllPeopleRun(input, opts)),
  }));
  return { id: data.findall_id, status: data.status?.status ?? "queued" };
}

export async function findAllGetResult(apiKey: string, id: string, f: FetchLike = fetch): Promise<{ status: string; isActive: boolean; candidates: UnifiedCandidate[] }> {
  const data = await json("parallel_findall", await f(`${PARALLEL_BASE}/v1beta/findall/runs/${encodeURIComponent(id)}/result`, {
    headers: { "x-api-key": apiKey },
  }));
  const matched = (data.candidates || []).filter((c: any) => c.match_status === "matched");
  return {
    status: data.run?.status?.status ?? "unknown",
    isActive: !!data.run?.status?.is_active,
    candidates: compact(matched.map((c: any, i: number) => fromParallelFindAllCandidate(c, i + 1))),
  };
}

export async function websetCreatePeople(apiKey: string, input: DeepSearchInput, count = 25, maxPeoplePerCompany?: number, f: FetchLike = fetch): Promise<{ id: string; status: string }> {
  const data = await json("exa_webset", await f(`${EXA_WEBSETS_BASE}/websets`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(buildWebsetPeopleSearch(input, count, maxPeoplePerCompany)),
  }));
  return { id: data.id, status: data.status ?? "running" };
}

export async function websetGetPeople(apiKey: string, id: string, f: FetchLike = fetch): Promise<{ status: string; isActive: boolean; candidates: UnifiedCandidate[] }> {
  const ws = await json("exa_webset", await f(`${EXA_WEBSETS_BASE}/websets/${encodeURIComponent(id)}`, { headers: { "x-api-key": apiKey } }));
  const items = await json("exa_webset", await f(`${EXA_WEBSETS_BASE}/websets/${encodeURIComponent(id)}/items?limit=100`, { headers: { "x-api-key": apiKey } }));
  return {
    status: ws.status ?? "unknown",
    isActive: ws.status === "running" || ws.status === "pending",
    candidates: compact((items.data || []).map((it: any, i: number) => fromExaWebsetItem(it, i + 1))),
  };
}
