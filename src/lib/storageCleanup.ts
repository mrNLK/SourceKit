/**
 * Known active localStorage keys used by the app.
 * Any keys with the 'sourcekit' prefix not in this set are considered stale and removed.
 */
const ACTIVE_KEYS = new Set([
  'sourcekit_candidates',
  'sourcekit_search_history',
  'sourcekit_settings',
  'sourcekit_outreach',
  'sourcekit_watchlist',
  'sourcekit_plan',
  'sourcekit_last_search_results',
  'sourcekit_last_strategy',
  'sourcekit-hide-pipelined',
])

/**
 * Remove any stale sourcekit-prefixed localStorage keys that are no longer used.
 * Safe to call on app startup.
 */
export function cleanupStaleStorageKeys(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sourcekit') && !ACTIVE_KEYS.has(key)) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
}
