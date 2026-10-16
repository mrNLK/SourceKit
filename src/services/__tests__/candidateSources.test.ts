import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mockGetSession } } }));
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon");

let mod: typeof import("../candidateSources");
beforeAll(async () => { mod = await import("../candidateSources"); });
beforeEach(() => {
  vi.restoreAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "user-jwt" } } });
});

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("candidateSources service", () => {
  it("sourceCandidates posts to source-candidates with user JWT", async () => {
    const f = mockFetch({ candidates: [], sources: {}, enabled: {}, raw_count: 0, est_cost_usd: 0 });
    await mod.sourceCandidates({ query: "ml", sources: ["exa", "harmonic"] });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://test.supabase.co/functions/v1/source-candidates");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer user-jwt");
    expect(JSON.parse(init!.body as string)).toEqual({ query: "ml", sources: ["exa", "harmonic"] });
  });
  it("deep search start/status use map-company-talent actions", async () => {
    const f = mockFetch({ run_id: "r1", engine: "webset", external_run_id: "w", status: "running", est_cost_usd: null });
    await mod.startDeepSearch({ role: "SRE" });
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ action: "start", role: "SRE" });
    mockFetch({ status: "idle", is_active: false, candidates: [] });
    await mod.getDeepSearchStatus("r1");
  });
  it("surfaces pilot cap / errors", async () => {
    mockFetch({ error: "daily_cap_reached", message: "Daily search limit reached (25/25)." }, 429);
    await expect(mod.sourceCandidates({ query: "x" })).rejects.toThrow("Daily search limit reached");
  });
  it("requires a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(mod.enrichEmails(["a"])).rejects.toThrow(/sign in/);
  });
  it("pollDeepSearch stops when run becomes inactive", async () => {
    const statuses = [
      { status: "running", is_active: true, candidates: [] },
      { status: "running", is_active: true, candidates: [{ full_name: "A", emails: [], profile_urls: [], providers: ["exa_webset"], sourcing_score: 50 }] },
      { status: "completed", is_active: false, candidates: [] },
    ];
    const getStatus = vi.fn(async () => statuses.shift()!);
    const updates: string[] = [];
    const last = await mod.pollDeepSearch("r1", (s) => updates.push(s.status), { getStatus, sleep: async () => {}, maxAttempts: 10 });
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(updates).toEqual(["running", "running", "completed"]);
    expect(last?.is_active).toBe(false);
  });
  it("pollDeepSearch respects abort + max attempts", async () => {
    const getStatus = vi.fn(async () => ({ status: "running", is_active: true, candidates: [] }));
    await mod.pollDeepSearch("r", () => {}, { getStatus, sleep: async () => {}, maxAttempts: 3 });
    expect(getStatus).toHaveBeenCalledTimes(3);
    const ctrl = new AbortController();
    ctrl.abort();
    expect(await mod.pollDeepSearch("r", () => {}, { getStatus, signal: ctrl.signal })).toBeNull();
  });
  it("providerBadges labels + dedups", () => {
    expect(mod.providerBadges(["exa", "parallel_entity", "parallel_search", "harmonic", "mystery"]).map((b) => b.label)).toEqual(["Exa", "Parallel", "Harmonic", "mystery"]);
    expect(mod.splitList("a, b\nc,,")).toEqual(["a", "b", "c"]);
  });
});
