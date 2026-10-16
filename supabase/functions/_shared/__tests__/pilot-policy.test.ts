import { describe, it, expect } from "vitest";
import {
  DEFAULT_DAILY_CAPS,
  interpretPilotResult,
  isPilotEnforced,
  resolveDailyCap,
} from "../pilot-policy";

const env = (vars: Record<string, string>) => (name: string) => vars[name];

describe("isPilotEnforced", () => {
  it("is off by default", () => expect(isPilotEnforced(env({}))).toBe(false));
  it.each(["true", "TRUE", "1", "yes", " on "])("accepts %s", (v) =>
    expect(isPilotEnforced(env({ PILOT_MODE: v }))).toBe(true));
  it("rejects other values", () => expect(isPilotEnforced(env({ PILOT_MODE: "false" }))).toBe(false));
});

describe("resolveDailyCap", () => {
  it("uses defaults when unset", () => {
    expect(resolveDailyCap("search", env({}))).toBe(DEFAULT_DAILY_CAPS.search);
    expect(resolveDailyCap("enrich", env({}))).toBe(DEFAULT_DAILY_CAPS.enrich);
    expect(resolveDailyCap("ai", env({}))).toBe(DEFAULT_DAILY_CAPS.ai);
  });
  it("reads overrides", () => expect(resolveDailyCap("search", env({ PILOT_DAILY_CAP_SEARCH: "5" }))).toBe(5));
  it.each(["0", "none", "unlimited"])("treats %s as unlimited", (v) =>
    expect(resolveDailyCap("enrich", env({ PILOT_DAILY_CAP_ENRICH: v }))).toBeNull());
  it("falls back to default on garbage", () =>
    expect(resolveDailyCap("ai", env({ PILOT_DAILY_CAP_AI: "abc" }))).toBe(DEFAULT_DAILY_CAPS.ai));
});

describe("interpretPilotResult", () => {
  it("allows", () => expect(interpretPilotResult({ allowed: true, used: 3, limit: 25 }, "search")).toEqual({ allowed: true, status: 200 }));
  it("blocks users not on the allowlist with 403", () => {
    const d = interpretPilotResult({ allowed: false, error: "not_invited" }, null);
    expect(d.allowed).toBe(false);
    expect(d.status).toBe(403);
    expect(d.body?.error).toBe("not_invited");
  });
  it("returns 429 with usage when the daily cap is hit", () => {
    const d = interpretPilotResult({ allowed: false, error: "daily_cap_reached", used: 25, limit: 25 }, "search");
    expect(d.status).toBe(429);
    expect(d.body).toMatchObject({ error: "daily_cap_reached", used: 25, limit: 25, kind: "search" });
    expect(d.body?.message).toContain("25/25");
  });
  it.each([null, undefined, {}, { allowed: "yes" }])("fails closed on %p", (r) => {
    const d = interpretPilotResult(r, "enrich");
    expect(d.allowed).toBe(false);
    expect(d.status).toBe(503);
  });
});
