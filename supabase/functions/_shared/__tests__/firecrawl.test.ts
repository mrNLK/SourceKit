import { describe, it, expect, vi } from "vitest";
import {
  evidenceBoost, firecrawlDiscover, firecrawlScrapeEvidence, isFirecrawlEnabled, isPersonalSiteUrl, parseDevId, splitAuthors,
} from "../providers/firecrawl.ts";
import { dedupCandidates } from "../providers/dedup.ts";

const env = (m: Record<string, string>) => (k: string) => m[k];
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe("firecrawl flags + parsing", () => {
  it("requires key AND FIRECRAWL_ENABLED", () => {
    expect(isFirecrawlEnabled(env({ FIRECRAWL_API_KEY: "fc-x" }))).toBe(false);
    expect(isFirecrawlEnabled(env({ FIRECRAWL_ENABLED: "true" }))).toBe(false);
    expect(isFirecrawlEnabled(env({ FIRECRAWL_API_KEY: "fc-x", FIRECRAWL_ENABLED: "true" }))).toBe(true);
  });
  it("parses developer ids and author lists", () => {
    expect(parseDevId("pull_request:vllm-project/vllm#123")).toEqual({ type: "pull_request", owner: "vllm-project", repo: "vllm", number: 123 });
    expect(parseDevId("readme:ray-project/ray")?.type).toBe("readme");
    expect(parseDevId("doc:some-site")).toBeNull();
    expect(splitAuthors("Prafulla Dhariwal, Alexander Nichol, X, Jane Q Public, Fourth Person")).toEqual(["Prafulla Dhariwal", "Alexander Nichol", "Jane Q Public"]);
  });
  it("detects personal sites and scores evidence", () => {
    expect(isPersonalSiteUrl("https://jane.dev")).toBe(true);
    expect(isPersonalSiteUrl("https://github.com/jane")).toBe(false);
    expect(evidenceBoost("I build CUDA kernels and Ray schedulers", ["cuda", "ray", "rust"])).toBe(4);
    expect(evidenceBoost(null, ["cuda"])).toBe(0);
  });
});

describe("firecrawlDiscover", () => {
  it("maps PR authors, README owners and paper authors to candidates, with bot filtering and caps", async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes("/search/developer")) return json({ success: true, results: [
        { id: "pull_request:vllm-project/vllm#1", url: "https://github.com/vllm-project/vllm/pull/1", title: "Paged attention" },
        { id: "issue:ray-project/ray#2", url: "https://github.com/ray-project/ray/issues/2", title: "GPU sched" },
        { id: "readme:janedoe/kernels", url: "https://github.com/janedoe/kernels" },
        { id: "doc:x", url: "https://x.dev" },
      ] });
      if (/\/search\/research\/papers\?/.test(url)) return json({ success: true, results: [{ paperId: "1", primaryId: "arxiv:2105.05233", title: "P", abstract: "a", score: 1 }] });
      if (url.includes("/search/research/papers/")) return json({ success: true, paper: { title: "Diffusion", authors: "Prafulla Dhariwal, Alexander Nichol" } });
      return json({}, 404);
    });
    const issueAuthor = vi.fn(async (_o: string, repo: string) => (repo === "vllm" ? "woosuk" : "dependabot[bot]"));
    const r = await firecrawlDiscover("fc-x", "llm inference", { issueAuthor }, { fetch: fetchFn as any });
    const names = r.candidates.map((c) => c.fullName).sort();
    expect(names).toEqual(["Alexander Nichol", "Prafulla Dhariwal", "janedoe", "woosuk"]);
    expect(r.candidates.every((c) => c.sources[0].provider === "firecrawl")).toBe(true);
    expect(r.candidates.find((c) => c.fullName === "woosuk")?.githubLogin).toBe("woosuk");
    expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer fc-x" });
  });
  it("fails soft when one index errors and dedups against GitHub results", async () => {
    const fetchFn = vi.fn(async (url: string) => url.includes("/search/developer")
      ? json({ results: [{ id: "pull_request:a/b#1", url: "u" }] })
      : json({ error: "down" }, 500));
    const r = await firecrawlDiscover("k", "q", { issueAuthor: async () => "Alice" }, { fetch: fetchFn as any });
    expect(r.candidates).toHaveLength(1);
    expect((r.detail.errors as string[])[0]).toMatch(/firecrawl 500/);
    const merged = dedupCandidates([{ fullName: "Alice", githubLogin: "alice", emails: [], profileUrls: [], sources: [{ provider: "github" }] }, ...r.candidates]);
    expect(merged).toHaveLength(1);
  });
  it("throws only when both indexes fail", async () => {
    const fetchFn = vi.fn(async () => json({}, 500));
    await expect(firecrawlDiscover("k", "q", { issueAuthor: async () => null }, { fetch: fetchFn as any })).rejects.toThrow();
  });
});

describe("firecrawlScrapeEvidence", () => {
  it("returns cleaned text, null on failure", async () => {
    const ok = vi.fn(async () => json({ success: true, data: { markdown: "# Jane\n\nI work on [Ray](https://ray.io) **CUDA**" } }));
    expect(await firecrawlScrapeEvidence("k", "https://jane.dev", { fetch: ok as any })).toBe("Jane I work on Ray CUDA");
    const bad = vi.fn(async () => json({}, 402));
    expect(await firecrawlScrapeEvidence("k", "https://jane.dev", { fetch: bad as any })).toBeNull();
  });
});
