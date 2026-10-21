import { describe, it, expect, vi } from "vitest";
import { toExa3Body, buildQueryVariants, createTtlCache, exaPost, exaSearchVariants } from "../providers/exa3.ts";

const mk = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

describe("toExa3Body", () => {
  it("maps retired options to 3.0", () => {
    const out = toExa3Body({ query: "q", type: "neural", useAutoprompt: true, category: "person", livecrawl: "always", contents: { highlights: { numSentences: 3 }, livecrawl: "fallback" } });
    expect(out).toEqual({ query: "q", type: "auto", category: "people", maxAgeHours: 0, contents: { highlights: { maxCharacters: 480 } } });
  });
  it("drops retired categories and keeps allowed ones", () => {
    for (const c of ["linkedin profile", "research paper", "pdf", "github", "tweet"]) expect(toExa3Body({ query: "q", category: c })).not.toHaveProperty("category");
    for (const c of ["people", "company", "publication"]) expect(toExa3Body({ query: "q", category: c }).category).toBe(c);
  });
  it("highlights true becomes maxCharacters", () => {
    expect(toExa3Body({ query: "q", contents: { highlights: true } }).contents).toEqual({ highlights: { maxCharacters: 500 } });
  });
});

describe("variants + cache", () => {
  it("builds distinct capped variants", () => {
    const v = buildQueryVariants("AI product builder", { titles: ["founding PM"], skills: ["LLM agents"], max: 4 });
    expect(v.length).toBe(4); expect(new Set(v).size).toBe(4); expect(v[0]).toBe("AI product builder");
  });
  it("ttl cache expires", () => {
    let t = 0; const c = createTtlCache<number>(10, 2, () => t);
    c.set("a", 1); expect(c.get("a")).toBe(1); t = 11; expect(c.get("a")).toBeUndefined();
  });
  it("exaPost caches identical requests", async () => {
    const f = mk({ results: [] }); const cache = createTtlCache<unknown>();
    await exaPost("k", "/search", { query: "q", type: "neural" }, { fetchImpl: f as any, cache });
    await exaPost("k", "/search", { query: "q", type: "auto" }, { fetchImpl: f as any, cache });
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).type).toBe("auto");
  });
  it("runs variants in parallel and dedupes by url", async () => {
    const f = mk({ results: [{ url: "https://www.linkedin.com/in/a/" }, { url: "https://linkedin.com/in/b" }] });
    const out = await exaSearchVariants("k", ["q1", "q2", "q3"], { category: "people" }, { fetchImpl: f as any, cache: null });
    expect(f).toHaveBeenCalledTimes(3); expect(out.results.length).toBe(2); expect(out.errors).toEqual([]);
  });
});
