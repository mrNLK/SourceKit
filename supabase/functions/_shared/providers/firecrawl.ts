/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Firecrawl candidate source (Developer Index + Research Index) and personal-site scrape evidence.
// Pure + fetch-injectable (no Deno imports) so it is unit-tested without hitting the paid API.
import type { UnifiedCandidate } from "./candidate.ts";
import type { EnvGetter } from "./flags.ts";

export const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Tight per-search budget: keeps Firecrawl credits and latency low. */
export const FIRECRAWL_LIMITS = {
  devResults: 8,        // /search/developer k (2 credits per 10 results)
  githubLookups: 8,     // free GitHub issue/PR author lookups
  paperResults: 5,      // /search/research/papers k
  paperDetails: 3,      // papers whose author list we fetch
  authorsPerPaper: 3,
  maxCandidates: 15,
  scrapes: 3,           // personal-site scrapes per search
  timeoutMs: 8000,
  evidenceChars: 600,
} as const;

export function isFirecrawlEnabled(getEnv: EnvGetter): boolean {
  if (!(getEnv("FIRECRAWL_API_KEY") || "").trim()) return false;
  return ["1", "true", "yes", "on"].includes((getEnv("FIRECRAWL_ENABLED") || "").trim().toLowerCase());
}

function timeoutSignal(ms: number): AbortSignal {
  const A = AbortSignal as any;
  if (typeof A.timeout === "function") return A.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function fc(fetchFn: FetchLike, apiKey: string, path: string, init: RequestInit = {}, timeoutMs: number = FIRECRAWL_LIMITS.timeoutMs): Promise<any> {
  const res = await fetchFn(`${FIRECRAWL_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: timeoutSignal(timeoutMs),
  });
  if (!res.ok) throw new Error(`firecrawl ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return res.json();
}

/** Parse Developer Index ids: issue:owner/repo#12, pull_request:owner/repo#34, readme:owner/repo. */
export function parseDevId(id: string): { type: "issue" | "pull_request" | "readme"; owner: string; repo: string; number?: number } | null {
  const m = String(id || "").match(/^(issue|pull_request|readme):([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+?)(?:#(\d+))?$/);
  if (!m) return null;
  return { type: m[1] as any, owner: m[2], repo: m[3], number: m[4] ? Number(m[4]) : undefined };
}

export function splitAuthors(authors: unknown, max: number = FIRECRAWL_LIMITS.authorsPerPaper): string[] {
  if (typeof authors !== "string") return [];
  return authors.split(/,|\band\b/).map((a) => a.trim()).filter((a) => a.length > 2 && a.length < 80 && /\s/.test(a)).slice(0, max);
}

const isBotLogin = (l: string) => /\[bot\]$|-bot$|^dependabot|^renovate|^github-actions/i.test(l);

export interface GithubLookup {
  /** Returns the author login of an issue/PR, or null. */
  issueAuthor: (owner: string, repo: string, n: number) => Promise<string | null>;
}

export async function firecrawlDiscover(
  apiKey: string,
  query: string,
  gh: GithubLookup,
  opts: { fetch?: FetchLike; limits?: Partial<typeof FIRECRAWL_LIMITS> } = {},
): Promise<{ candidates: UnifiedCandidate[]; detail: Record<string, unknown> }> {
  const f = opts.fetch ?? fetch;
  const L = { ...FIRECRAWL_LIMITS, ...(opts.limits || {}) };
  const q = query.trim().slice(0, 300);
  const out: UnifiedCandidate[] = [];
  const detail: Record<string, unknown> = {};

  const dev = (async () => {
    const p = new URLSearchParams({ query: q, k: String(L.devResults), passages: "1" });
    for (const t of ["pull_request", "issue", "readme"]) p.append("types", t);
    const data = await fc(f, apiKey, `/search/developer?${p}`);
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const seen = new Map<string, { url: string; title: string; rank: number }>();
    const lookups: Promise<void>[] = [];
    let used = 0;
    results.forEach((r, rank) => {
      const id = parseDevId(r?.id);
      if (!id) return;
      const title = String(r?.title || `${id.owner}/${id.repo}`).slice(0, 160);
      if (id.type === "readme") {
        if (!seen.has(id.owner.toLowerCase())) seen.set(id.owner.toLowerCase(), { url: r.url, title: `README: ${id.owner}/${id.repo}`, rank });
        return;
      }
      if (used >= L.githubLookups || !id.number) return;
      used++;
      lookups.push(gh.issueAuthor(id.owner, id.repo, id.number).then((login) => {
        if (login && !seen.has(login.toLowerCase())) seen.set(login.toLowerCase(), { url: r.url, title: `${id.type === "pull_request" ? "PR" : "Issue"} in ${id.owner}/${id.repo}: ${title}`, rank });
      }).catch(() => {}));
    });
    await Promise.allSettled(lookups);
    for (const [login, hit] of seen) {
      if (isBotLogin(login)) continue;
      out.push({
        fullName: login, githubLogin: login, emails: [], headline: hit.title,
        profileUrls: [`https://github.com/${login}`, hit.url].filter(Boolean),
        sources: [{ provider: "firecrawl", url: hit.url, rank: hit.rank + 1, snippet: hit.title, externalId: `gh:${login}` }],
      });
    }
    detail.developer_results = results.length;
  })();

  const papers = (async () => {
    const p = new URLSearchParams({ query: q, k: String(L.paperResults) });
    const data = await fc(f, apiKey, `/search/research/papers?${p}`);
    const results: any[] = (Array.isArray(data?.results) ? data.results : []).filter((r: any) => r?.paperId && !String(r.paperId).startsWith("web:"));
    const top = results.slice(0, L.paperDetails);
    const metas = await Promise.allSettled(top.map((r) => fc(f, apiKey, `/search/research/papers/${encodeURIComponent(r.primaryId || r.paperId)}`)));
    metas.forEach((m, i) => {
      if (m.status !== "fulfilled") return;
      const paper = m.value?.paper ?? m.value?.data ?? m.value;
      const title = String(paper?.title || top[i].title || "").slice(0, 160);
      const pid = String(top[i].primaryId || "");
      const url = pid.startsWith("arxiv:") ? `https://arxiv.org/abs/${pid.slice(6)}` : pid.startsWith("doi:") ? `https://doi.org/${pid.slice(4)}` : null;
      for (const name of splitAuthors(paper?.authors)) {
        out.push({
          fullName: name, emails: [], headline: `Author: ${title}`, profileUrls: url ? [url] : [],
          sources: [{ provider: "firecrawl", url, rank: i + 1, snippet: `Paper: ${title}`, externalId: pid || null }],
        });
      }
    });
    detail.paper_results = results.length;
  })();

  const settled = await Promise.allSettled([dev, papers]);
  const errors = settled.filter((s) => s.status === "rejected").map((s: any) => String(s.reason?.message || s.reason).slice(0, 120));
  if (errors.length) detail.errors = errors;
  if (errors.length === 2) throw new Error(errors.join("; "));
  return { candidates: out.slice(0, L.maxCandidates), detail };
}

/** A personal site / blog worth scraping (not a social or code host). */
export function isPersonalSiteUrl(url: unknown): url is string {
  if (typeof url !== "string" || !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url.trim())) return false;
  return !/(github\.com|linkedin\.com|twitter\.com|x\.com|arxiv\.org|doi\.org|facebook\.com|instagram\.com|youtube\.com|medium\.com\/?$)/i.test(url);
}

/** Scrape a personal site via /scrape; returns a short plain-text evidence snippet, or null (fail soft). */
export async function firecrawlScrapeEvidence(apiKey: string, url: string, opts: { fetch?: FetchLike; chars?: number } = {}): Promise<string | null> {
  try {
    const data = await fc(opts.fetch ?? fetch, apiKey, "/scrape", {
      method: "POST",
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: FIRECRAWL_LIMITS.timeoutMs - 1000, maxAge: 7 * 24 * 3600 * 1000, blockAds: true }),
    });
    const md = String(data?.data?.markdown || "");
    const text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|-]+/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.slice(0, opts.chars ?? FIRECRAWL_LIMITS.evidenceChars) : null;
  } catch {
    return null;
  }
}

/** Small scoring bump when scraped evidence mentions the search keywords (max +6). */
export function evidenceBoost(evidence: string | null, keywords: string[]): number {
  if (!evidence) return 0;
  const t = evidence.toLowerCase();
  const hits = [...new Set(keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 2))].filter((k) => t.includes(k)).length;
  return Math.min(6, hits * 2);
}
