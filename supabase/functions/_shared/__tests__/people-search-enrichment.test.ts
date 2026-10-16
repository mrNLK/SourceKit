import { describe, it, expect, vi } from "vitest";
import { extractSearchTerms, buildHarmonicCompanyQueries, buildGithubRepoQueries } from "../providers/requests.ts";
import { fromExaResult, parseHeadlineText, fromGithubUser } from "../providers/candidate.ts";
import { harmonicCompanyFirstPeople, githubContributorSearch, githubHandleByNameCompany } from "../providers/clients.ts";
import { classifyPerson } from "../talent-flags.ts";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("keyword extraction for long queries", () => {
  it("strips seniority/role/filler words", () => {
    expect(extractSearchTerms("senior ML infrastructure engineer, PyTorch, distributed training").keywords)
      .toEqual(["ML infrastructure", "PyTorch", "distributed training"]);
    expect(extractSearchTerms("Staff backend engineers with Rust experience").keywords).toEqual(["backend", "Rust"]);
  });
  it("builds short Harmonic company queries (no 'companies building <whole sentence>')", () => {
    const qs = buildHarmonicCompanyQueries("senior ML infrastructure engineer, PyTorch, distributed training");
    expect(qs[0]).toBe("ML infrastructure PyTorch distributed training");
    expect(qs).toContain("ML infrastructure PyTorch");
    expect(qs.every((q) => !/senior|engineer|companies building/i.test(q))).toBe(true);
    expect(buildHarmonicCompanyQueries("x", { companies: ["Acme"] })).toEqual(["Acme"]);
  });
  it("builds GitHub repo queries", () => {
    expect(buildGithubRepoQueries("CUDA kernel developer", {}, new Date("2026-10-16T00:00:00Z")))
      .toEqual(["CUDA kernel in:name,description,topics stars:>=500 pushed:>=2025-10-16"]);
    expect(buildGithubRepoQueries("senior ML infrastructure engineer, PyTorch, distributed training")).toHaveLength(3); // one per keyword
  });
});

describe("Exa people result mapping", () => {
  it("uses the structured person entity (current role, company, location)", () => {
    const c = fromExaResult({
      title: "Jane Doe", url: "https://www.linkedin.com/in/janedoe",
      entities: [{ type: "person", properties: { name: "Jane Doe", location: "San Francisco, CA", workHistory: [
        { title: "ML Engineer", company: { name: "OldCo" }, dates: { from: "2018", to: "2021" } },
        { title: "Staff ML Infrastructure Engineer", company: { name: "Acme AI" }, dates: { from: "2021", to: null } },
      ] } }],
    }, 1)!;
    expect(c.currentTitle).toBe("Staff ML Infrastructure Engineer");
    expect(c.currentCompany).toBe("Acme AI");
    expect(c.location).toBe("San Francisco, CA");
    expect(c.headline).toBe("Staff ML Infrastructure Engineer at Acme AI");
  });
  it("falls back to highlight text and picks up a GitHub handle", () => {
    const c = fromExaResult({ title: "Bob Roe", url: "https://linkedin.com/in/bobroe", highlights: ["Co-founder & CTO at Stealth | builds PyTorch tooling, code at github.com/bobroe"] }, 2)!;
    expect(c.currentTitle).toMatch(/CTO/);
    expect(c.currentCompany).toBe("Stealth");
    expect(c.githubLogin).toBe("bobroe");
    expect(classifyPerson({ currentTitle: c.currentTitle, headline: c.headline }).ungettable).toBe(true);
  });
  it("ignores github repo links when finding a handle", () => {
    const c = fromExaResult({ title: "Ann Lee", url: "https://linkedin.com/in/annlee", highlights: ["contributor to github.com/pytorch/pytorch"] }, 3)!;
    expect(c.githubLogin).toBeNull();
  });
  it("parseHeadlineText", () => {
    expect(parseHeadlineText("Senior Software Engineer at Meta | PyTorch. Location: Seattle, Washington")).toEqual({ title: "Senior Software Engineer", company: "Meta", location: "Seattle, Washington" });
  });
  it("GitHub users carry their bio as headline (so exec bios are flagged)", () => {
    expect(fromGithubUser({ login: "x", id: 1, bio: "CEO @ Foo" }, 1)!.headline).toBe("CEO @ Foo");
  });
});

describe("Harmonic company-first fallback", () => {
  it("retries shorter queries until search_agent returns companies", async () => {
    const seen: string[] = [];
    const f = vi.fn(async (url: string) => {
      if (url.includes("/search/search_agent")) {
        const q = new URL(url).searchParams.get("query")!;
        seen.push(q);
        return ok(q === "ML infrastructure PyTorch" ? { count: 1, results: [{ urn: "urn:harmonic:company:1" }] } : { count: 0, results: [] });
      }
      if (url.includes("/employees")) return ok({ results: ["urn:harmonic:person:9"] });
      return ok([{ entity_urn: "urn:harmonic:person:9", full_name: "Pat Q", experience: [{ title: "Engineer", company_name: "Co", is_current_position: true }] }]);
    });
    const r = await harmonicCompanyFirstPeople({ apiKey: "k", baseUrl: "https://h" }, buildHarmonicCompanyQueries("senior ML infrastructure engineer, PyTorch, distributed training"), {}, f as never);
    expect(seen.slice(0, 2)).toEqual(["ML infrastructure PyTorch distributed training", "ML infrastructure PyTorch"]);
    expect(r.queryUsed).toBe("ML infrastructure PyTorch");
    expect(r.candidates.map((c) => c.fullName)).toEqual(["Pat Q"]);
  });
});

describe("GitHub sources", () => {
  it("contributor search: repos -> human contributors -> profiles", async () => {
    const f = vi.fn(async (url: string) => {
      if (url.includes("/search/repositories")) return ok({ items: [{ full_name: "org/repo" }] });
      if (url.includes("/contributors")) return ok([{ login: "alice", type: "User" }, { login: "pytorchmergebot", type: "User" }, { login: "dependabot[bot]", type: "Bot" }]);
      return ok({ login: "alice", id: 1, name: "Alice A", bio: "infra", followers: 50, html_url: "https://github.com/alice" });
    });
    const r = await githubContributorSearch("t", ["distributed training in:name,description,topics"], {}, f as never);
    expect(r.repos).toEqual(["org/repo"]);
    expect(r.candidates.map((c) => c.githubLogin)).toEqual(["alice"]);
  });
  it("name+company lookup requires the company to appear on the GitHub profile", async () => {
    const mk = (company: string) => vi.fn(async (url: string) => url.includes("/search/users")
      ? ok({ total_count: 1, items: [{ login: "jdoe" }] })
      : ok({ login: "jdoe", company, followers: 12 }));
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme AI", mk("@acme") as never)).toEqual({ login: "jdoe", followers: 12, via: "company" });
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme AI", mk("Globex") as never)).toBeNull();
    expect(await githubHandleByNameCompany("t", "Jane", "Acme", mk("@acme") as never)).toBeNull(); // single name: too ambiguous
  });
});
