import { describe, it, expect, vi } from "vitest";
import {
  normalizeLinkedinUrl, githubLoginFromUrl, parseProfileTitle, fromExaResult, fromHarmonicPerson,
  fromParallelEntity, fromParallelFindAllCandidate, fromExaWebsetItem, fromGithubUser, type UnifiedCandidate,
} from "../providers/candidate.ts";
import { dedupCandidates, isFuzzyMatch, jaroWinkler, sourcingScore } from "../providers/dedup.ts";
import {
  buildAirscaleEmailInput, buildHarmonicCompanyQuery, harmonicEmployeeGroup, buildExaPeopleSearch, buildFindAllPeopleRun, buildParallelEntitySearch,
  buildParallelExtractV1, buildParallelSearchV1, buildPeopleQuery, buildWebsetPeopleSearch, sanitizeFilters, hasFilters,
} from "../providers/requests.ts";
import { exaMaxResults, isHarmonicEnabled, harmonicBaseUrl, isAirscaleEnabled, isParallelPeopleEnabled, clamp } from "../providers/flags.ts";
import {
  airscaleFindEmail, extractUrns, harmonicCompanyFirstPeople, harmonicPeopleByName, exaPeopleSearch, findAllCreatePeopleRun, findAllGetResult, parallelEntitySearchPeople,
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
  it("maps harmonic, parallel, webset, findall and github records", () => {
    expect(fromHarmonicPerson({ entity_urn: "urn:harmonic:person:1", full_name: "Jane Doe", socials: { linkedin: { url: "https://linkedin.com/in/JaneD" } }, experience: [{ title: "CTO", company_name: "Acme", is_current_position: true }], location: { city: "SF", country: "US" } }, 1)).toMatchObject({ fullName: "Jane Doe", harmonicUrn: "urn:harmonic:person:1", linkedinUrl: "https://www.linkedin.com/in/janed", currentTitle: "CTO", currentCompany: "Acme", location: "SF, US" });
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
  it("merges on linkedin slug, github login, harmonic urn, email", () => {
    const out = dedupCandidates([
      cand({ fullName: "Jane Doe", linkedinUrl: "https://www.linkedin.com/in/janedoe" }),
      cand({ fullName: "J. Doe", linkedinUrl: "https://linkedin.com/in/JaneDoe/", githubLogin: "jd", sources: [{ provider: "parallel_entity", rank: 3 }] }),
      cand({ fullName: "Janie", githubLogin: "JD", emails: ["j@x.com"], sources: [{ provider: "github", rank: 2 }] }),
      cand({ fullName: "Someone", emails: ["j@x.com"], harmonicUrn: "urn:harmonic:person:9", sources: [{ provider: "harmonic", rank: 1 }] }),
      cand({ fullName: "Other", harmonicUrn: "urn:harmonic:person:9" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sources.map((s) => s.provider)).toEqual(["exa", "parallel_entity", "github", "harmonic", "exa"]);
    expect(out[0].githubLogin).toBe("jd");
    expect(out[0].harmonicUrn).toBe("urn:harmonic:person:9");
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
    const two = cand({ sources: [{ provider: "exa", rank: 5 }, { provider: "harmonic", rank: 5 }] });
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
  it("harmonic + airscale builders", () => {
    expect(buildHarmonicCompanyQuery("ml infra", { companies: ["Acme", "Globex"] })).toBe("Acme, Globex");
    expect(buildHarmonicCompanyQuery("ml infra", { skills: ["cuda"] })).toBe("companies building cuda");
    expect(harmonicEmployeeGroup({}, "founding engineer")).toBe("ALL");
    expect(harmonicEmployeeGroup({ titles: ["VP Engineering"] }, "")).toBe("LEADERSHIP");
    expect(harmonicEmployeeGroup({}, "ex-founder CEO")).toBe("FOUNDERS_AND_CEO");
    expect(hasFilters(sanitizeFilters({}))).toBe(false);
    expect(hasFilters(sanitizeFilters({ companies: ["Acme"] }))).toBe(true);
    expect(buildAirscaleEmailInput({ fullName: "Jane Q Doe", currentCompany: "Acme" })).toEqual({ first_name: "Jane", last_name: "Doe", company_name: "Acme" });
    expect(buildAirscaleEmailInput({ fullName: "Jane", linkedinUrl: "https://www.linkedin.com/in/j" })).toEqual({ linkedin_profile_url: "https://www.linkedin.com/in/j" });
    expect(buildAirscaleEmailInput({ fullName: "Jane Doe" })).toBeNull();
    expect(buildAirscaleEmailInput({ fullName: "Jane D***", currentCompany: "Acme" })).toBeNull();
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
  it("harmonic on with key unless disabled; airscale only with key", () => {
    expect(isHarmonicEnabled(env({}))).toBe(false);
    expect(isHarmonicEnabled(env({ HARMONIC_API_KEY: "k" }))).toBe(true);
    expect(isHarmonicEnabled(env({ HARMONIC_API_KEY: "k", HARMONIC_SOURCE_ENABLED: "false" }))).toBe(false);
    expect(harmonicBaseUrl(env({ HARMONIC_BASE_URL: "https://h.example/" }))).toBe("https://h.example");
    expect(harmonicBaseUrl(env({}))).toBe("https://api.harmonic.ai");
    expect(isAirscaleEnabled(env({}))).toBe(false);
    expect(isAirscaleEnabled(env({ AIRSCALE_API_KEY: " " }))).toBe(false);
    expect(isAirscaleEnabled(env({ AIRSCALE_API_KEY: "k" }))).toBe(true);
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
  it("harmonic company-first: search_agent -> employees -> batchGet", async () => {
    const cfg = { apiKey: "hk", baseUrl: "https://h.example" };
    const f = vi.fn(async (url: string, _init?: RequestInit) => {
      const body = url.includes("/search/search_agent")
        ? { results: [{ entity_urn: "urn:harmonic:company:1" }, { entity_urn: "urn:harmonic:company:2" }] }
        : url.includes("/employees")
          ? { results: url.includes("company%3A1") ? ["urn:harmonic:person:a", "urn:harmonic:person:b"] : ["urn:harmonic:person:b"] }
          : [{ entity_urn: "urn:harmonic:person:a", full_name: "A One" }, { entity_urn: "urn:harmonic:person:b", full_name: "B Two" }];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const r = await harmonicCompanyFirstPeople(cfg, "ml infra", { companies: 2, perCompany: 5, group: "ALL" }, f);
    expect(r.companyUrns).toEqual(["urn:harmonic:company:1", "urn:harmonic:company:2"]);
    expect(r.candidates.map((c) => c.harmonicUrn)).toEqual(["urn:harmonic:person:a", "urn:harmonic:person:b"]);
    const batch = f.mock.calls.find((c) => c[0].endsWith("/persons/batchGet"))!;
    expect(JSON.parse(batch[1]!.body as string)).toEqual({ urns: ["urn:harmonic:person:a", "urn:harmonic:person:b"] });
    expect((batch[1]!.headers as Record<string, string>).apikey).toBe("hk");
  });
  it("harmonic name lookup uses typeahead PERSON", async () => {
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("typeahead") ? { results: [{ entity_urn: "urn:harmonic:person:z", type: "PERSON" }] } : [{ entity_urn: "urn:harmonic:person:z", full_name: "Zed Z" }])));
    const out = await harmonicPeopleByName({ apiKey: "k", baseUrl: "https://h" }, "Zed", 5, f);
    expect(f.mock.calls[0][0]).toContain("search_type=PERSON");
    expect(out[0].fullName).toBe("Zed Z");
    expect(extractUrns({ results: ["urn:harmonic:company:1"] }, "person")).toEqual([]);
  });
  it("airscale email finder: bearer auth, success and not_found", async () => {
    const ok = mockFetch({ status: "success", email: "jane@acme.com", email_status: "valid" });
    expect(await airscaleFindEmail("ak", { first_name: "Jane", last_name: "Doe", domain: "acme.com" }, ok)).toMatchObject({ status: "success", email: "jane@acme.com" });
    expect(ok.mock.calls[0][0]).toBe("https://api.airscale.io/v1/email");
    expect((ok.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer ak");
    expect(await airscaleFindEmail("ak", { linkedin_profile_url: "x" }, mockFetch({ status: "not_found", email: null }))).toMatchObject({ status: "not_found", email: null });
    await expect(airscaleFindEmail("bad", { linkedin_profile_url: "x" }, mockFetch({ error: "unauthorized" }, 401))).rejects.toBeInstanceOf(ProviderError);
  });
});

import { mergeWithExisting, toRow, COST } from "../providers/persist.ts";

describe("persist merge", () => {
  it("updates existing row id when identity matches, inserts new otherwise", () => {
    const existing = [toRow("u1", cand({ fullName: "Jane Doe", linkedinUrl: "https://linkedin.com/in/jane", sources: [{ provider: "github", rank: 1 }] }), "row-1")];
    const fresh = [
      cand({ fullName: "Jane Doe", linkedinUrl: "https://www.linkedin.com/in/Jane", currentTitle: "CTO", sources: [{ provider: "exa", rank: 2 }] }),
      cand({ fullName: "Bob Roe", githubLogin: "bob", sources: [{ provider: "harmonic", rank: 1 }] }),
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
