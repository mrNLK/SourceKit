// Pure feature-flag + cost-guard helpers for candidate sourcing (no Deno/network imports; unit-tested with Vitest).

export type EnvGetter = (name: string) => string | undefined;

const TRUE_VALUES = ["1", "true", "yes", "on"];

function isTrue(v: string | undefined): boolean {
  return TRUE_VALUES.includes((v || "").trim().toLowerCase());
}

/**
 * Parallel people sourcing (Entity Search people, FindAll people runs, people-profile web search)
 * stays OFF until legal review: Parallel's docs say people results are "not for use in employment,
 * credit, or housing decisions". Set PARALLEL_PEOPLE_SOURCES_ENABLED=true to opt in.
 * Company-level Parallel usage (Extract, company research) is unaffected.
 */
export function isParallelPeopleEnabled(getEnv: EnvGetter): boolean {
  return isTrue(getEnv("PARALLEL_PEOPLE_SOURCES_ENABLED"));
}

/** Apollo people search needs a *master* API key; allow disabling explicitly. */
export function isApolloEnabled(getEnv: EnvGetter): boolean {
  if (!getEnv("APOLLO_API_KEY")) return false;
  const flag = getEnv("APOLLO_SOURCE_ENABLED");
  return flag === undefined || flag.trim() === "" ? true : isTrue(flag);
}

/**
 * Exa self-serve plans cap requests at 25 results; >25 needs Enterprise.
 * EXA_MAX_RESULTS lets us raise it once the plan allows.
 */
export function exaMaxResults(getEnv: EnvGetter): number {
  const n = Number.parseInt(getEnv("EXA_MAX_RESULTS") || "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 25;
}

export function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}
