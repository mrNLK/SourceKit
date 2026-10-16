// Deterministic "hidden gem" / "ungettable" / bot classification for GitHub search results.
// Pure (no Deno/network imports) so it is unit-tested with Vitest.
//
// Before this module, hidden gem was whatever the LLM returned (non-deterministic, and the
// stars>50 fallback used stars on the person's OWN repos, not their contributions), and
// ungettable fired at >=500 followers while the LLM prompt said >10K, hiding most
// well-known-but-recruitable ICs by default. Bots were labelled "AI flagged as unlikely to be recruited".

export const GEM_MAX_FOLLOWERS = 300;
export const GEM_MIN_SCORE = 70;
export const GEM_MIN_CONTRIBUTIONS = 200;
export const GEM_MIN_OWN_STARS = 100;
export const UNGETTABLE_FOLLOWERS = 10_000;

/** Current executive/founder titles. "Founding engineer" is not matched. */
const EXEC_TITLE = /\b(co-?founder|founder|ceo|chief [a-z]+ officer|cto|coo|cfo|vp|vice president|managing partner|general partner|venture partner|president|board member|board director|member of the board|board of directors|board advisor|advisory board member|non-executive director|chair(?:man|woman|person)? of the board)\b/i;
/** Past-tense context right before the title: "ex-CTO", "former founder of", "previously VP". */
const PAST_CONTEXT = /\b(ex|former(ly)?|previously|prev|past)[\s-]+(a\s+|an\s+)?$/i;

export interface FlagInput {
  username: string;
  bio?: string | null;
  followers?: number | null;
  stars?: number | null;
  score?: number | null;
  totalContributions?: number | null;
  recruitable?: boolean | null; // LLM opinion; undefined on cache hits
  type?: string | null; // GitHub account type ("Bot")
}

export interface Flags {
  isBot: boolean;
  hiddenGem: boolean;
  ungettable: boolean;
  ungettableReason: string | null;
}

export function isBotAccount(c: Pick<FlagInput, "username" | "type">): boolean {
  if ((c.type || "").toLowerCase() === "bot") return true;
  return /(\[bot\]$|[-_]?bot$|^dependabot|^renovate|^github-actions)/i.test(c.username || "");
}

/** Returns the matched current exec title, ignoring past roles ("ex-CTO", "former founder"). */
export function currentExecTitle(bio: string | null | undefined): string | null {
  const text = bio || "";
  const re = new RegExp(EXEC_TITLE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 20), m.index);
    if (!PAST_CONTEXT.test(before)) return m[0];
  }
  return null;
}

export function contributionsOf(contributedRepos: Record<string, number> | null | undefined): number {
  return Object.values(contributedRepos || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function classifyCandidate(c: FlagInput): Flags {
  const followers = c.followers || 0;
  if (isBotAccount(c)) {
    return { isBot: true, hiddenGem: false, ungettable: false, ungettableReason: null };
  }
  let ungettableReason: string | null = null;
  const title = currentExecTitle(c.bio);
  if (followers >= UNGETTABLE_FOLLOWERS) ungettableReason = `${followers.toLocaleString("en-US")} followers: likely industry leader`;
  else if (title) ungettableReason = `Bio lists a current ${title} role`;
  else if (c.recruitable === false) ungettableReason = "AI flagged as unlikely to be recruited";
  const ungettable = ungettableReason !== null;

  const strongOutput = (c.totalContributions || 0) >= GEM_MIN_CONTRIBUTIONS || (c.stars || 0) >= GEM_MIN_OWN_STARS;
  const hiddenGem = !ungettable && followers < GEM_MAX_FOLLOWERS && (c.score || 0) >= GEM_MIN_SCORE && strongOutput;

  return { isBot: false, hiddenGem, ungettable, ungettableReason };
}

// ---------------------------------------------------------------------------
// People Search (source-candidates / deep search). These candidates come from Exa,
// Harmonic, Parallel and GitHub user search, so there is no repo-contribution data or
// LLM fit score. Rules use what is reliably present:
//   ungettable: current exec/founder title in current_title or headline, or >=10K GitHub followers.
//   hidden gem: has a GitHub account with real output (>= PERSON_GEM_MIN_REPOS public repos)
//               but low visibility (< GEM_MAX_FOLLOWERS followers), not ungettable, and a decent
//               sourcing score. Without GitHub data we never call someone a gem (no evidence).
// ---------------------------------------------------------------------------

export const PERSON_GEM_MIN_REPOS = 10;
export const PERSON_GEM_MIN_SOURCING_SCORE = 50;

export interface PersonFlagInput {
  currentTitle?: string | null;
  headline?: string | null;
  githubLogin?: string | null;
  githubFollowers?: number | null; // null/undefined = unknown
  githubPublicRepos?: number | null;
  githubType?: string | null;
  sourcingScore?: number | null;
}

export function classifyPerson(p: PersonFlagInput): Flags {
  if (p.githubLogin && isBotAccount({ username: p.githubLogin, type: p.githubType })) {
    return { isBot: true, hiddenGem: false, ungettable: false, ungettableReason: null };
  }
  const followers = p.githubFollowers ?? null;
  const title = currentExecTitle(p.currentTitle) || currentExecTitle(p.headline);
  let ungettableReason: string | null = null;
  if (title) ungettableReason = `Current ${title} role`;
  else if (followers !== null && followers >= UNGETTABLE_FOLLOWERS) ungettableReason = `${followers.toLocaleString("en-US")} GitHub followers: likely industry leader`;
  const ungettable = ungettableReason !== null;
  const hiddenGem = !ungettable && !!p.githubLogin && followers !== null && followers < GEM_MAX_FOLLOWERS &&
    (p.githubPublicRepos || 0) >= PERSON_GEM_MIN_REPOS && (p.sourcingScore || 0) >= PERSON_GEM_MIN_SOURCING_SCORE;
  return { isBot: false, hiddenGem, ungettable, ungettableReason };
}
