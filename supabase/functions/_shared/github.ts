/**
 * Shared GitHub API client with multi-token rotation.
 *
 * Set the env var GITHUB_TOKENS to a comma-separated list of PATs to spread
 * requests across multiple tokens (each gets 5 000 req/hr). Falls back to a
 * single GITHUB_TOKEN if GITHUB_TOKENS is not set.
 */

const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Token pool
// ---------------------------------------------------------------------------

interface TokenSlot {
  token: string;
  rateLimitedUntil: number; // epoch-ms; 0 = not limited
}

function buildTokenPool(): TokenSlot[] {
  const multi = (Deno.env.get('GITHUB_TOKENS') || '').split(',').map(t => t.trim()).filter(Boolean);
  const single = Deno.env.get('GITHUB_TOKEN')?.trim();

  const raw = multi.length > 0 ? multi : single ? [single] : [];
  // Deduplicate tokens (in case same token appears twice)
  const unique = [...new Set(raw)];
  return unique.map(token => ({ token, rateLimitedUntil: 0 }));
}

const tokenPool: TokenSlot[] = buildTokenPool();
let roundRobin = 0;

/**
 * Pick the best available token. Prefers tokens that are NOT rate-limited.
 * Among available tokens, round-robins. If every token is limited, returns
 * the one whose limit resets soonest (caller will backoff/wait).
 */
function pickToken(): TokenSlot | null {
  if (tokenPool.length === 0) return null;

  const now = Date.now();
  const available = tokenPool.filter(t => t.rateLimitedUntil <= now);

  if (available.length > 0) {
    const slot = available[roundRobin % available.length];
    roundRobin++;
    return slot;
  }

  // All limited – return the one that resets soonest
  return tokenPool.reduce((a, b) => a.rateLimitedUntil < b.rateLimitedUntil ? a : b);
}

function markRateLimited(slot: TokenSlot, resetEpochSec: number | null) {
  if (resetEpochSec) {
    slot.rateLimitedUntil = resetEpochSec * 1000;
  } else {
    // Fallback: mark limited for 60 s
    slot.rateLimitedUntil = Date.now() + 60_000;
  }
}

// ---------------------------------------------------------------------------
// Public fetch helper
// ---------------------------------------------------------------------------

export async function githubFetch(url: string, attempt = 0): Promise<any> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SourceKit-App',
  };

  const slot = pickToken();
  if (slot) {
    headers['Authorization'] = `Bearer ${slot.token}`;
  }

  const res = await fetch(url, { headers });

  // ---- Rate-limit handling ----
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0' || res.status === 429) {
      const resetHeader = res.headers.get('x-ratelimit-reset');
      const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : null;

      // Mark THIS token as limited so the pool rotates to a different one
      if (slot) markRateLimited(slot, resetEpoch);

      // Check if another token is available right now
      const altSlot = pickToken();
      const altAvailable = altSlot && altSlot.rateLimitedUntil <= Date.now() && altSlot !== slot;

      if (altAvailable && attempt < MAX_RETRIES) {
        // Retry immediately with a different token (no backoff needed)
        console.log(`GitHub token rate-limited, rotating to another token (attempt ${attempt + 1})`);
        return githubFetch(url, attempt + 1);
      }

      if (attempt >= MAX_RETRIES) {
        const retryAfter = resetEpoch
          ? Math.max(Math.ceil((resetEpoch * 1000 - Date.now()) / 1000), 10)
          : 60;
        const err = new Error('RATE_LIMITED');
        (err as any).retryAfterSeconds = retryAfter;
        throw err;
      }

      // All tokens limited – wait for the shortest reset
      let waitMs: number;
      if (resetEpoch) {
        waitMs = Math.max(resetEpoch * 1000 - Date.now(), 1000);
        waitMs = Math.min(waitMs, 60_000); // cap 60 s
      } else {
        waitMs = Math.pow(2, attempt) * 1000;
      }
      waitMs += Math.random() * 500; // jitter

      console.log(`GitHub rate limited (all tokens), retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(waitMs)}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      return githubFetch(url, attempt + 1);
    }
  }

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} for ${url}`);
    return null;
  }

  return res.json();
}

/** How many tokens are in the pool (useful for logging). */
export function getTokenCount(): number {
  return tokenPool.length;
}
