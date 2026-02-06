/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter using sliding window algorithm.
 * For production, consider using Redis or Upstash Rate Limit.
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Identifier type for rate limiting */
  identifier?: "ip" | "user" | "both";
  /** Custom identifier extraction function */
  getIdentifier?: (req: NextRequest) => string | null;
}

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

// ============================================================================
// In-Memory Store
// ============================================================================

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupStore(windowSeconds: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const cutoff = now - windowSeconds * 1000 * 2;

  for (const [key, entry] of store.entries()) {
    // Remove entries with no recent activity
    const recentTimestamps = entry.timestamps.filter((t) => t > cutoff);
    if (recentTimestamps.length === 0 && !entry.blocked) {
      store.delete(key);
    } else {
      entry.timestamps = recentTimestamps;
    }
  }
}

// ============================================================================
// Rate Limit Logic
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check and update rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  // Periodic cleanup
  cleanupStore(config.windowSeconds);

  // Get or create entry
  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [], blocked: false };
    store.set(identifier, entry);
  }

  // Check if blocked
  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((entry.blockedUntil - now) / 1000),
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Reset block if expired
  if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blocked = false;
    entry.blockedUntil = undefined;
  }

  // Filter timestamps in current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  // Check limit
  if (entry.timestamps.length >= config.limit) {
    // Block for the remainder of the window
    entry.blocked = true;
    entry.blockedUntil = entry.timestamps[0] + windowMs;

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((entry.blockedUntil - now) / 1000),
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Add current timestamp
  entry.timestamps.push(now);

  // Calculate reset time (when oldest request falls out of window)
  const reset =
    entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0] + windowMs - now) / 1000)
      : config.windowSeconds;

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    reset,
  };
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Default rate limit configurations by tier
 */
export const RATE_LIMIT_TIERS = {
  free: { limit: 20, windowSeconds: 60 },
  pro: { limit: 100, windowSeconds: 60 },
  studio: { limit: 500, windowSeconds: 60 },
  unlimited: { limit: 10000, windowSeconds: 60 },
} as const;

/**
 * Create rate limit headers
 */
function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.reset));
  if (result.retryAfter !== undefined) {
    headers.set("Retry-After", String(result.retryAfter));
  }
  return headers;
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Rate limit exceeded",
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      limit: result.limit,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: createRateLimitHeaders(result),
    }
  );
}

/**
 * Extract identifier from request
 */
function getRequestIdentifier(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): string {
  // Use custom identifier if provided
  if (config.getIdentifier) {
    const custom = config.getIdentifier(req);
    if (custom) return custom;
  }

  // Get IP address
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Determine identifier based on config
  switch (config.identifier) {
    case "user":
      return userId || `anon:${ip}`;
    case "both":
      return userId ? `user:${userId}:${ip}` : `ip:${ip}`;
    case "ip":
    default:
      return `ip:${ip}`;
  }
}

/**
 * Rate limit wrapper for API route handlers
 */
export function withRateLimit<T>(
  handler: (req: NextRequest, ...args: T[]) => Promise<NextResponse>,
  config: RateLimitConfig = RATE_LIMIT_TIERS.free
) {
  return async (req: NextRequest, ...args: T[]): Promise<NextResponse> => {
    const identifier = getRequestIdentifier(req, config);
    const result = checkRateLimit(identifier, config);

    if (!result.success) {
      return createRateLimitResponse(result);
    }

    // Call the actual handler
    const response = await handler(req, ...args);

    // Add rate limit headers to response
    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Rate limit check for use inside route handlers
 * Returns null if allowed, NextResponse if rate limited
 */
export function checkRateLimitForUser(
  req: NextRequest,
  userId: string,
  tier: keyof typeof RATE_LIMIT_TIERS = "free"
): { response: NextResponse | null; result: RateLimitResult } {
  const config = { ...RATE_LIMIT_TIERS[tier], identifier: "user" as const };
  const identifier = `user:${userId}`;
  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    return { response: createRateLimitResponse(result), result };
  }

  return { response: null, result };
}

/**
 * Apply rate limit headers to an existing response
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): void {
  const headers = createRateLimitHeaders(result);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
}
