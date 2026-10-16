// Pick a real profile bio over scraped code-activity text (PR/issue comments, commit messages). Pure; unit-tested.

const CODE_ACTIVITY = /(\bpull request\b|\bmerged\b.*\bcommits?\b|\bcommented\b|\bLGTM\b|^\s*(fix|feat|chore|refactor|docs|test)(\(|:)|```|\bthis PR\b|\bcc @|@[\w-]+ (commented|approved|reviewed)|github\.com\/[^\s/]+\/[^\s/]+\/(pull|issues|commit)\/)/i;

export function looksLikeCodeActivity(text: string | null | undefined): boolean {
  if (!text) return false;
  return CODE_ACTIVITY.test(text);
}

/**
 * Choose the summary to show. GitHub-only candidates use the GitHub profile bio; anyone whose current
 * summary looks like a PR/issue comment falls back to the bio (or nothing).
 */
export function chooseSummary(current: string | null | undefined, githubBio: string | null | undefined, providers: string[]): string | null {
  const bio = (githubBio || "").trim() || null;
  const githubOnly = providers.length > 0 && providers.every((p) => p === "github");
  if (githubOnly) return bio;
  if (looksLikeCodeActivity(current)) return bio;
  return (current || "").trim() || bio;
}
