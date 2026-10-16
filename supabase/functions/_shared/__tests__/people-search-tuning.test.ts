import { describe, it, expect, vi } from "vitest";
import { harmonicEmployeeGroup, icTitleRank } from "../providers/requests.ts";
import { harmonicCompanyFirstPeople, githubContributorSearch, githubHandleByNameCompany, companyTokens } from "../providers/clients.ts";
import { classifyPerson, currentExecTitle } from "../talent-flags.ts";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("Harmonic: IC queries pull engineering staff, not founders/execs", () => {
  it("IC queries use NON_LEADERSHIP; leadership queries unchanged", () => {
    expect(harmonicEmployeeGroup({}, "senior ML infrastructure engineer, PyTorch")).toBe("NON_LEADERSHIP");
    expect(harmonicEmployeeGroup({}, "founding engineer")).toBe("NON_LEADERSHIP");
    expect(harmonicEmployeeGroup({}, "startup CTO")).toBe("LEADERSHIP");
    expect(harmonicEmployeeGroup({}, "seed-stage founders")).toBe("FOUNDERS_AND_CEO");
  });
  it("icTitleRank", () => {
    expect(icTitleRank("Senior Software Engineer")).toBe(0);
    expect(icTitleRank("Member of Technical Staff")).toBe(0);
    expect(icTitleRank("Co-Founder & CTO")).toBe(2);
    expect(icTitleRank("Board Member")).toBe(2);
    expect(icTitleRank("Recruiter")).toBe(2);
    expect(icTitleRank(null)).toBe(1);
  });
  it("requests NON_LEADERSHIP, drops execs/board, engineers first", async () => {
    const urls: string[] = [];
    const f = vi.fn(async (url: string) => {
      urls.push(url);
      if (url.includes("search_agent")) return ok({ results: [{ urn: "urn:harmonic:company:1" }] });
      if (url.includes("/employees")) return ok({ results: ["urn:harmonic:person:1", "urn:harmonic:person:2", "urn:harmonic:person:3", "urn:harmonic:person:4"] });
      const p = (id: number, name: string, title: string) => ({ entity_urn: `urn:harmonic:person:${id}`, full_name: name, experience: [{ title, company_name: "Modal", is_current_position: true }] });
      return ok([p(1, "Erik B", "Chief Executive Officer"), p(2, "Ops Person", "Office Manager"), p(3, "Elias F", "Software Engineer"), p(4, "Sarah C", "Board Member")]);
    });
    const r = await harmonicCompanyFirstPeople({ apiKey: "k", baseUrl: "https://h" }, "ML infrastructure", { group: "NON_LEADERSHIP", perCompany: 5 }, f as never);
    expect(urls.find((u) => u.includes("/employees"))).toContain("employee_group_type=NON_LEADERSHIP");
    expect(r.candidates.map((c) => c.fullName)).toEqual(["Elias F", "Ops Person"]);
  });
  it("falls back to ALL when a company has no NON_LEADERSHIP tags", async () => {
    const groups: string[] = [];
    const f = vi.fn(async (url: string) => {
      if (url.includes("search_agent")) return ok({ results: [{ urn: "urn:harmonic:company:1" }] });
      if (url.includes("/employees")) { const g = new URL(url).searchParams.get("employee_group_type")!; groups.push(g); return ok({ results: g === "ALL" ? ["urn:harmonic:person:3"] : [] }); }
      return ok([{ entity_urn: "urn:harmonic:person:3", full_name: "Eng", experience: [{ title: "Engineer", company_name: "X", is_current_position: true }] }]);
    });
    const r = await harmonicCompanyFirstPeople({ apiKey: "k", baseUrl: "https://h" }, "x", { group: "NON_LEADERSHIP" }, f as never);
    expect(groups).toEqual(["NON_LEADERSHIP", "ALL"]);
    expect(r.candidates).toHaveLength(1);
  });
});

describe("GitHub: core, high-signal repos", () => {
  it("merges per-keyword results, puts canonical repo first, then by stars", async () => {
    const f = vi.fn(async (url: string) => {
      if (url.includes("/search/repositories")) {
        const q = decodeURIComponent(new URL(url).searchParams.get("q")!);
        if (q.startsWith("PyTorch")) return ok({ items: [
          { full_name: "huggingface/transformers", name: "transformers", owner: { login: "huggingface" }, stargazers_count: 140000 },
          { full_name: "pytorch/pytorch", name: "pytorch", owner: { login: "pytorch" }, stargazers_count: 90000 },
        ] });
        return ok({ items: [
          { full_name: "run-house/kubetorch", name: "kubetorch", owner: { login: "run-house" }, stargazers_count: 900 },
          { full_name: "microsoft/DeepSpeed", name: "DeepSpeed", owner: { login: "microsoft" }, stargazers_count: 40000 },
          { full_name: "someone/fork", name: "fork", owner: { login: "someone" }, stargazers_count: 99999, fork: true },
        ] });
      }
      if (url.includes("/contributors")) return ok([{ login: url.includes("pytorch/pytorch") ? "ezyang" : "dev", type: "User" }]);
      return ok({ login: new URL(url).pathname.split("/").pop(), id: 1 });
    });
    const r = await githubContributorSearch("t", ["ML infrastructure in:name", "PyTorch in:name", "distributed training in:name"], { repos: 3 }, f as never);
    expect(r.repos).toEqual(["pytorch/pytorch", "huggingface/transformers", "microsoft/DeepSpeed"]);
    expect(r.candidates[0].githubLogin).toBe("ezyang");
  });
});

describe("Board roles are ungettable (current only)", () => {
  it("flags current board roles, not past ones", () => {
    expect(classifyPerson({ currentTitle: "Board Member" }).ungettable).toBe(true);
    expect(classifyPerson({ currentTitle: "Board Director" }).ungettable).toBe(true);
    expect(classifyPerson({ headline: "Advisory Board Member at Foo" }).ungettable).toBe(true);
    expect(currentExecTitle("Non-Executive Director, Acme")).toBeTruthy();
    expect(classifyPerson({ currentTitle: "Staff Engineer", headline: "former board member of Foo" }).ungettable).toBe(false);
    expect(classifyPerson({ currentTitle: "Director of Engineering" }).ungettable).toBe(false);
    expect(classifyPerson({ currentTitle: "Advisor" }).ungettable).toBe(false);
  });
});

describe("GitHub handle by name + company", () => {
  const user = (login: string, extra: Record<string, unknown>) => ({ login, name: "Jane Doe", followers: 10, ...extra });
  const mk = (users: Record<string, unknown>[], orgs: Record<string, unknown[]> = {}, total = users.length) => vi.fn(async (url: string) => {
    if (url.includes("/search/users")) return ok({ total_count: total, items: users.map((u) => ({ login: u.login })) });
    const m = url.match(/\/users\/([^/]+)(\/orgs)?$/)!;
    if (m[2]) return ok(orgs[m[1]] || []);
    return ok(users.find((u) => u.login === m[1]));
  });
  it("company tokens drop generic words", () => {
    expect(companyTokens("Amazon Web Services")).toEqual(["amazon"]);
    expect(companyTokens("Acme AI, Inc.")).toEqual(["acme"]);
  });
  it("matches via public org membership", async () => {
    const f = mk([user("jd", { company: "", bio: "" })], { jd: [{ login: "acme-ai" }] });
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme AI", f as never)).toMatchObject({ login: "jd", via: "org" });
  });
  it("does not match on substrings (meta vs metadata)", async () => {
    const f = mk([user("jd", { bio: "metadata tooling" })]);
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Meta", f as never)).toBeNull();
  });
  it("location breaks ties between company matches", async () => {
    const f = mk([user("jd-ny", { company: "Acme", location: "New York", followers: 900 }), user("jd-sf", { company: "@acme", location: "San Francisco, CA", followers: 5 })]);
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme", f as never, "San Francisco Bay Area")).toMatchObject({ login: "jd-sf" });
  });
  it("single exact-name hit with matching location is accepted without company", async () => {
    const f = mk([user("jdoe", { company: "", location: "Seattle, WA" })]);
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme", f as never, "Seattle, Washington")).toMatchObject({ login: "jdoe", via: "location" });
    const f2 = mk([user("jdoe", { company: "", location: "Berlin" })]);
    expect(await githubHandleByNameCompany("t", "Jane Doe", "Acme", f2 as never, "Seattle, Washington")).toBeNull();
  });
  it("skips abbreviated names", async () => {
    expect(await githubHandleByNameCompany("t", "Sertan A.", "Google", mk([]) as never)).toBeNull();
  });
});
