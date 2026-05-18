// =============================================================================
// VIZION — In-process rate limiter (sliding-window, per-IP)
// Owner: backend-api.
//
// LIMITATION: This implementation stores counters in a single-process Map.
// It works correctly in single-instance deployments (Railway hobby / starter).
// In multi-instance setups the limit is per-instance, not global.
// To get global rate limiting: add @upstash/ratelimit + @upstash/redis and
// replace the `checkRateLimit` implementation — the public API stays the same.
//
// Used from middleware.ts so it runs in the Edge runtime. The Map survives for
// the lifetime of the Edge worker instance (typically minutes), which is enough
// to deter brute-force attacks at the targeted 5 req/min threshold.
//
// The store is capped at MAX_ENTRIES keys to prevent unbounded memory growth.
// Eviction is LRU-approximate: when the cap is reached, the oldest key is
// deleted before inserting the new one.
// =============================================================================

/** Maximum number of distinct keys tracked in memory. */
const MAX_ENTRIES = 10_000;

interface WindowEntry {
  /** Timestamps (ms) of requests within the current window. */
  hits: number[];
  /** Last time this entry was touched (for LRU eviction). */
  lastSeen: number;
}

const store = new Map<string, WindowEntry>();

/**
 * Delete the oldest entry to stay within MAX_ENTRIES.
 * Map iteration order is insertion order, so the first key is the oldest.
 */
function evictOldest(): void {
  const firstKey = store.keys().next().value;
  if (firstKey !== undefined) {
    store.delete(firstKey);
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed (under the limit). */
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Seconds until the current window resets (approximate). */
  retryAfterSeconds: number;
}

/**
 * Sliding-window rate limit check.
 *
 * @param key         - Unique identifier for the requester, e.g. `"ip:1.2.3.4"`.
 * @param limit       - Maximum number of requests allowed per window.
 * @param windowMs    - Window duration in milliseconds (default 60 000 = 1 min).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);

  if (!entry) {
    if (store.size >= MAX_ENTRIES) evictOldest();
    entry = { hits: [], lastSeen: now };
    store.set(key, entry);
  }

  // Remove hits outside the current window (slide the window).
  entry.hits = entry.hits.filter((t) => t > windowStart);
  entry.lastSeen = now;

  const count = entry.hits.length;

  if (count >= limit) {
    // Oldest hit in window determines when the window will clear.
    const oldestHit = entry.hits[0] ?? now;
    const retryAfterMs = oldestHit + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  entry.hits.push(now);

  return {
    allowed: true,
    remaining: limit - entry.hits.length,
    retryAfterSeconds: 0,
  };
}

// -----------------------------------------------------------------------------
// Configured limits (read from env at module load time)
// -----------------------------------------------------------------------------

/**
 * Auth endpoint limit: requests per minute per IP.
 * Configurable via RATE_LIMIT_AUTH_PER_MIN (default: 5).
 */
export const AUTH_LIMIT_PER_MIN: number = (() => {
  const raw = process.env.RATE_LIMIT_AUTH_PER_MIN;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();
