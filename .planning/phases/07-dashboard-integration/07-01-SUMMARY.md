---
phase: 07-dashboard-integration
plan: 01
subsystem: dashboard
tags: [reality-lens, fred-api, dashboard, gap-closure]
dependency-graph:
  requires: [02-01, 02-02]
  provides: [reality-lens-fred-wiring]
  affects: []
tech-stack:
  added: []
  patterns:
    - FRED API nested error shape handling (error.code + error.message)
    - Confidence badge display per assessment factor
    - Verdict badge in score card
key-files:
  created: []
  modified:
    - app/dashboard/reality-lens/page.tsx
    - app/api/__tests__/auth-integration.test.ts
  deleted:
    - app/api/reality-lens/route.ts
    - app/api/reality-lens/README.md
decisions:
  - id: D-0701-1
    summary: Update stage enum values to match FRED schema
    detail: "Changed Select options from ideation/pre-seed/seed/series-a to idea/mvp/launched/scaling to match FRED RealityLensContextSchema"
  - id: D-0701-2
    summary: Keep legacy input validation tests, repoint to FRED route
    detail: "Rather than deleting Reality Lens input validation tests, updated them to import from FRED route and assert against FRED error shape (error.code instead of error string)"
  - id: D-0701-3
    summary: Delete legacy route entirely instead of redirect stub
    detail: "Chose full deletion over 308 redirect since all consumers are internal and were updated in Task 1"
metrics:
  duration: "3m 38s"
  completed: 2026-02-06
  tasks: 2/2
---

# Phase 07 Plan 01: Reality Lens FRED API Wiring Summary

Rewired Reality Lens dashboard to use the Phase 02 FRED-powered assessment engine instead of the legacy raw-JSON-parsing endpoint, and removed the legacy route entirely.

## One-liner

Reality Lens page rewired from legacy /api/reality-lens to FRED /api/fred/reality-lens with richer UI (verdict, confidence, executive summary, per-factor detail)

## What Was Done

### Task 1: Rewire Reality Lens page to FRED API
**Commit:** `3e07d6b`

Rewrote the Reality Lens dashboard page to call `/api/fred/reality-lens` with the FRED input schema and render the richer response:

- **API interface update:** Replaced `DimensionScore` + flat `ApiResponse` with `FactorAssessment`, `RealityLensData`, and nested `ApiResponse` matching the FRED schema
- **Fetch call update:** Changed URL from `/api/reality-lens` to `/api/fred/reality-lens`, mapped form fields into `{idea, context: {stage, targetMarket}}`
- **Stage enum alignment:** Updated Select options from `ideation/pre-seed/seed/series-a` to `idea/mvp/launched/scaling` to match FRED `RealityLensContextSchema`
- **Richer results rendering:**
  - Verdict badge (Strong/Promising/Needs Work/Reconsider) next to overall score
  - Executive Summary card between score and factor breakdown
  - Confidence badges (High/Medium/Low) per factor
  - Per-factor strengths and weaknesses in each factor card
  - Top Strengths and Critical Risks cards (replacing flat strengths/weaknesses)
  - Next Steps section (replacing flat recommendations)
- **Error handling:** Updated for FRED nested error shape `{error: {code, message}}`
- **Cleanup:** Removed unused `RatingPrompt` import and `responseId` state variable

### Task 2: Remove legacy Reality Lens route
**Commit:** `afd1100`

- Deleted `app/api/reality-lens/route.ts` (472 lines of legacy code)
- Deleted `app/api/reality-lens/README.md`
- Updated `app/api/__tests__/auth-integration.test.ts`:
  - Changed auth test imports from `@/app/api/reality-lens/route` to `@/app/api/fred/reality-lens/route`
  - Changed test request URLs to `/api/fred/reality-lens`
  - Updated input validation assertions for FRED error shape (`error.code` instead of `error` string)
  - Added mocks for `@/lib/api/rate-limit` and `@/lib/fred/reality-lens` required by FRED route

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0701-1 | Update stage enum to match FRED schema | FRED expects idea/mvp/launched/scaling; legacy had ideation/pre-seed/seed/series-a which don't match |
| D-0701-2 | Repoint tests to FRED route instead of deleting | Preserves auth and validation test coverage for the Reality Lens endpoint |
| D-0701-3 | Delete legacy route entirely | All consumers are internal and updated; redirect stub adds unnecessary complexity |

## Verification Results

1. `grep -rn "api/reality-lens" app/ lib/ components/` -- No matches (no legacy references remain)
2. `grep -n "api/fred/reality-lens" app/dashboard/reality-lens/page.tsx` -- Line 90 shows fetch call
3. `ls app/api/reality-lens/` -- Directory does not exist
4. TypeScript compilation -- No errors in reality-lens/page.tsx or auth-integration.test.ts

## Next Phase Readiness

Phase 07-01 completes the Reality Lens FRED wiring gap. The dashboard now uses the full FRED assessment engine with richer data display. No blockers for remaining Phase 07 plans.
