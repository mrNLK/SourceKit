import { describe, it, expect, vi } from "vitest";
import {
  normalizeLinkedinUrl, githubLoginFromUrl, parseProfileTitle, fromExaResult, fromApolloPerson,
  fromParallelEntity, fromParallelFindAllCandidate, fromExaWebsetItem, fromGithubUser, type UnifiedCandidate,
} from "../providers/candidate.ts";
import { dedupCandidates, isFuzzyMatch, jaroWinkler, sourcingScore } from "../providers/dedup.ts";
import {
  buildApolloSearchUrl, buildExaPeopleSearch, buildFindAllPeopleRun, buildParallelEntitySearch,
  buildParallelExtractV1, buildParallelSearchV1, buildPeopleQuery, buildWebsetPeopleSearch, sanitizeFilters, hasApolloFilters,
} from "../providers/requests.ts";
import { exaMaxResults, isApolloEnabled, isParallelPeopleEnabled, clamp } from "../providers/flags.ts";
import {
  apolloPeopleSearch, exaPeopleSearch, findAllCreatePeopleRun, findAllGetResult, parallelEntitySearchPeople,
  parallelExtractV1, ProviderError,
} from "../providers/clients.ts";

const env = (m: Record<string, string>) => (k: string) => m[k];

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
}

describe("normalization", () => {
  it("normalizes linkedin urls", () => {
    expect(normalizeLinkedinUrl("https://LinkedIn.com/in/Jane-Doe/?trk=x")).toBe("https://www.linkedin.com/in/jane-doe");
    expect(normalizeLinkedinUrl("http://uk.linkedin.com/in/jane%C3%A9")).toBe("https://www.linkedin.com/in/janeé");
    expect(normalizeLinkedinUrl("https://linkedin.com/company/acme")).toBeNull();
    expect(normalizeLinkedinUrl(null)).toBeNull();
  });
  it("extracts github logins only from profile urls", () => {
    expect(githubLoginFromUrl("https://github.com/Torvalds")).toBe("torvalds");
    expect(githubLoginFromUrl("https://github.com/torvalds/linux")).toBeNull();
    expect(githubLoginFromUrl("https://github.com/orgs")).toBeNull();
  });
  it("parses linkedin-style titles", () => {
    expect(parseProfileTitle("Jane Doe - Staff Engineer - Acme | LinkedIn")).toEqual({ name: "Jane Doe", title: "Staff Engineer", company: "Acme" });
    expect(parseProfileTitle("Jane Doe – ML Engineer at OpenAI")).toEqual({ name: "Jane Doe", title: "ML Engineer", company: "OpenAI" });
    expect(parseProfileTitle("Solo Name").name).toBe("Solo Name");
  });
});

describe("provider mappers", () => {
  it("maps exa people results", () => {
    const c = fromExaResult({ title: "Jane Doe - Staff Engineer - Acme", url: "https://www.linkedin.com/in/janedoe", highlights: ["PyTorch"], score: 0.4 }, 1)!;
    expect(c.fullName).toBe("Jane Doe");
    expect(c.linkedinUrl).toBe("https://www.linkedin.com/in/janedoe");
    expect(c.currentCompany).toBe("Acme");
    expect(c.sources[0]).toMatchObject({ provider: "exa", rank: 1, snippet: "PyTorch" });
  });
  it("maps apollo, parallel, webset, findall and github records", () => {
    expect(fromApolloPerson({ id: "ap1", first_name: "Jane", last_name_obfuscated: "D***", title: "CTO", organization: { name: "Acme", primary_domain: "acme.com" } }, 1)).toMatchObject({ fullName: "Jane D***", apolloId: "ap1", companyDomain: "acme.com" });
    expect(fromParallelEntity({ name: "Jane Doe", url: "https://github.com/janed", description: "ML" }, 2)).toMatchObject({ githubLogin: "janed" });
    expect(fromExaWebsetItem({ id: "w1", properties: { url: "https://linkedin.com/in/jd", person: { name: "Jane Doe", position: "SWE", company: { name: "Acme" }, location: "SF" } } }, 1)).toMatchObject({ currentTitle: "SWE", location: "SF", linkedinUrl: "https://www.linkedin.com/in/jd" });
    expect(fromParallelFindAllCandidate({ candidate_id: "c1", name: "Jane", url: "x", output: { linkedin_url: { value: "https://linkedin.com/in/jane" } } }, 1)?.linkedinUrl).toBe("https://www.linkedin.com/in/jane");
    expect(fromGithubUser({ login: "JaneD", id: 5, html_url: "https://github.com/JaneD", company: "@acme" }, 1)).toMatchObject({ githubLogin: "janed", currentCompany: "acme" });
  });
});

function cand(p: Partial<UnifiedCandidate>): UnifiedCandidate {
  return { fullName: "X", emails: [], profileUrls: [], sources: [{ provider: "exa", rank: 1 }], ...p };
}

describe("dedup", () => {
  it("merges on linkedin slug, github login, apollo id, email", () => {
    const out = dedupCandidates([
      cand({ fullName: "Jane Doe", linkedinUrl: "https://www.linkedin.com/in/janedoe" }),
      cand({ fullName: "J. Doe", linkedinUrl: "https://linkedin.com/in/JaneDoe/", githubLogin: "jd", sources: [{ provider: "parallel_entity", rank: 3 }] }),
      cand({ fullName: "Janie", githubLogin: "JD", emails: ["j@x.com"], sources: [{ provider: "github", rank: 2 }] }),
      cand({ fullName: "Someone", emails: ["j@x.com"], apolloId: "a1", sources: [{ provider: "apollo", rank: 1 }] }),
      cand({ fullName: "Other", apolloId: "a1" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sources.map((s) => s.provider)).toEqual(["exa", "parallel_entity", "github", "apollo", "exa"]);
    expect(out[0].githubLogin).toBe("jd");
    expect(out[0].apolloId).toBe("a1");
  });
  it("fuzzy-matches name + company but never name alone or with conflicting ids", () => {
    const a = cand({ fullName: "Jonathan Smith", currentCompany: "Acme Inc" });
    expect(isFuzzyMatch(a, cand({ fullName: "Jonathon Smith", currentCompany: "acme" }))).toBe(true);
    expect(isFuzzyMatch(a, cand({ fullName: "Jonathan Smith" }))).toBe(false);
    expect(isFuzzyMatch(a, cand({ fullName: "Jonathan Smith", currentCompany: "Globex" }))).toBe(false);
    expect(isFuzzyMatch(cand({ ...a, githubLogin: "a" }), cand({ fullName: "Jonathan Smith", currentCompany: "Acme", githubLogin: "b" }))).toBe(false);
    expect(dedupCandidates([a, cand({ fullName: "Jon Smith", currentCompany: "Other" })])).toHaveLength(2);
  });
  it("jaroWinkler sanity", () => {
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 2);
    expect(jaroWinkler("", "a")).toBe(0);
  });
  it("scores multi-source agreement higher", () => {
    const one = cand({ sources: [{ provider: "exa", rank: 5 }] });
    const two = cand({ sources: [{ provider: "exa", rank: 5 }, { provider: "apollo", rank: 5 }] });
    expect(sourcingScore(two)).toBeGreaterThan(sourcingScore(one));
  });
});

describe("request builders match current docs", () => {
  it("exa uses category people and a current search type, no useAutoprompt", () => {
    const b = buildExaPeopleSearch("ml engineers", { numResults: 25 }) as Record<string, unknown>;
    expect(b.category).toBe("people");
    expect(b.type).toBe("auto");
    expect(b).not.toHaveProperty("useAutoprompt");
    expect(b).not.toHaveProperty("excludeDomains");
  });
  it("parallel builders", () => {
    expect(buildParallelEntitySearch("x", 5000)).toEqual({ entity_type: "people", objective: "x", match_limit: 1000 });
    expect(buildParallelSearchV1("o", ["a"], 5)).toEqual({ objective: "o", search_queries: ["a"], advanced_settings: { max_results: 5 } });
    const ex = buildParallelExtractV1("https://x.com") as Record<string, unknown>;
    expect(ex).toEqual({ urls: ["https://x.com"], advanced_settings: { full_content: true } });
    expect(ex).not.toHaveProperty("full_content");
    const run = buildFindAllPeopleRun({ role: "ML engineer", company: "Acme" }, { matchLimit: 2, excludeUrls: ["u"] });
    expect(run).toMatchObject({ entity_type: "people", generator: "base", match_limit: 5, exclude_list: [{ name: "u", url: "u" }] });
    expect(run.match_conditions.map((c) => c.name)).toEqual(["role_match", "company_match"]);
    expect(run).not.toHaveProperty("max_results");
  });
  it("webset people search", () => {
    expect(buildWebsetPeopleSearch({ role: "SRE", company: "Acme" }, 10, 3).search).toMatchObject({ entity: { type: "person" }, count: 10, maxPeoplePerCompany: 3 });
  });
  it("apollo url from filters", () => {
    const f = sanitizeFilters({ titles: ["ML Engineer"], seniorities: ["senior"], locations: ["California, US"], company_domains: ["acme.com"], skills: ["pytorch"] });
    const url = new URL(buildApolloSearchUrl(f, 1, 500));
    expect(url.pathname).toBe("/api/v1/mixed_people/api_search");
    expect(url.searchParams.getAll("person_titles[]")).toEqual(["ML Engineer"]);
    expect(url.searchParams.getAll("q_organization_domains_list[]")).toEqual(["acme.com"]);
    expect(url.searchParams.get("q_keywords")).toBe("pytorch");
    expect(url.searchParams.get("per_page")).toBe("100");
    expect(hasApolloFilters(sanitizeFilters({}))).toBe(false);
  });
  it("people query", () => {
    expect(buildPeopleQuery("ML engineers", { skills: ["PyTorch"], locations: ["Seattle"] })).toBe("professional profiles of ML engineers with experience in PyTorch based in Seattle");
  });
});

describe("flags", () => {
  it("parallel people sources default off", () => {
    expect(isParallelPeopleEnabled(env({}))).toBe(false);
    expect(isParallelPeopleEnabled(env({ PARALLEL_PEOPLE_SOURCES_ENABLED: "true" }))).toBe(true);
  });
  it("apollo needs key; explicit off wins", () => {
    expect(isApolloEnabled(env({}))).toBe(false);
    expect(isApolloEnabled(env({ APOLLO_API_KEY: "k" }))).toBe(true);
    expect(isApolloEnabled(env({ APOLLO_API_KEY: "k", APOLLO_SOURCE_ENABLED: "false" }))).toBe(false);
  });
  it("exa max results defaults to 25", () => {
    expect(exaMaxResults(env({}))).toBe(25);
    expect(exaMaxResults(env({ EXA_MAX_RESULTS: "100" }))).toBe(100);
    expect(clamp("abc", 1, 5, 3)).toBe(3);
    expect(clamp(99, 1, 5, 3)).toBe(5);
  });
});

describe("clients (mocked fetch, no network)", () => {
  it("exa people search posts to /search", async () => {
    const f = mockFetch({ results: [{ title: "A B - SWE - C", url: "https://linkedin.com/in/ab" }] });
    const out = await exaPeopleSearch("k", "q", { numResults: 25 }, f);
    expect(out[0].linkedinUrl).toBe("https://www.linkedin.com/in/ab");
    expect(f.mock.calls[0][0]).toBe("https://api.exa.ai/search");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string).category).toBe("people");
  });
  it("parallel entity search + findall", async () => {
    const f1 = mockFetch({ entities: [{ name: "A B", url: "https://github.com/ab" }] });
    expect((await parallelEntitySearchPeople("k", "o", 100, f1))[0].githubLogin).toBe("ab");
    expect(f1.mock.calls[0][0]).toBe("https://api.parallel.ai/v1beta/findall/entity-search");
    const f2 = mockFetch({ findall_id: "fa_1", status: { status: "queued" } });
    expect(await findAllCreatePeopleRun("k", { role: "r" }, {}, f2)).toEqual({ id: "fa_1", status: "queued" });
    expect(f2.mock.calls[0][0]).toBe("https://api.parallel.ai/v1beta/findall/runs");
    const f3 = mockFetch({ run: { status: { status: "completed", is_active: false } }, candidates: [{ name: "A", match_status: "matched" }, { name: "B", match_status: "unmatched" }] });
    const r = await findAllGetResult("k", "fa_1", f3);
    expect(r.candidates.map((c) => c.fullName)).toEqual(["A"]);
    expect(f3.mock.calls[0][0]).toBe("https://api.parallel.ai/v1beta/findall/runs/fa_1/result");
  });
  it("parallel extract v1 returns full content", async () => {
    const f = mockFetch({ results: [{ url: "u", full_content: "hello world" }] });
    expect(await parallelExtractV1("k", "u", undefined, f)).toBe("hello world");
    expect(f.mock.calls[0][0]).toBe("https://api.parallel.ai/v1/extract");
  });
  it("apollo search maps people and surfaces errors", async () => {
    const f = mockFetch({ people: [{ id: "1", first_name: "A", last_name_obfuscated: "B***" }], total_entries: 42 });
    const r = await apolloPeopleSearch("k", { titles: ["x"] }, 1, 25, f);
    expect(r.total).toBe(42);
    expect(r.candidates[0].apolloId).toBe("1");
    await expect(apolloPeopleSearch("k", {}, 1, 25, mockFetch({ error: "master key" }, 403))).rejects.toBeInstanceOf(ProviderError);
  });
});

import { mergeWithExisting, toRow, COST } from "../providers/persist.ts";

describe("persist merge", () => {
  it("updates existing row id when identity matches, inserts new otherwise", () => {
    const existing = [toRow("u1", cand({ fullName: "Jane Doe", linkedinUrl: "https://linkedin.com/in/jane", sources: [{ provider: "github", rank: 1 }] }), "row-1")];
    const fresh = [
      cand({ fullName: "Jane Doe", linkedinUrl: "https://www.linkedin.com/in/Jane", currentTitle: "CTO", sources: [{ provider: "exa", rank: 2 }] }),
      cand({ fullName: "Bob Roe", githubLogin: "bob", sources: [{ provider: "apollo", rank: 1 }] }),
    ];
    const out = mergeWithExisting("u1", fresh, existing);
    expect(out).toHaveLength(2);
    const jane = out.find((o) => o.row.linkedin_slug === "jane")!;
    expect(jane.row.id).toBe("row-1");
    expect(jane.row.current_title).toBe("CTO");
    expect(jane.row.providers.sort()).toEqual(["exa", "github"]);
    expect(jane.hits).toEqual([{ provider: "exa", rank: 2 }]);
    expect(out.find((o) => o.row.github_login === "bob")!.row.id).toBeUndefined();
  });
  it("cost estimates", () => {
    expect(COST.exaSearch(25)).toBeCloseTo(0.022);
    expect(COST.findAllRun("base", 100)).toBeCloseTo(3.25);
  });
});
