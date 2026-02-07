---
phase: 12-data-fixes-production-hardening
plan: 02
subsystem: middleware, seo, cors, rate-limiting, env-validation
tags: [production, middleware, robots, sitemap, cors, upstash, rate-limiting, env-validation]

# Dependency graph
requires:
  - phase: 11-security-hardening
    provides: Rate limiting infrastructure, auth middleware utilities
provides:
  - Root edge middleware for auth route protection
  - robots.txt and sitemap.xml via Next.js MetadataRoute API
  - Centralized CORS utility with webhook path exclusions
  - Upstash Redis-backed rate limiting (replaces in-memory)
  - Comprehensive env var validation script
affects:
  - All protected routes require authentication
  - All API routes get CORS headers via middleware
  - Rate limiting persists across Vercel cold starts

# Tech tracking
tech-stack:
  added:
    - "@upstash/ratelimit ^2.0.8"
    - "@upstash/redis ^1.36.2"
  patterns:
    - "Edge middleware for auth + CORS (single middleware.ts)"
    - "MetadataRoute API for robots.txt and sitemap.xml"
    - "Module-scope Redis client for connection reuse"
    - "In-memory fallback for dev when Upstash not configured"

key-files:
  created:
    - middleware.ts
    - app/robots.ts
    - app/sitemap.ts
    - lib/api/cors.ts
    - scripts/validate-env.ts
  modified:
    - lib/auth/middleware-utils.ts
    - lib/api/rate-limit.ts
    - lib/env.ts
    - package.json
    - app/api/diagnostic/route.ts
    - app/api/diagnostic/positioning/route.ts
    - app/api/diagnostic/investor/route.ts
    - app/api/onboard/route.ts
    - app/api/auth/login/route.ts
    - app/api/admin/login/route.ts
    - app/api/fred/reality-lens/route.ts
    - app/api/fred/memory/route.ts
    - app/api/fred/chat/route.ts
    - app/api/fred/history/route.ts
    - app/api/fred/analyze/route.ts
    - app/api/fred/decide/route.ts
    - lib/api/__tests__/rate-limit.test.ts
    - app/api/__tests__/auth-integration.test.ts
    - app/api/fred/__tests__/fred-api.test.ts

key-decisions:
  - "Single root middleware.ts handles auth + CORS (not separate middleware files)"
  - "CORS headers applied via middleware to all API routes; webhooks excluded"
  - "Upstash Redis for production rate limiting with in-memory dev fallback"
  - "checkRateLimit/checkRateLimitForUser made async; all 14 callers updated with await"
  - "Env vars optional with defaults in lib/env.ts; strict validation in scripts/validate-env.ts"
  - "MetadataRoute API over static files for robots.txt and sitemap.xml"

patterns-established:
  - "Edge middleware pattern: updateSession → CORS → auth check → response"
  - "Rate limiter cache pattern: Map<configKey, Ratelimit> for connection reuse"

# Metrics
duration: ~10min (including test fixes)
completed: 2026-02-07
---

# Phase 12 Plan 02: Production Infrastructure Summary

**Root middleware for auth protection, robots.txt/sitemap.xml SEO files, centralized CORS, Upstash Redis rate limiting, and env var validation script**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (infrastructure + rate limiting/env validation)
- **Files created:** 5
- **Files modified:** 19
- **Tests:** 23 files, 445 tests, ALL PASSING

## Task 1: Root Middleware, Robots, Sitemap, CORS

### PROD-01: Root Middleware
- Created `middleware.ts` at project root
- Calls `updateSession()` from Supabase SSR for auth token refresh
- Checks `isProtectedRoute()` for /dashboard, /settings, /agents, /chat, /documents, /profile
- Redirects unauthenticated users to `/login?redirect=<pathname>`
- Added `/chat` to DEFAULT_PROTECTED_ROUTES in `lib/auth/middleware-utils.ts`

### PROD-02: robots.txt
- Created `app/robots.ts` using Next.js MetadataRoute API
- Disallows: /dashboard/, /api/, /admin/, /settings/, /agents/, /chat/, /onboarding/, /check-ins/, /documents/, /profile/
- Links to sitemap.xml

### PROD-03: sitemap.xml
- Created `app/sitemap.ts` using Next.js MetadataRoute API
- Lists 24 public pages with appropriate priority and changeFrequency
- Covers: core pages, content, auth entry points, legal, demos, tools

### PROD-04: Image Audit
- Verified: zero `<img>` tags in source files; all images use `next/image`

### PROD-06: CORS Utility
- Created `lib/api/cors.ts` with `corsHeaders()`, `withCorsHeaders()`, `handleCorsOptions()`, `isWebhookPath()`
- CORS headers applied via middleware to all API routes
- Webhook paths (Stripe, SMS, Boardy) excluded from CORS
- Middleware handles OPTIONS preflight for API routes

## Task 2: Upstash Rate Limiting & Env Validation

### PROD-05: Upstash Redis Rate Limiting
- Installed `@upstash/ratelimit` and `@upstash/redis`
- Rewrote `lib/api/rate-limit.ts` with Upstash backend
- Module-scope Redis client and limiter cache for connection reuse
- In-memory fallback for dev when UPSTASH vars not set (with console.warn)
- `checkRateLimit` and `checkRateLimitForUser` made async (Promise-returning)
- All 14 API route callers updated with `await`
- Test mocks updated to return Promises (mockResolvedValue)
- `lib/rate-limit.ts` deprecated (kept for backward compat)

### PROD-07: Env Var Validation
- Expanded `lib/env.ts` serverEnvSchema with Stripe and Upstash vars
- Created `scripts/validate-env.ts` with comprehensive Zod validation
- Required: Supabase, JWT, Stripe, Upstash, App URL
- Optional: Twilio, LiveKit, Resend, Slack, ADMIN_SECRET_KEY, CRON_SECRET
- AI provider check: at least one of OPENAI/ANTHROPIC/GOOGLE required
- Added `validate-env` script to package.json

## Verification

- [x] `middleware.ts` exists at root with auth + CORS handling
- [x] `app/robots.ts` exports default function with disallow rules
- [x] `app/sitemap.ts` exports default function listing 24 public pages
- [x] `lib/api/cors.ts` exports corsHeaders, withCorsHeaders, handleCorsOptions, isWebhookPath
- [x] `lib/api/rate-limit.ts` imports from @upstash/ratelimit
- [x] All 14 callers use `await` for checkRateLimit/checkRateLimitForUser
- [x] `scripts/validate-env.ts` exists with Zod production validation
- [x] `package.json` has @upstash/ratelimit, @upstash/redis, validate-env script
- [x] `npx tsc --noEmit` passes (0 errors)
- [x] `npx vitest run` passes (23 files, 445 tests)

## User Setup Required

**Upstash Redis** (for production rate limiting):
1. Create Redis database at https://console.upstash.com
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel env vars
3. Without these, rate limiting falls back to in-memory (not suitable for production)

## Requirements Completed

- **PROD-01:** Root middleware protects authenticated routes
- **PROD-02:** robots.txt disallows private routes
- **PROD-03:** sitemap.xml lists all public pages
- **PROD-04:** No raw `<img>` tags (all use next/image)
- **PROD-05:** Upstash Redis rate limiting with dev fallback
- **PROD-06:** Centralized CORS utility applied via middleware
- **PROD-07:** Env validation script for pre-deploy checks

---
*Summary created: 2026-02-07*
