// Simple in-memory token-bucket rate limiter for edge functions.
// Keyed by (userId, action). Timestamps are pruned on each check.

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  action: string,
  maxPerMinute: number,
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = 60_000;

  let timestamps = buckets.get(key) || [];
  // Prune entries older than the window
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxPerMinute) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}

export function rateLimitResponse(
  result: { allowed: boolean; retryAfterSeconds?: number },
  corsHeaders: Record<string, string>,
): Response | null {
  if (result.allowed) return null;
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      rateLimited: true,
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds || 60),
      },
    },
  );
}
