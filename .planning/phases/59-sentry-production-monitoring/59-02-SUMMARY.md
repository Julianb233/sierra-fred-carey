---
phase: 59-sentry-production-monitoring
plan: 02
subsystem: infra
tags: [ci-cd, quality-gates, sentry, performance-monitoring, alerts]

# Dependency graph
requires: [59-01]
provides:
  - Honest CI pipeline with real quality gates (lint/typecheck/test block builds)
  - Sentry env vars passed to CI build step for source map uploads
  - Middleware slow request tracking via Sentry breadcrumbs
  - withSentrySpan wired into FRED chat completion for AI response time tracing
  - Sentry alert configuration script with 3 rules (high error rate, new issues, regressions)
affects: [60-cicd-testing-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI quality gates without || true (failures block builds)"
    - "Sentry breadcrumbs for slow middleware request detection (>2s)"
    - "withSentrySpan wrapper around non-streaming AI completion calls"
    - "Sentry API alert rule configuration via standalone script"

key-files:
  created:
    - scripts/configure-sentry-alerts.ts
  modified:
    - .github/workflows/deploy.yml
    - middleware.ts
    - app/api/fred/chat/route.ts

key-decisions:
  - "Removed || true from lint, typecheck, and test even though lint has 335 pre-existing errors and tests have 12 pre-existing failures -- CI should reflect reality"
  - "Kept || true on npm audit (advisory-only, cannot fix transitive dependency vulnerabilities)"
  - "withSentrySpan wraps non-streaming path only -- streaming path already tracks latency via Date.now() delta and has breadcrumbs"
  - "Alert script is a one-time manual run, not part of the build pipeline"

patterns-established:
  - "CI pipeline is the source of truth for code quality"
  - "Slow middleware detection pattern reusable for other edge routes"

# Metrics
duration: 7min
completed: 2026-02-19
---

# Phase 59 Plan 02: CI Quality Gates and Sentry Performance Monitoring Summary

**Removed || true from CI quality gates so lint/typecheck/test failures block builds, added Sentry performance monitoring spans to FRED chat route, slow request breadcrumbs to middleware, and created alert configuration script with 3 rules (high error rate, new issues, regressions)**

## Status

COMPLETE. All 2 tasks executed successfully.

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-19T21:37:03Z
- **Completed:** 2026-02-19T21:44:10Z
- **Tasks:** 2/2 complete
- **Files modified:** 3 (1 created, 3 modified)

## Accomplishments

- Removed `|| true` from lint, typecheck, and test steps in `.github/workflows/deploy.yml`
- Added quality gate comment explaining `|| true` must not be re-added
- Added Sentry env vars (DSN, AUTH_TOKEN, ORG, PROJECT) to CI build step for source map uploads
- Added slow request detection (>2000ms) to middleware via Sentry breadcrumbs
- Wired `withSentrySpan` into non-streaming FRED chat completion for AI response time performance tracing
- Created `scripts/configure-sentry-alerts.ts` with 3 alert rules: high error rate (>10 events/5min), new issue detection, issue regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove || true from CI quality gates** - `cb0ad57` (feat)
2. **Task 2: Add performance monitoring and alert configuration** - `92009fc` (feat)

## Files Created/Modified

- `.github/workflows/deploy.yml` - Removed `|| true` from lint/typecheck/test, added Sentry build env vars, added quality gate comment
- `middleware.ts` - Added Sentry import, slow request breadcrumb tracking (>2s)
- `app/api/fred/chat/route.ts` - Added `withSentrySpan` import and wrapped non-streaming AI completion call
- `scripts/configure-sentry-alerts.ts` - New: One-time Sentry API alert configuration script (3 rules)

## Decisions Made

1. **|| true removed despite pre-existing failures:** Lint has 335 errors (mostly `@typescript-eslint/no-explicit-any`) and tests have 12 failures (profile-creation and get-started tests). CI will now block on these. This is intentional -- the pipeline should reflect reality. Fixing these errors is tracked for Phase 60 (CI/CD expansion).
2. **npm audit kept advisory-only:** `|| true` retained on `npm audit` because transitive dependency vulnerabilities cannot be fixed by the project directly.
3. **withSentrySpan on non-streaming only:** The streaming path uses `for await` which doesn't fit cleanly into the `withSentrySpan` wrapper pattern. The non-streaming path (which has a discrete request/response cycle) gets the performance span. Streaming already tracks latency via `Date.now() - startTime`.
4. **Alert script is manual:** The Sentry alert configuration script runs once after env vars are set, not as part of CI/CD.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Chat route path correction**
- **Found during:** Task 2
- **Issue:** Plan references `app/api/chat/route.ts` but the actual FRED chat route is at `app/api/fred/chat/route.ts` (same correction as Plan 01)
- **Fix:** Used correct path `app/api/fred/chat/route.ts`
- **Files modified:** app/api/fred/chat/route.ts
- **Commit:** 92009fc

---

**Total deviations:** 1 auto-fixed (1 blocking path correction, same as Plan 01)
**Impact on plan:** Minimal -- same file, just at correct path.

## Pre-existing Issues Noted

- **Lint:** 335 errors (primarily `@typescript-eslint/no-explicit-any` across test files and worker dist files). CI will block until fixed.
- **Tests:** 12 failures in 2 test files (profile-creation, get-started). CI will block until fixed.
- **Typecheck:** Passes cleanly (`npx tsc --noEmit` exits 0).
- **Build:** Passes cleanly (`npm run build` exits 0).

## Next Phase Readiness

- CI pipeline now has honest quality gates. **Before pushing to main**, the 335 lint errors and 12 test failures must be resolved (or lint rules adjusted to treat `no-explicit-any` as warning).
- Sentry performance monitoring will activate when env vars are set (spans and breadcrumbs are no-op without DSN).
- Alert configuration script ready to run after Sentry activation: `SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... npx tsx scripts/configure-sentry-alerts.ts`
- Phase 60 (CI/CD expansion) should address the pre-existing lint errors and test failures.

---
*Phase: 59-sentry-production-monitoring*
*Status: Complete*
