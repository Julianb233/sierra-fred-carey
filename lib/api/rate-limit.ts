/**
 * Rate Limiting Middleware -- Upstash Redis Backend
 *
 * Production-ready rate limiter using @upstash/ratelimit with Redis.
 * Falls back to in-memory for development when UPSTASH vars are not set.
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// ============================================================================
// Upstash Redis Client (module-scope for connection reuse)
// ============================================================================

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Cache of Ratelimit instances by config key to avoid recreating
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowSeconds: number): Ratelimit {
  const key = `${limit}:${windowSeconds}`;
  let limiter = limiterCache.get(key);
  if (!limiter && redis) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `rl:${key}`,
    });
    limiterCache.set(key, limiter);
  }
  return limiter!;
}

// ============================================================================
// In-Memory Fallback (dev mode)
// ============================================================================

interface InMemoryEntry {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

const memoryStore = new Map<string, InMemoryEntry>();
let lastCleanup = Date.now();
let fallbackWarned = false;

function cleanupMemoryStore(windowSeconds: number) {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  const cutoff = now - windowSeconds * 1000 * 2;
  for (const [key, entry] of memoryStore.entries()) {
    const recent = entry.timestamps.filter((t) => t > cutoff);
    const blockExpired =
      entry.blocked && entry.blockedUntil && now >= entry.blockedUntil;
    if (recent.length === 0 && (!entry.blocked || blockExpired)) {
      memoryStore.delete(key);
    } else {
      entry.timestamps = recent;
      if (blockExpired) {
        entry.blocked = false;
        entry.blockedUntil = undefined;
      }
    }
  }
}

function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  if (!fallbackWarned) {
    fallbackWarned = true;
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL not set, using in-memory fallback (not suitable for production)"
    );
  }

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  cleanupMemoryStore(config.windowSeconds);

  let entry = memoryStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [], blocked: false };
    memoryStore.set(identifier, entry);
  }

  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((entry.blockedUntil - now) / 1000),
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blocked = false;
    entry.blockedUntil = undefined;
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.limit) {
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

  entry.timestamps.push(now);
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
// Rate Limit Logic (async -- uses Upstash when available)
// ============================================================================

/**
 * Check and update rate limit for an identifier.
 * Uses Upstash Redis in production, falls back to in-memory in dev.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Use Upstash when available
  if (redis) {
    const limiter = getUpstashLimiter(config.limit, config.windowSeconds);
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: Math.ceil(result.reset / 1000),
      retryAfter: result.success
        ? undefined
        : Math.ceil((result.reset - Date.now()) / 1000),
    };
  }

  // Fallback to in-memory
  return checkRateLimitInMemory(identifier, config);
}

// ============================================================================
// Tier Configurations
// ============================================================================

export const RATE_LIMIT_TIERS = {
  free: { limit: 20, windowSeconds: 60 },
  pro: { limit: 100, windowSeconds: 60 },
  studio: { limit: 500, windowSeconds: 60 },
  unlimited: { limit: 10000, windowSeconds: 60 },
} as const;

// ============================================================================
// Response Helpers
// ============================================================================

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
 * Create a 429 rate limit response
 */
export function createRateLimitResponse(
  result: RateLimitResult
): NextResponse {
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

// ============================================================================
// Request Identifier Extraction
// ============================================================================

function getRequestIdentifier(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): string {
  if (config.getIdentifier) {
    const custom = config.getIdentifier(req);
    if (custom) return custom;
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

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

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Rate limit wrapper for API route handlers
 */
export function withRateLimit<T>(
  handler: (req: NextRequest, ...args: T[]) => Promise<NextResponse>,
  config: RateLimitConfig = RATE_LIMIT_TIERS.free
) {
  return async (req: NextRequest, ...args: T[]): Promise<NextResponse> => {
    const identifier = getRequestIdentifier(req, config);
    const result = await checkRateLimit(identifier, config);

    if (!result.success) {
      return createRateLimitResponse(result);
    }

    const response = await handler(req, ...args);

    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Rate limit check for use inside route handlers.
 * Returns null if allowed, NextResponse if rate limited.
 */
export async function checkRateLimitForUser(
  req: NextRequest,
  userId: string,
  tier: keyof typeof RATE_LIMIT_TIERS = "free"
): Promise<{ response: NextResponse | null; result: RateLimitResult }> {
  const config = { ...RATE_LIMIT_TIERS[tier], identifier: "user" as const };
  const identifier = `user:${userId}`;
  const result = await checkRateLimit(identifier, config);

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
