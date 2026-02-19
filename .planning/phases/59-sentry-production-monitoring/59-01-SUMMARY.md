---
phase: 59-sentry-production-monitoring
plan: 01
subsystem: infra
tags: [sentry, error-tracking, observability, source-maps, edge-runtime]

# Dependency graph
requires: []
provides:
  - Sentry initialization across client, server, and edge runtimes
  - Edge runtime Sentry config (sentry.edge.config.ts)
  - Error filtering for noisy browser/server errors
  - Sentry helpers wired into FRED chat and Stripe webhook routes
  - withSentrySpan helper for performance tracing
affects: [60-cicd-testing-expansion, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional Sentry initialization gated on NEXT_PUBLIC_SENTRY_DSN"
    - "Sentry tunnel route (/monitoring-tunnel) for ad-blocker bypass"
    - "tracePropagationTargets to prevent header leaks to third-party APIs"
    - "withSentrySpan wrapper for future server action tracing"

key-files:
  created:
    - sentry.edge.config.ts
  modified:
    - instrumentation.ts
    - sentry.client.config.ts
    - sentry.server.config.ts
    - lib/sentry.ts
    - app/api/fred/chat/route.ts
    - app/api/stripe/webhook/route.ts

key-decisions:
  - "Chat route path is app/api/fred/chat/route.ts not app/api/chat/route.ts -- wired Sentry there instead"
  - "tracePropagationTargets set to relative URLs and *.sahara domains to avoid leaking Sentry headers to third-party APIs"
  - "Server tracesSampleRate at 0.2 (higher than client 0.1) for more useful server traces"
  - "profilesSampleRate at 0.1 for server profiling"

patterns-established:
  - "captureError/setUserContext/addBreadcrumb pattern for API route error reporting"
  - "captureMessage for warning-level Sentry events (signature verification)"

# Metrics
duration: 6min
completed: 2026-02-18
---

# Phase 59 Plan 01: Sentry Production Monitoring Summary

**Sentry error tracking activated across all three Next.js runtimes (client/server/edge) with enhanced filtering, user context tagging in FRED chat and Stripe webhook, and withSentrySpan for performance tracing -- awaiting env var activation checkpoint**

## Status

PAUSED at checkpoint (Task 3). Tasks 1-2 complete. Awaiting user to set Sentry environment variables in Vercel and GitHub Actions.

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T01:58:51Z
- **Completed:** 2026-02-19T02:04:21Z (Tasks 1-2)
- **Tasks:** 2/3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 7

## Accomplishments

- Created sentry.edge.config.ts for edge/middleware runtime initialization
- Enhanced server config with profiling (0.1 sample rate), ignoreErrors, and beforeSend filter
- Enhanced client config with tracePropagationTargets and ignoreErrors for common browser noise
- Wired instrumentation.ts to initialize Sentry in edge runtime
- Added withSentrySpan helper to lib/sentry.ts for future performance tracing
- Wired captureError, setUserContext, addBreadcrumb into FRED chat route (highest traffic)
- Wired captureError, captureMessage into Stripe webhook route (business critical)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add edge config and enhance Sentry initialization** - `cbd8c88` (feat)
2. **Task 2: Wire lib/sentry.ts helpers into key API routes** - `91cda9f` (feat)
3. **Task 3: Checkpoint -- Set Sentry env vars** - PENDING (human-verify checkpoint)

## Files Created/Modified

- `sentry.edge.config.ts` - New: Edge runtime Sentry initialization (conditional on DSN)
- `instrumentation.ts` - Added edge runtime branch to register()
- `sentry.client.config.ts` - Added tracePropagationTargets and ignoreErrors
- `sentry.server.config.ts` - Added profiling, ignoreErrors, and beforeSend filter
- `lib/sentry.ts` - Added withSentrySpan helper function
- `app/api/fred/chat/route.ts` - Wired setUserContext, addBreadcrumb, captureError
- `app/api/stripe/webhook/route.ts` - Wired captureError, captureMessage

## Decisions Made

1. **Chat route path correction:** Plan referenced `app/api/chat/route.ts` which doesn't exist. The actual FRED chat route is at `app/api/fred/chat/route.ts`. Wired Sentry there instead.
2. **tracePropagationTargets:** Set to `[/^\//, /^https:\/\/.*\.sahara/]` to prevent Sentry trace headers from leaking to OpenAI, Anthropic, Stripe, and other third-party APIs.
3. **Server profiling enabled:** profilesSampleRate at 0.1 provides server-side performance profiling without excessive overhead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Chat route path doesn't match plan**
- **Found during:** Task 2
- **Issue:** Plan specifies `app/api/chat/route.ts` but file is at `app/api/fred/chat/route.ts`
- **Fix:** Used correct path `app/api/fred/chat/route.ts`
- **Files modified:** app/api/fred/chat/route.ts
- **Commit:** 91cda9f

---

**Total deviations:** 1 auto-fixed (1 blocking path correction)
**Impact on plan:** Minimal -- same file, just at correct path. No scope creep.

## Issues Encountered

- Pre-existing test failures (12 failures in profile-creation and get-started tests) unrelated to Sentry changes. These exist on main branch already.

## Next Phase Readiness

- Code is fully wired and ready. Sentry will activate as soon as env vars are set.
- CRITICAL: All 4 env vars (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) must be set simultaneously. Setting DSN without auth token will cause source map upload failures.
- After checkpoint approval, plan 59-01 is complete.

---
*Phase: 59-sentry-production-monitoring*
*Status: Paused at checkpoint*
