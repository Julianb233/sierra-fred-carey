---
phase: 59-sentry-production-monitoring
verified: 2026-02-19T22:00:00Z
status: passed
score: 8/8 must-haves verified
human_verification:
  - test: "Trigger a test error in production and check Sentry dashboard"
    expected: "Error appears in Sentry within 30 seconds with readable (non-minified) source maps"
    why_human: "Requires Sentry DSN to be set and a live production deployment to verify end-to-end"
  - test: "Verify source maps show readable stack traces in Sentry"
    expected: "Stack traces reference original TypeScript files and line numbers, not webpack bundles"
    why_human: "Source map upload verification requires checking Sentry dashboard after a build with SENTRY_AUTH_TOKEN set"
  - test: "Run scripts/configure-sentry-alerts.ts and check Sentry alert rules page"
    expected: "Three alert rules appear: High Error Rate, New Issue Detected, Issue Regression"
    why_human: "Requires Sentry API credentials and dashboard access to confirm"
  - test: "Push a commit with a lint or type error to confirm CI blocks the build"
    expected: "GitHub Actions build job fails on the lint or typecheck step"
    why_human: "Requires actual CI run on GitHub Actions to validate"
---

# Phase 59: Sentry + Production Monitoring Verification Report

**Phase Goal:** Error tracking, source maps, alerting, and CI hardening so bugs are caught and reported automatically
**Verified:** 2026-02-19T22:00:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sentry captures client-side runtime errors with readable source maps | VERIFIED | `sentry.client.config.ts` has full Sentry.init (24 lines) with DSN, replays, tracePropagationTargets. `next.config.mjs` wraps config with `withSentryConfig` including `widenClientFileUpload: true` and `hideSourceMaps: true`. `app/global-error.tsx` calls `Sentry.captureException(error)`. |
| 2 | Sentry captures server-side API route errors with user context | VERIFIED | `sentry.server.config.ts` (25 lines) has Sentry.init with tracesSampleRate 0.2, profiling. `app/api/fred/chat/route.ts` line 259: `setUserContext(userId, tierName)`, lines 774/796: `captureError(...)`. `app/api/stripe/webhook/route.ts` line 78: `captureMessage(...)`, line 216: `captureError(...)`. |
| 3 | Sentry captures edge runtime errors from middleware | VERIFIED | `sentry.edge.config.ts` (9 lines) initializes Sentry for edge. `instrumentation.ts` lines 8-10 import edge config when `NEXT_RUNTIME === "edge"`. Line 13 exports `captureRequestError as onRequestError`. `middleware.ts` imports `@sentry/nextjs` for breadcrumbs. |
| 4 | Noisy errors (ResizeObserver, AbortError, network timeout) are filtered out | VERIFIED | Both `sentry.client.config.ts` and `sentry.server.config.ts` have `ignoreErrors` arrays and `beforeSend` filters that return null for `/ResizeObserver loop\|AbortError\|network timeout/i`. |
| 5 | Sentry tunnel route bypasses ad blockers | VERIFIED | `next.config.mjs` line 78: `tunnelRoute: "/monitoring-tunnel"` in `withSentryConfig` options. |
| 6 | CI pipeline fails when lint, typecheck, or tests fail (no silent pass-through) | VERIFIED | `.github/workflows/deploy.yml` -- lint (line 32), typecheck (line 35), test (line 38) all run without `\|\| true`. Only `npm audit` retains `\|\| true` (line 62, intentional). Quality gate comment on lines 15-17. Sentry env vars passed to build step (lines 41-45). |
| 7 | Alert rules configured for error rate spikes | VERIFIED | `scripts/configure-sentry-alerts.ts` (87 lines) creates 3 alert rules via Sentry API: "High Error Rate" (>10 events/5min), "New Issue Detected" (first occurrence), "Issue Regression" (resolved then reappeared). Script is substantive with proper error handling and env var validation. |
| 8 | Performance monitoring tracks page load times and API response times | VERIFIED | Client: `tracesSampleRate: 0.1` enables automatic web vitals. Server: `tracesSampleRate: 0.2`, `profilesSampleRate: 0.1`. `app/api/fred/chat/route.ts` line 507: `withSentrySpan("ai.chat.completion", "ai.run", ...)` wraps AI completion. `middleware.ts` lines 54-62: slow request (>2s) breadcrumbs. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sentry.edge.config.ts` | Edge runtime Sentry initialization | VERIFIED (exists, 9 lines, wired via instrumentation.ts) | Conditional on DSN, inits with tracesSampleRate 0.1 |
| `instrumentation.ts` | Server + edge Sentry init via Next.js instrumentation hook | VERIFIED (exists, 13 lines, both nodejs and edge branches) | Exports `captureRequestError as onRequestError` |
| `sentry.client.config.ts` | Client Sentry initialization | VERIFIED (exists, 24 lines, loaded by Next.js automatically) | Replays, tracePropagationTargets, ignoreErrors, beforeSend |
| `sentry.server.config.ts` | Server Sentry initialization | VERIFIED (exists, 25 lines, loaded via instrumentation.ts) | Profiling, ignoreErrors, beforeSend |
| `lib/sentry.ts` | Sentry helper functions | VERIFIED (exists, 32 lines, exports 5 functions, imported by 2 routes) | captureError, captureMessage, setUserContext, addBreadcrumb, withSentrySpan |
| `app/api/fred/chat/route.ts` | FRED chat route with Sentry wiring | VERIFIED (810 lines, imports 4 Sentry helpers, uses all in route) | setUserContext, addBreadcrumb, withSentrySpan, captureError |
| `app/api/stripe/webhook/route.ts` | Stripe webhook with Sentry wiring | VERIFIED (280 lines, imports 2 Sentry helpers, uses both) | captureMessage for sig failure, captureError in catch |
| `.github/workflows/deploy.yml` | CI pipeline with real quality gates | VERIFIED (115 lines, no `\|\| true` on lint/typecheck/test) | Sentry env vars in build step, quality gate comment |
| `scripts/configure-sentry-alerts.ts` | Alert configuration script | VERIFIED (exists, 87 lines, 3 rules defined) | High error rate, new issue, regression |
| `next.config.mjs` | withSentryConfig wrapper for source maps | VERIFIED (82 lines, withSentryConfig wraps config) | tunnelRoute, widenClientFileUpload, hideSourceMaps |
| `app/global-error.tsx` | Global error boundary capturing to Sentry | VERIFIED (87 lines, calls Sentry.captureException) | User-facing error UI with reset button |
| `middleware.ts` | Slow request breadcrumb tracking | VERIFIED (93 lines, Sentry import, duration tracking) | >2s threshold, conditional on DSN |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `instrumentation.ts` | `sentry.edge.config.ts` | Dynamic import for edge runtime | WIRED | Line 9: `await import("./sentry.edge.config")` |
| `instrumentation.ts` | `sentry.server.config.ts` | Dynamic import for nodejs runtime | WIRED | Line 5: `await import("./sentry.server.config")` |
| `app/api/fred/chat/route.ts` | `lib/sentry.ts` | Import and usage of 4 helpers | WIRED | Line 40: imports captureError, setUserContext, addBreadcrumb, withSentrySpan. Used on lines 259, 506-507, 598, 774, 796 |
| `app/api/stripe/webhook/route.ts` | `lib/sentry.ts` | Import and usage of 2 helpers | WIRED | Line 16: imports captureError, captureMessage. Used on lines 78, 216 |
| `next.config.mjs` | `@sentry/nextjs` | withSentryConfig wrapper | WIRED | Line 1: import, line 71: conditional wrapping when DSN set |
| `app/global-error.tsx` | `@sentry/nextjs` | Direct Sentry.captureException | WIRED | Line 3: import, line 14: captureException in useEffect |
| `middleware.ts` | `@sentry/nextjs` | Direct Sentry.addBreadcrumb | WIRED | Line 5: import, lines 56-62: breadcrumb for slow requests |
| `.github/workflows/deploy.yml` | Sentry secrets | Build env vars | WIRED | Lines 42-45: NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| INFRA-01: Sentry error tracking -- DSN configuration | SATISFIED | DSN conditional pattern verified across all configs |
| INFRA-01: Source maps uploading | SATISFIED | withSentryConfig with widenClientFileUpload + hideSourceMaps in next.config.mjs |
| INFRA-01: Alerting rules | SATISFIED | scripts/configure-sentry-alerts.ts defines 3 rules (high error rate, new issue, regression) |
| INFRA-01: Performance monitoring | SATISFIED | tracesSampleRate on client (0.1) and server (0.2), profilesSampleRate (0.1), withSentrySpan on chat route, middleware breadcrumbs |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODO/FIXME/placeholder/stub patterns found in any phase 59 artifact.

### Human Verification Required

### 1. End-to-End Error Capture Test
**Test:** After setting all 4 Sentry env vars (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) in Vercel and deploying, open browser console on production site and run `throw new Error("Sentry test from console")`
**Expected:** Error appears in Sentry dashboard within 30 seconds with readable source maps showing original TypeScript file names and line numbers
**Why human:** Requires live production deployment with real Sentry credentials

### 2. Source Map Verification
**Test:** Check Sentry Dashboard -> Settings -> Source Maps after a production build
**Expected:** Upload artifacts listed, and any captured error shows readable (non-minified) stack trace
**Why human:** Requires Sentry dashboard access and a build with SENTRY_AUTH_TOKEN set

### 3. Alert Rules Configuration
**Test:** Run `SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... npx tsx scripts/configure-sentry-alerts.ts`
**Expected:** Script outputs "Created alert rule: High Error Rate", "Created alert rule: New Issue Detected", "Created alert rule: Issue Regression". Rules visible in Sentry alerts page.
**Why human:** Requires Sentry API credentials

### 4. CI Quality Gate Enforcement
**Test:** Push a commit with a deliberate type error or lint error to a branch with a PR
**Expected:** GitHub Actions build job fails and blocks the PR
**Why human:** Requires actual CI run on GitHub Actions

### Gaps Summary

No gaps found. All 8 observable truths are verified at all three levels (existence, substantive, wired). Every required artifact exists with real implementations, no stubs, and proper wiring to the rest of the codebase.

The phase is structurally complete. The code is fully wired and conditional on the `NEXT_PUBLIC_SENTRY_DSN` environment variable, meaning it is inert in development but will activate immediately when the 4 Sentry env vars are set in Vercel and GitHub Actions (a human checkpoint documented in Plan 01, Task 3).

Notable implementation quality indicators:
- All Sentry calls are no-op when DSN is not set (graceful degradation)
- Error filtering covers both client and server noisy errors
- User context tagging enables per-user error debugging
- Performance monitoring spans on the highest-traffic route (FRED chat)
- CI pipeline quality gates are enforced with a clear comment preventing `|| true` re-addition

---

_Verified: 2026-02-19T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
