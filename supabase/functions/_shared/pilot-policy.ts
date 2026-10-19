// Pure pilot policy logic (no Deno/network imports) so it can be unit-tested with Vitest.

export type UsageKind = "search" | "enrich" | "ai";

export const DEFAULT_DAILY_CAPS: Record<UsageKind, number> = {
  search: 25,
  enrich: 150,
  ai: 100,
};

const CAP_ENV: Record<UsageKind, string> = {
  search: "PILOT_DAILY_CAP_SEARCH",
  enrich: "PILOT_DAILY_CAP_ENRICH",
  ai: "PILOT_DAILY_CAP_AI",
};

type EnvGetter = (name: string) => string | undefined;

export function isPilotEnforced(getEnv: EnvGetter): boolean {
  return ["1", "true", "yes", "on"].includes((getEnv("PILOT_MODE") || "").trim().toLowerCase());
}

/** Resolve the default daily cap for a usage kind. "0"/"none"/"unlimited" disables the cap. */
export function resolveDailyCap(kind: UsageKind, getEnv: EnvGetter): number | null {
  const raw = getEnv(CAP_ENV[kind])?.trim().toLowerCase();
  if (!raw) return DEFAULT_DAILY_CAPS[kind];
  if (raw === "none" || raw === "unlimited" || raw === "0") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_CAPS[kind];
}

export interface PilotDecision {
  allowed: boolean;
  status: number;
  body?: { error: string; message: string; used?: number; limit?: number | null; kind?: UsageKind };
}

/** Map the jsonb returned by the pilot_consume SQL function to an HTTP decision. */
export function interpretPilotResult(result: unknown, kind: UsageKind | null): PilotDecision {
  const r = (result ?? {}) as { allowed?: boolean; error?: string; used?: number; limit?: number | null };
  if (r.allowed === true) return { allowed: true, status: 200 };
  if (r.error === "daily_cap_reached") {
    return {
      allowed: false,
      status: 429,
      body: {
        error: "daily_cap_reached",
        message: `Daily ${kind ?? "usage"} limit reached (${r.used ?? "?"}/${r.limit ?? "?"}). Resets at 00:00 UTC.`,
        used: r.used,
        limit: r.limit ?? null,
        kind: kind ?? undefined,
      },
    };
  }
  if (r.error === "not_invited") {
    return {
      allowed: false,
      status: 403,
      body: { error: "not_invited", message: "SourceKit is in a pilot for @aifundpc.com and invited users. Ask Michael for access." },
    };
  }
  // Unknown/failed result: fail closed.
  return { allowed: false, status: 503, body: { error: "pilot_check_failed", message: "Access check failed, try again." } };
}
