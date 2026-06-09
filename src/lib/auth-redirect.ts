export const postAuthRedirectStorageKey = "sourcekit:post-auth-redirect";

export function sanitizeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("://")) {
    return fallback;
  }

  return candidate;
}
