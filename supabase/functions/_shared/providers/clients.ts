/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Thin provider clients. fetch is injectable so tests never hit paid APIs.
import {
  AIRSCALE_BASE, EXA_BASE, EXA_WEBSETS_BASE, PARALLEL_BASE,
  buildExaPeopleSearch, buildFindAllPeopleRun, buildParallelEntitySearch,
  buildParallelExtractV1, buildParallelSearchV1, buildWebsetPeopleSearch,
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
  companyQuery: string,
  opts: { companies?: number; perCompany?: number; group?: string } = {},
  f: FetchLike = fetch,
): Promise<{ candidates: UnifiedCandidate[]; companyUrns: string[] }> {
  const nCompanies = Math.max(1, Math.min(10, opts.companies ?? 5));
  const perCompany = Math.max(1, Math.min(50, opts.perCompany ?? 10));
  const q = new URLSearchParams({ query: companyQuery, size: String(nCompanies) });
  const search = await json("harmonic", await f(`${cfg.baseUrl}/search/search_agent?${q}`, { headers: hHeaders(cfg) }));
  const companyUrns = extractUrns(search, "company").slice(0, nCompanies);
  const employeeLists = await Promise.allSettled(companyUrns.map(async (urn) => {
    const eq = new URLSearchParams({ employee_group_type: opts.group ?? "ALL", employee_status: "ACTIVE", size: String(perCompany), page: "0" });
    const data = await json("harmonic", await f(`${cfg.baseUrl}/companies/${encodeURIComponent(urn)}/employees?${eq}`, { headers: hHeaders(cfg) }));
    return extractUrns(data, "person").slice(0, perCompany);
  }));
  const personUrns = [...new Set(employeeLists.flatMap((r) => (r.status === "fulfilled" ? r.value : [])))];
  return { candidates: await harmonicPersonsByUrns(cfg, personUrns, f), companyUrns };
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
