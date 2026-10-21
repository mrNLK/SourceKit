// Exa 3.0 request options, parallel query variants, and a small TTL cache.
// Rules: categories limited to people | company | publication; retired categories
// (linkedin profile, research paper, pdf, github, tweet, person) are dropped or mapped;
// livecrawl -> maxAgeHours; highlights.numSentences -> highlights.maxCharacters;
// useAutoprompt and type "neural"/"keyword" are retired (mapped to "auto").

export const EXA_ALLOWED_CATEGORIES = ["people", "company", "publication"] as const;
export type ExaCategory = (typeof EXA_ALLOWED_CATEGORIES)[number];

const CATEGORY_MAP: Record<string, ExaCategory | null> = {
  people: "people", person: "people", company: "company", publication: "publication", news: "publication",
  "linkedin profile": null, "research paper": null, pdf: null, github: null, tweet: null,
};
const LIVECRAWL_TO_MAX_AGE: Record<string, number> = { always: 0, preferred: 0, fallback: 24 * 7, never: -1, auto: 24 };
const CHARS_PER_SENTENCE = 160;

type Json = Record<string, unknown>;

function normalizeHighlights(h: unknown): unknown {
  if (h === true) return { maxCharacters: 500 };
  if (!h || typeof h !== "object") return h;
  const { numSentences, highlightsPerUrl: _hpu, ...rest } = h as Json;
  const out: Json = { ...rest };
  if (out.maxCharacters == null && typeof numSentences === "number") out.maxCharacters = Math.max(1, numSentences) * CHARS_PER_SENTENCE;
  if (out.maxCharacters == null) out.maxCharacters = 500;
  return out;
}

/** Rewrite any /search or /contents body to Exa 3.0 options. Pure; never mutates input. */
export function toExa3Body<T extends Json>(body: T): Json {
  const out: Json = { ...body };
  delete out.useAutoprompt;
  if (out.type === "neural" || out.type === "keyword" || out.type === "magic") out.type = "auto";
  if ("category" in out) {
    const mapped = CATEGORY_MAP[String(out.category ?? "").toLowerCase()];
    if (mapped) out.category = mapped; else delete out.category;
  }
  const lift = (src: Json) => {
    if ("livecrawl" in src) {
      const v = LIVECRAWL_TO_MAX_AGE[String(src.livecrawl)];
      delete src.livecrawl;
      if (v !== undefined && out.maxAgeHours == null) out.maxAgeHours = v;
    }
    delete src.livecrawlTimeout;
  };
  lift(out);
  if (out.contents && typeof out.contents === "object") {
    const c: Json = { ...(out.contents as Json) };
    lift(c);
    if ("highlights" in c) c.highlights = normalizeHighlights(c.highlights);
    out.contents = c;
  }
  if ("highlights" in out) out.highlights = normalizeHighlights(out.highlights);
  return out;
}

/** Turn a role or query into distinct variants (title, skill, signal, and seniority angles). */
export function buildQueryVariants(base: string, opts: { titles?: string[]; skills?: string[]; signals?: string[]; locations?: string[]; max?: number } = {}): string[] {
  const b = base.trim();
  const v = new Set<string>(b ? [b] : []);
  for (const t of opts.titles ?? []) v.add(`${t} ${b}`.trim());
  for (const s of opts.skills ?? []) v.add(`${b} with hands-on ${s} experience`.trim());
  for (const s of opts.signals ?? []) v.add(`${b} who ${s}`.trim());
  for (const l of opts.locations ?? []) v.add(`${b} based in ${l}`.trim());
  if (b) { v.add(`former founder ${b}`); v.add(`${b} who shipped a product from zero to one`); }
  return [...v].filter(Boolean).slice(0, Math.max(1, opts.max ?? 20));
}

export interface TtlCache<V> { get(k: string): V | undefined; set(k: string, v: V): void; size(): number }
export function createTtlCache<V>(ttlMs = 15 * 60_000, maxEntries = 500, now: () => number = Date.now): TtlCache<V> {
  const m = new Map<string, { v: V; at: number }>();
  return {
    get(k) { const e = m.get(k); if (!e) return undefined; if (now() - e.at > ttlMs) { m.delete(k); return undefined; } return e.v; },
    set(k, v) { if (m.size >= maxEntries) m.delete(m.keys().next().value as string); m.set(k, { v, at: now() }); },
    size: () => m.size,
  };
}

const sharedCache = createTtlCache<unknown>();
export function cacheKey(path: string, body: Json): string { return path + "|" + JSON.stringify(body, Object.keys(body).sort()); }

/** POST to Exa with 3.0 body normalization and caching. */
export async function exaPost<R = any>(apiKey: string, path: string, body: Json, opts: { fetchImpl?: typeof fetch; cache?: TtlCache<unknown> | null; base?: string } = {}): Promise<R> {
  const f = opts.fetchImpl ?? fetch;
  const cache = opts.cache === undefined ? sharedCache : opts.cache;
  const b = toExa3Body(body);
  const key = cacheKey(path, b);
  const hit = cache?.get(key);
  if (hit !== undefined) return hit as R;
  const res = await f(`${opts.base ?? "https://api.exa.ai"}${path}`, { method: "POST", headers: { "x-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(b) });
  if (!res.ok) throw new Error(`Exa ${path} ${res.status}`);
  const data = await res.json();
  cache?.set(key, data);
  return data as R;
}

/** Run query variants in parallel (bounded concurrency), merge, and dedupe by URL. */
export async function exaSearchVariants(apiKey: string, variants: string[], base: Json, opts: { concurrency?: number; fetchImpl?: typeof fetch; cache?: TtlCache<unknown> | null } = {}) {
  const conc = Math.max(1, Math.min(opts.concurrency ?? 5, 10));
  const results: any[] = []; const seen = new Set<string>(); const errors: string[] = [];
  for (let i = 0; i < variants.length; i += conc) {
    const batch = variants.slice(i, i + conc);
    const settled = await Promise.allSettled(batch.map((q) => exaPost(apiKey, "/search", { ...base, query: q }, opts)));
    settled.forEach((s, k) => {
      if (s.status === "rejected") { errors.push(`${batch[k]}: ${String(s.reason)}`); return; }
      for (const r of (s.value as any)?.results ?? []) {
        const u = String(r.url ?? "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        if (!u || seen.has(u)) continue; seen.add(u); results.push({ ...r, searchQuery: batch[k] });
      }
    });
  }
  return { results, errors };
}
