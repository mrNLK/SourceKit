// Candidate dedup + merge. Pure.
// Match order: LinkedIn slug, GitHub login, Apollo ID, Harmonic URN, email, then fuzzy name + (company or domain).
import { linkedinSlug, type UnifiedCandidate } from "./candidate.ts";

export function normalizeName(n: string): string {
  return n
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(dr|mr|mrs|ms|phd|jr|sr|ii|iii)\b\.?/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompany(c: string | null | undefined): string {
  return (c || "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|gmbh|labs?|technologies|technology|ai|hq)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array(a.length).fill(false);
  const bm = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (!bm[j] && a[i] === b[j]) {
        am[i] = bm[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - t / 2) / m) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export const FUZZY_NAME_THRESHOLD = 0.92;

export function identityKeys(c: UnifiedCandidate): string[] {
  const keys: string[] = [];
  const li = linkedinSlug(c.linkedinUrl);
  if (li) keys.push(`li:${li}`);
  if (c.githubLogin) keys.push(`gh:${c.githubLogin.toLowerCase()}`);
  if (c.apolloId) keys.push(`ap:${c.apolloId}`);
  if (c.harmonicUrn) keys.push(`hm:${c.harmonicUrn}`);
  for (const e of c.emails) keys.push(`em:${e.toLowerCase()}`);
  return keys;
}

/** Fuzzy: similar names AND same company (normalized) or same company domain. Never matches on name alone. */
export function isFuzzyMatch(a: UnifiedCandidate, b: UnifiedCandidate): boolean {
  const na = normalizeName(a.fullName);
  const nb = normalizeName(b.fullName);
  if (!na || !nb) return false;
  // Conflicting hard identities => different people.
  const la = linkedinSlug(a.linkedinUrl);
  const lb = linkedinSlug(b.linkedinUrl);
  if (la && lb && la !== lb) return false;
  if (a.githubLogin && b.githubLogin && a.githubLogin.toLowerCase() !== b.githubLogin.toLowerCase()) return false;
  if (jaroWinkler(na, nb) < FUZZY_NAME_THRESHOLD) return false;
  if (a.companyDomain && b.companyDomain) return a.companyDomain === b.companyDomain;
  const ca = normalizeCompany(a.currentCompany);
  const cb = normalizeCompany(b.currentCompany);
  return !!ca && ca === cb;
}

function pick<T>(a: T | null | undefined, b: T | null | undefined): T | null {
  return (a ?? null) !== null && a !== "" ? (a as T) : (b ?? null);
}

/** Merge b into a. a's non-empty fields win (callers order inputs by provider confidence). */
export function mergeInto(a: UnifiedCandidate, b: UnifiedCandidate): UnifiedCandidate {
  const longerName = b.fullName.length > a.fullName.length && normalizeName(b.fullName).startsWith(normalizeName(a.fullName).split(" ")[0])
    ? b.fullName
    : a.fullName;
  return {
    fullName: longerName,
    headline: pick(a.headline, b.headline),
    currentTitle: pick(a.currentTitle, b.currentTitle),
    currentCompany: pick(a.currentCompany, b.currentCompany),
    companyDomain: pick(a.companyDomain, b.companyDomain),
    location: pick(a.location, b.location),
    linkedinUrl: pick(a.linkedinUrl, b.linkedinUrl),
    githubLogin: pick(a.githubLogin, b.githubLogin),
    apolloId: pick(a.apolloId, b.apolloId),
    harmonicUrn: pick(a.harmonicUrn, b.harmonicUrn),
    emails: [...new Set([...a.emails, ...b.emails])],
    profileUrls: [...new Set([...a.profileUrls, ...b.profileUrls])],
    summary: pick(a.summary, b.summary),
    avatarUrl: pick(a.avatarUrl, b.avatarUrl),
    sources: [...a.sources, ...b.sources],
  };
}

/** Dedup a list of candidates. Order matters: earlier entries win field conflicts. */
export function dedupCandidates(input: UnifiedCandidate[]): UnifiedCandidate[] {
  const out: UnifiedCandidate[] = [];
  const index = new Map<string, number>();
  for (const cand of input) {
    let target = -1;
    for (const k of identityKeys(cand)) {
      const hit = index.get(k);
      if (hit !== undefined) {
        target = hit;
        break;
      }
    }
    if (target === -1) target = out.findIndex((o) => isFuzzyMatch(o, cand));
    if (target === -1) {
      out.push(cand);
      target = out.length - 1;
    } else {
      out[target] = mergeInto(out[target], cand);
    }
    for (const k of identityKeys(out[target])) index.set(k, target);
  }
  return out;
}

/** Simple sourcing rank: multi-source agreement + best rank + identity/contact completeness. */
export function sourcingScore(c: UnifiedCandidate): number {
  const providers = new Set(c.sources.map((s) => s.provider));
  const bestRank = Math.min(...c.sources.map((s) => (typeof s.rank === "number" ? s.rank : 50)));
  let score = 40 + Math.max(0, 30 - bestRank); // up to 70 from rank
  score += Math.min(3, providers.size - 1) * 8; // agreement bonus up to 24
  if (c.linkedinUrl) score += 3;
  if (c.githubLogin) score += 3;
  if (c.emails.length) score += 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}
