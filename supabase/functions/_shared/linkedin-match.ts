// Deterministic guardrails for GitHub -> LinkedIn matching. Pure functions (testable in vitest and Deno).

export type Confidence = "high" | "medium" | "low";

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

export function nameTokens(name: string): string[] {
  return norm(name).split(/[\s-]+/).filter((t) => t.length > 1);
}

/** Name portion of a LinkedIn result title like "Richard Zhou - Software Engineer - Meta | LinkedIn". */
export function linkedinTitleName(title: string): string {
  return (title || "").split(/\s[-|–—]\s|\|/)[0].trim();
}

/** Name hint from a /in/ slug: "richard-zhou-2259b81" -> "richard zhou". */
export function slugName(url: string): string {
  const m = (url || "").match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!m) return "";
  return decodeURIComponent(m[1]).split("-").filter((p) => !/\d/.test(p)).join(" ");
}

/**
 * 0..1 similarity between a GitHub display name and a LinkedIn name.
 * Requires the surname (last token) to match exactly; first-name prefixes (Rich/Richard) count.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const lastA = ta[ta.length - 1], lastB = tb[tb.length - 1];
  const surnameMatch = lastA === lastB || tb.includes(lastA) || ta.includes(lastB);
  if (!surnameMatch) return 0;
  const firstA = ta[0], firstB = tb[0];
  const firstMatch = firstA === firstB || (firstA.length >= 3 && firstB.startsWith(firstA)) || (firstB.length >= 3 && firstA.startsWith(firstB));
  if (ta.length === 1 || tb.length === 1) return 0.5; // single-token name: weak
  return firstMatch ? 1 : 0.4;
}

/** True if the GitHub display name looks like a real person name (not a handle). */
export function looksLikeRealName(name: string | null | undefined, username: string): boolean {
  if (!name) return false;
  const t = nameTokens(name);
  return t.length >= 2 && norm(name).replace(/\s/g, "") !== norm(username).replace(/\s/g, "");
}

export interface MatchCandidate { url: string; title?: string; text?: string }
export interface GithubIdentity { username: string; name?: string | null; company?: string | null; location?: string | null }

export interface MatchAssessment { score: number; confidence: Confidence; signals: string[] }

/** Score one LinkedIn result against the GitHub identity using name + corroborating evidence. */
export function assessMatch(c: MatchCandidate, gh: GithubIdentity): MatchAssessment {
  const signals: string[] = [];
  if (!/linkedin\.com\/in\//i.test(c.url || "")) return { score: 0, confidence: "low", signals: ["not a profile URL"] };
  const liName = linkedinTitleName(c.title || "") || slugName(c.url);
  const ghName = looksLikeRealName(gh.name, gh.username) ? gh.name! : "";
  const sim = ghName ? Math.max(nameSimilarity(ghName, liName), nameSimilarity(ghName, slugName(c.url))) : 0;
  if (sim >= 1) signals.push("name match");
  else if (sim > 0) signals.push("partial name match");

  const hay = norm(`${c.title || ""} ${c.text || ""}`);
  const company = norm((gh.company || "").replace(/^@/, ""));
  const companyHit = company.length >= 2 && company.split(" ").some((w) => w.length >= 3 && hay.includes(w));
  if (companyHit) signals.push("company match");
  const handle = norm(gh.username);
  const ghHit = hay.includes(`github com ${handle}`) || (handle.length >= 5 && hay.includes(handle));
  if (ghHit) signals.push("github handle on profile");
  const city = norm((gh.location || "").split(",")[0]);
  const locHit = city.length >= 3 && hay.includes(city);
  if (locHit) signals.push("location match");

  let score = sim * 0.6 + (companyHit ? 0.25 : 0) + (ghHit ? 0.35 : 0) + (locHit ? 0.1 : 0);
  if (sim === 0 && !ghHit) score = Math.min(score, 0.2); // never trust a different name without the handle
  const confidence: Confidence = score >= 0.85 ? "high" : score >= 0.6 && (sim >= 1 || ghHit) ? "medium" : "low";
  return { score, confidence, signals };
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
export const minConfidence = (a: Confidence, b: Confidence): Confidence => (RANK[a] <= RANK[b] ? a : b);
export const isShowable = (c: Confidence | null | undefined) => c === "high" || c === "medium";
