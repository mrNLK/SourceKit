/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Thin provider clients. fetch is injectable so tests never hit paid APIs.
import {
  APOLLO_BASE, EXA_BASE, EXA_WEBSETS_BASE, PARALLEL_BASE,
  buildApolloSearchUrl, buildExaPeopleSearch, buildFindAllPeopleRun, buildParallelEntitySearch,
  buildParallelExtractV1, buildParallelSearchV1, buildWebsetPeopleSearch,
  type CandidateFilters, type DeepSearchInput, type ExaSearchType, type FindAllGenerator,
} from "./requests.ts";
import {
  fromApolloPerson, fromExaResult, fromExaWebsetItem, fromGithubUser, fromParallelEntity,
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

export async function apolloPeopleSearch(apiKey: string, filters: CandidateFilters, page = 1, perPage = 25, f: FetchLike = fetch): Promise<{ candidates: UnifiedCandidate[]; total: number | null }> {
  const data = await json("apollo", await f(buildApolloSearchUrl(filters, page, perPage), {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "Cache-Control": "no-cache" },
  }));
  const people = data.people || data.contacts || [];
  return {
    candidates: compact(people.map((p: any, i: number) => fromApolloPerson(p, i + 1))),
    total: typeof data.total_entries === "number" ? data.total_entries : (data.pagination?.total_entries ?? null),
  };
}

/** Apollo bulk enrichment (costs credits; 10 per call). Not used by default sourcing. */
export async function apolloBulkMatch(apiKey: string, ids: string[], f: FetchLike = fetch): Promise<UnifiedCandidate[]> {
  const data = await json("apollo", await f(`${APOLLO_BASE}/people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ details: ids.slice(0, 10).map((id) => ({ id })) }),
  }));
  return compact((data.matches || []).map((p: any, i: number) => (p ? fromApolloPerson(p, i + 1) : null)));
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
