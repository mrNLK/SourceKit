import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before dynamic import of websets module
// ---------------------------------------------------------------------------

const { mockGetSession, mockGetUser, mockRefreshSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
    },
  },
}));

// Stub env vars BEFORE module evaluation via import.meta.env
// In Vite/vitest jsdom, import.meta.env is populated from process.env for VITE_ prefixed vars
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

// Dynamic import so module reads the stubbed env
let createWebset: typeof import("../websets").createWebset;
let listWebsets: typeof import("../websets").listWebsets;
let getWebset: typeof import("../websets").getWebset;
let getWebsetItems: typeof import("../websets").getWebsetItems;
let deleteWebset: typeof import("../websets").deleteWebset;
let addEnrichment: typeof import("../websets").addEnrichment;

beforeAll(async () => {
  const mod = await import("../websets");
  createWebset = mod.createWebset;
  listWebsets = mod.listWebsets;
  getWebset = mod.getWebset;
  getWebsetItems = mod.getWebsetItems;
  deleteWebset = mod.deleteWebset;
  addEnrichment = mod.addEnrichment;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSession(token = "valid-session-token") {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: token } },
    error: null,
  });
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user_1" } },
    error: null,
  });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
}

function mockFetch(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockSession();
  mockRefreshSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mockSignOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe("authentication", () => {
  it("throws when no session is available", async () => {
    mockNoSession();
    await expect(listWebsets()).rejects.toThrow("Authentication required");
  });

  it("sends session token as Bearer header, not anon key", async () => {
    mockFetch({ data: [] });
    await listWebsets();
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer valid-session-token");
    expect(options.headers["apikey"]).toBe("test-anon-key");
  });

  it("refreshes and uses a new token when current JWT is invalid", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "stale-session-token" } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid JWT" },
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: "fresh-session-token" } },
      error: null,
    });
    mockFetch({ data: [] });

    await listWebsets();

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer fresh-session-token");
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("signs out and throws re-login error when refresh fails", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: "stale-session-token" } },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid JWT" },
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Refresh failed" },
    });
    global.fetch = vi.fn();

    await expect(listWebsets()).rejects.toThrow("Session expired – please sign in again.");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retries once with refreshed token when API returns Invalid JWT", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: "retry-token" } },
      error: null,
    });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid JWT" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

    const result = await listWebsets();
    expect(result).toEqual([]);

    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const secondCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1];
    expect(firstCall.headers["Authorization"]).toBe("Bearer valid-session-token");
    expect(secondCall.headers["Authorization"]).toBe("Bearer retry-token");
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("signs out when API still returns Invalid JWT after retry", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: "retry-token" } },
      error: null,
    });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid JWT" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid JWT" }),
      });

    await expect(listWebsets()).rejects.toThrow("Session expired – please sign in again.");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// createWebset
// ---------------------------------------------------------------------------

describe("createWebset", () => {
  it("sends action: create with query and count", async () => {
    mockFetch({ id: "ws_1", status: "running" });
    const result = await createWebset("test query", 25);
    expect(result).toEqual({ id: "ws_1", status: "running" });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.action).toBe("create");
    expect(body.query).toBe("test query");
    expect(body.count).toBe(25);
  });

  it("includes criteria and enrichments when provided", async () => {
    mockFetch({ id: "ws_1", status: "running" });
    await createWebset("q", 10, {
      criteria: [{ description: "Has OSS work" }],
      enrichments: [{ description: "Email", format: "text" }],
    });
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.criteria).toEqual([{ description: "Has OSS work" }]);
    expect(body.enrichments).toEqual([{ description: "Email", format: "text" }]);
  });
});

// ---------------------------------------------------------------------------
// listWebsets
// ---------------------------------------------------------------------------

describe("listWebsets", () => {
  it("unwraps { data: [...] } response shape", async () => {
    mockFetch({ data: [{ id: "ws_1" }, { id: "ws_2" }] });
    const result = await listWebsets();
    expect(result).toHaveLength(2);
  });

  it("handles flat array response shape", async () => {
    mockFetch([{ id: "ws_1" }]);
    const result = await listWebsets();
    expect(result).toHaveLength(1);
  });

  it("returns the response object when no data wrapper present", async () => {
    // NOTE: `data.data || data || []` returns {} for empty objects — this is
    // a known quirk. The Exa API always returns { data: [...] } in practice.
    mockFetch({});
    const result = await listWebsets();
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// getWebsetItems
// ---------------------------------------------------------------------------

describe("getWebsetItems", () => {
  it("unwraps { data: [...] } response shape", async () => {
    mockFetch({ data: [{ id: "item_1", url: "https://example.com", title: "Test" }] });
    const result = await getWebsetItems("ws_1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("item_1");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws on string error response", async () => {
    mockFetch({ error: "Rate limited" }, false, 429);
    await expect(listWebsets()).rejects.toThrow("Rate limited");
  });

  it("throws on { error: { message } } response", async () => {
    mockFetch({ error: { message: "Invalid query", type: "validation_error" } }, false, 400);
    await expect(createWebset("", 0)).rejects.toThrow("Invalid query");
  });

  it("throws on { message } response", async () => {
    mockFetch({ message: "Internal server error" }, false, 500);
    await expect(getWebset("ws_1")).rejects.toThrow("Internal server error");
  });

  it("serializes unknown error shape", async () => {
    mockFetch({ error: { code: 42 } }, false, 500);
    await expect(deleteWebset("ws_1")).rejects.toThrow('{"code":42}');
  });
});

// ---------------------------------------------------------------------------
// deleteWebset / addEnrichment
// ---------------------------------------------------------------------------

describe("deleteWebset", () => {
  it("sends action: delete with webset_id", async () => {
    mockFetch({});
    await deleteWebset("ws_1");
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.action).toBe("delete");
    expect(body.webset_id).toBe("ws_1");
  });
});

describe("addEnrichment", () => {
  it("sends action: enrich with correct params", async () => {
    mockFetch({ id: "enr_1" });
    await addEnrichment("ws_1", "Find email", "text");
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.action).toBe("enrich");
    expect(body.webset_id).toBe("ws_1");
    expect(body.description).toBe("Find email");
    expect(body.format).toBe("text");
  });
});
