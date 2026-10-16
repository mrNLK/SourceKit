/* eslint-disable @typescript-eslint/no-explicit-any -- provider payloads are untyped JSON */
// Unified candidate model + per-provider mappers. Pure: no Deno/network imports.

export type Provider =
  | "github"
  | "exa"
  | "exa_webset"
  | "parallel_entity"
  | "parallel_findall"
  | "parallel_search"
  | "apollo"
  | "harmonic";

export interface SourceHit {
  provider: Provider;
  externalId?: string | null;
  url?: string | null;
  rank?: number | null;
  rawScore?: number | null;
  snippet?: string | null;
}

export interface UnifiedCandidate {
  fullName: string;
  headline?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  companyDomain?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubLogin?: string | null;
  apolloId?: string | null;
  harmonicUrn?: string | null;
  emails: string[];
  profileUrls: string[];
  summary?: string | null;
  avatarUrl?: string | null;
  sources: SourceHit[];
}

export function emptyCandidate(fullName: string, hit: SourceHit): UnifiedCandidate {
  return { fullName: fullName.trim(), emails: [], profileUrls: hit.url ? [hit.url] : [], sources: [hit] };
}

/** Normalize to https://www.linkedin.com/in/<slug> (lowercased, no query/trailing slash). Null if not a profile URL. */
export function normalizeLinkedinUrl(url: string | null | undefined): string | null {
  const slug = linkedinSlug(url);
  return slug ? `https://www.linkedin.com/in/${slug}` : null;
}

export function linkedinSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).trim().match(/linkedin\.com\/(?:in|pub)\/([^/?#\s]+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
}

const GITHUB_RESERVED = new Set([
  "orgs", "topics", "search", "features", "about", "pricing", "login", "join", "sponsors", "marketplace",
  "explore", "settings", "collections", "trending", "enterprise", "apps", "site", "readme",
]);

/** Extract a GitHub login from a profile URL (not a repo URL). */
export function githubLoginFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).trim().match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?(?:[?#].*)?$/i);
  if (!m) return null;
  const login = m[1].toLowerCase();
  return GITHUB_RESERVED.has(login) ? null : login;
}

export function normalizeEmail(e: string | null | undefined): string | null {
  if (!e) return null;
  const v = e.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export function normalizeDomain(d: string | null | undefined): string | null {
  if (!d) return null;
  const v = String(d).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return v.includes(".") ? v : null;
}

/** Fill linkedin/github identity fields from any profile URL the candidate carries. */
export function deriveIdentities(c: UnifiedCandidate): UnifiedCandidate {
  const out = { ...c, emails: [...new Set(c.emails.map(normalizeEmail).filter(Boolean) as string[])] };
  out.linkedinUrl = normalizeLinkedinUrl(c.linkedinUrl) ?? null;
  out.githubLogin = c.githubLogin ? c.githubLogin.toLowerCase() : null;
  for (const u of c.profileUrls) {
    if (!out.linkedinUrl) out.linkedinUrl = normalizeLinkedinUrl(u);
    if (!out.githubLogin) out.githubLogin = githubLoginFromUrl(u);
  }
  out.companyDomain = normalizeDomain(c.companyDomain);
  return out;
}

/**
 * Parse LinkedIn-style titles: "Jane Doe - Staff Engineer - Acme | LinkedIn",
 * "Jane Doe – Staff Engineer at Acme". Returns best-effort parts.
 */
export function parseProfileTitle(title: string | null | undefined): { name: string; title?: string; company?: string } {
  const raw = (title || "").replace(/\s*[|·]\s*LinkedIn.*$/i, "").trim();
  const parts = raw.split(/\s+[-–—|]\s+/).map((p) => p.trim()).filter(Boolean);
  const name = parts[0] || raw;
  let role = parts[1];
  let company = parts[2];
  if (role && !company) {
    const at = role.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
    if (at) {
      role = at[1];
      company = at[2];
    }
  }
  return { name, title: role, company };
}

// ---------- provider mappers ----------

export function fromExaResult(r: Record<string, any>, rank: number, provider: Provider = "exa"): UnifiedCandidate | null {
  const url = typeof r.url === "string" ? r.url : null;
  const parsed = parseProfileTitle(r.title || r.author);
  if (!parsed.name) return null;
  const c = emptyCandidate(parsed.name, {
    provider,
    url,
    externalId: r.id ?? url,
    rank,
    rawScore: typeof r.score === "number" ? r.score : null,
    snippet: Array.isArray(r.highlights) && r.highlights.length ? String(r.highlights[0]) : (r.summary || r.text || "").slice(0, 300) || null,
  });
  c.currentTitle = parsed.title ?? null;
  c.currentCompany = parsed.company ?? null;
  c.summary = r.summary || (typeof r.text === "string" ? r.text.slice(0, 1000) : null);
  c.avatarUrl = r.image || null;
  return deriveIdentities(c);
}

export function fromParallelEntity(e: Record<string, any>, rank: number): UnifiedCandidate | null {
  const parsed = parseProfileTitle(e.name);
  if (!parsed.name) return null;
  const c = emptyCandidate(parsed.name, { provider: "parallel_entity", url: e.url ?? null, externalId: e.url ?? null, rank, snippet: e.description ?? null });
  c.summary = e.description ?? null;
  c.currentTitle = parsed.title ?? null;
  c.currentCompany = parsed.company ?? null;
  return deriveIdentities(c);
}

export function fromParallelFindAllCandidate(cand: Record<string, any>, rank: number): UnifiedCandidate | null {
  if (!cand?.name) return null;
  const out = (cand.output || {}) as Record<string, any>;
  const val = (k: string) => {
    const v = out[k];
    return v && typeof v === "object" && "value" in v ? v.value : v;
  };
  const c = emptyCandidate(String(cand.name), {
    provider: "parallel_findall",
    url: cand.url ?? null,
    externalId: cand.candidate_id ?? null,
    rank,
    snippet: cand.description ?? null,
  });
  c.currentTitle = val("current_title") ?? null;
  c.currentCompany = val("current_company") ?? null;
  c.summary = cand.description ?? val("notable_work") ?? null;
  const li = val("linkedin_url");
  const gh = val("github_url");
  if (typeof li === "string") c.profileUrls.push(li);
  if (typeof gh === "string") c.profileUrls.push(gh);
  return deriveIdentities(c);
}

export function fromExaWebsetItem(item: Record<string, any>, rank: number): UnifiedCandidate | null {
  const p = item?.properties || {};
  const person = p.person || {};
  const name = person.name || parseProfileTitle(p.description).name;
  if (!name) return null;
  const c = emptyCandidate(name, { provider: "exa_webset", url: p.url ?? null, externalId: item.id ?? null, rank, snippet: p.description ?? null });
  c.currentTitle = person.position ?? null;
  c.currentCompany = person.company?.name ?? null;
  c.location = person.location ?? null;
  c.avatarUrl = person.pictureUrl ?? null;
  c.summary = p.description ?? null;
  return deriveIdentities(c);
}

export function fromApolloPerson(p: Record<string, any>, rank: number): UnifiedCandidate | null {
  const name = p.name || [p.first_name, p.last_name || p.last_name_obfuscated].filter(Boolean).join(" ");
  if (!name) return null;
  const c = emptyCandidate(name, { provider: "apollo", externalId: p.id ?? null, url: p.linkedin_url ?? null, rank, snippet: p.title ?? null });
  c.apolloId = p.id ?? null;
  c.currentTitle = p.title ?? null;
  c.currentCompany = p.organization?.name ?? null;
  c.companyDomain = p.organization?.primary_domain ?? p.organization?.website_url ?? null;
  c.location = [p.city, p.state, p.country].filter(Boolean).join(", ") || null;
  c.linkedinUrl = p.linkedin_url ?? null;
  c.avatarUrl = p.photo_url ?? null;
  if (p.email && p.email_status !== "unavailable") c.emails.push(p.email);
  return deriveIdentities(c);
}

export function fromGithubUser(u: Record<string, any>, rank: number): UnifiedCandidate | null {
  if (!u?.login) return null;
  const c = emptyCandidate(u.name || u.login, { provider: "github", externalId: String(u.id ?? u.login), url: u.html_url ?? null, rank, rawScore: u.score ?? null });
  c.githubLogin = u.login;
  c.location = u.location ?? null;
  c.currentCompany = u.company ? String(u.company).replace(/^@/, "") : null;
  c.summary = u.bio ?? null;
  c.avatarUrl = u.avatar_url ?? null;
  if (u.email) c.emails.push(u.email);
  if (u.blog) c.profileUrls.push(u.blog);
  return deriveIdentities(c);
}
