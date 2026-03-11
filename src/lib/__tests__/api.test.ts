import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these exist before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Stub import.meta.env
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

import {
  searchDevelopers,
  searchDevelopersStreaming,
  loadSearchResults,
  getDeveloperProfile,
  enrichLinkedIn,
  generateOutreach,
  notifyStageChange,
} from "../api";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSession(token = "test-token") {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: token } },
  });
}

function mockNoSession() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("api module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  // ─── Authentication ─────────────────────────────────────────────

  describe("authentication", () => {
    it("throws when no session exists (searchDevelopers)", async () => {
      mockNoSession();
      await expect(searchDevelopers("react devs")).rejects.toThrow(
        "Authentication required",
      );
    });

    it("throws when no session exists (searchDevelopersStreaming)", async () => {
      mockNoSession();
      await expect(
        searchDevelopersStreaming("react devs", undefined, vi.fn()),
      ).rejects.toThrow("Authentication required");
    });
  });

  // ─── searchDevelopers ───────────────────────────────────────────

  describe("searchDevelopers", () => {
    it("calls GET with query param when no options provided", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
            reposSearched: [],
          }),
      });

      await searchDevelopers("react devs");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as Mock).mock.calls[0];
      expect(url).toContain("github-search?q=react+devs");
      // GET requests have no body
      expect(init.body).toBeUndefined();
    });

    it("calls POST with body when options have targetRepos", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
            reposSearched: [],
          }),
      });

      await searchDevelopers("go devs", {
        targetRepos: ["org/repo"],
        skills: ["Go"],
      });

      const [, init] = (global.fetch as Mock).mock.calls[0];
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.query).toBe("go devs");
      expect(body.targetRepos).toEqual(["org/repo"]);
      expect(body.skills).toEqual(["Go"]);
    });

    it("calls POST when hideUngettable is true", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
            reposSearched: [],
          }),
      });

      await searchDevelopers("react devs", { hideUngettable: true });

      const [, init] = (global.fetch as Mock).mock.calls[0];
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.hideUngettable).toBe(true);
    });

    it("calls POST when hideUngettable is false", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
            reposSearched: [],
          }),
      });

      await searchDevelopers("react devs", { hideUngettable: false });

      const [, init] = (global.fetch as Mock).mock.calls[0];
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.hideUngettable).toBe(false);
    });

    it("calls GET when hideUngettable is undefined (no options)", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            parsedCriteria: { repos: [], skills: [], location: null, seniority: null },
            reposSearched: [],
          }),
      });

      await searchDevelopers("react devs");

      const [url, init] = (global.fetch as Mock).mock.calls[0];
      expect(url).toContain("github-search?q=react+devs");
      expect(init.body).toBeUndefined();
    });
  });

  // ─── Error handling ─────────────────────────────────────────────

  describe("error handling", () => {
    it("throws RATE_LIMITED on 429 response", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ rateLimited: true, retryAfterSeconds: 30 }),
      });

      await expect(searchDevelopers("test")).rejects.toThrow("RATE_LIMITED");
    });

    it("attaches retryAfterSeconds to RATE_LIMITED error", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ rateLimited: true, retryAfterSeconds: 45 }),
      });

      try {
        await searchDevelopers("test");
      } catch (e: any) {
        expect(e.message).toBe("RATE_LIMITED");
        expect(e.retryAfterSeconds).toBe(45);
      }
    });

    it("throws TRIAL_LIMIT_REACHED on 402 response", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.resolve({ error: "trial_limit_reached" }),
      });

      await expect(searchDevelopers("test")).rejects.toThrow(
        "TRIAL_LIMIT_REACHED",
      );
    });

    it("throws generic error with server message", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      });

      await expect(searchDevelopers("test")).rejects.toThrow(
        "Internal server error",
      );
    });

    it("falls back to HTTP status when json parse fails", async () => {
      mockSession();
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("not json")),
      });

      await expect(searchDevelopers("test")).rejects.toThrow("Request failed");
    });
  });

  // ─── loadSearchResults ──────────────────────────────────────────

  describe("loadSearchResults", () => {
    it("returns empty results when no data is returned", async () => {
      mockSession();
      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const res = await loadSearchResults("search-123");
      expect(res.results).toEqual([]);
      expect(res.searchId).toBe("search-123");
    });

    it("throws when supabase returns an error", async () => {
      mockSession();
      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
      });

      await expect(loadSearchResults("bad-id")).rejects.toThrow("DB error");
    });

    it("maps candidate fields correctly", async () => {
      mockSession();
      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              rank: 1,
              score: 85,
              candidate: {
                id: "c1",
                github_username: "alice",
                name: "Alice Chen",
                avatar_url: "https://example.com/avatar.png",
                bio: "Short bio",
                about: "Long about",
                summary: "Summary text",
                location: "San Francisco",
                followers: 1200,
                public_repos: 45,
                stars: 500,
                top_languages: [{ name: "TypeScript", percentage: 60 }],
                highlights: ["Built X"],
                score: 80,
                is_hidden_gem: true,
                joined_year: 2018,
                contributed_repos: { "org/repo": 10 },
                linkedin_url: "https://linkedin.com/in/alice",
                twitter_username: "alice_dev",
                email: "alice@example.com",
                github_url: "https://github.com/alice",
              },
            },
          ],
          error: null,
        }),
      });

      const res = await loadSearchResults("s1");
      expect(res.results).toHaveLength(1);
      const dev = res.results[0];
      expect(dev.username).toBe("alice");
      expect(dev.name).toBe("Alice Chen");
      expect(dev.score).toBe(85); // row.score takes precedence
      expect(dev.hiddenGem).toBe(true);
      expect(dev.bio).toBe("Summary text"); // summary preferred over bio
    });
  });

  // ─── notifyStageChange ──────────────────────────────────────────

  describe("notifyStageChange", () => {
    it("rejects on failure so caller can handle the error", async () => {
      mockSession();
      (global.fetch as Mock).mockRejectedValue(new Error("network error"));

      await expect(
        notifyStageChange({
          github_username: "alice",
          to_stage: "contacted",
        }),
      ).rejects.toThrow("network error");
    });
  });
});
