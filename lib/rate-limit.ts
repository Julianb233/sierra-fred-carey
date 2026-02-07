/**
 * Simple in-memory sliding window rate limiter
 *
 * IP-based tracking with configurable window and max requests.
 * Expired entries are cleaned up automatically.
 *
 * For production at scale, replace with Redis / Upstash Rate Limit.
 */

interface RateLimiterOptions {
  /** Sliding window size in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  max: number;
}

interface WindowEntry {
  timestamps: number[];
}

export class RateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly store = new Map<string, WindowEntry>();
  private lastCleanup = Date.now();

  /** Run cleanup at most once per minute */
  private static readonly CLEANUP_INTERVAL_MS = 60_000;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  /**
   * Check whether the given identifier (typically an IP address) is within
   * the rate limit.  Returns `true` if the request is allowed, `false` if it
   * should be rejected (429).
   *
   * Each call that returns `true` counts as a consumed request.
   */
  check(identifier: string): boolean {
    const now = Date.now();
    this.maybeCleanup(now);

    let entry = this.store.get(identifier);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(identifier, entry);
    }

    // Slide the window: keep only timestamps within the current window
    const cutoff = now - this.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.max) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private maybeCleanup(now: number): void {
    if (now - this.lastCleanup < RateLimiter.CLEANUP_INTERVAL_MS) return;
    this.lastCleanup = now;

    const cutoff = now - this.windowMs;
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}
