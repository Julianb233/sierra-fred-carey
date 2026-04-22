---
phase: 81-reality-lens-first
plan: 01
subsystem: onboarding
tags: [middleware, redirect, reality-lens, onboarding]
dependency-graph:
  requires: [77-02]
  provides: [reality-lens-redirect-chain, reality-lens-persistence]
  affects: [81-02, 82, 83]
tech-stack:
  added: []
  patterns: [middleware-redirect-chain, service-client-writes]
file-tracking:
  key-files:
    created: []
    modified: [middleware.ts]
decisions:
  - id: middleware-reality-lens-check
    description: "Middleware checks reality_lens_complete alongside journey_welcomed; redirects to /dashboard/reality-lens?first=true if false"
  - id: exempt-reality-lens-routes
    description: "Exempt /dashboard/reality-lens routes from redirect to avoid infinite loops"
metrics:
  duration: "5 minutes"
  completed: "2026-03-09"
---

# Phase 81 Plan 01: Reality Lens Redirect Chain & Persistence Summary

**One-liner:** Middleware enforces reality lens completion with redirect chain from welcome -> reality-lens -> quick -> dashboard.

## What Was Done

### Task 1: Verify and harden the onboarding-to-reality-lens redirect chain
- **Gap found:** Middleware only checked `journey_welcomed` but did NOT enforce `reality_lens_complete`
- **Fix:** Added `reality_lens_complete` to the profile query in middleware
- **Added redirect:** Users with `journey_welcomed=true` but `reality_lens_complete=false` navigating to any `/dashboard` route (except `/dashboard/reality-lens`) are redirected to `/dashboard/reality-lens?first=true`
- **Loop prevention:** `/dashboard/reality-lens` routes are exempted from the redirect check
- **Commit:** 8b5f843

### Task 2: Verify reality_lens_complete flag persistence and status API
- **Verified:** POST endpoint calls `markRealityLensComplete(userId, result.stage, result.overallScore)` after AI assessment
- **Verified:** `markRealityLensComplete` uses `createServiceClient()` (service role) for reliable writes past RLS
- **Verified:** Updates `reality_lens_complete: true`, `reality_lens_score`, and `oases_stage` in profiles
- **Verified:** GET endpoint returns `{ complete, stage, score }` status
- **Verified:** Migration adds both columns with partial index for efficient "who hasn't completed" queries
- **No changes needed** -- all persistence logic was correctly implemented

## Redirect Chain (Verified)

```
/welcome (handleIntakeComplete)
  -> /dashboard/reality-lens?first=true
    -> /dashboard/reality-lens/quick?first=true (auto-redirect on ?first=true)
      -> [6 questions] -> POST /api/fred/reality-lens/quick
        -> markRealityLensComplete(userId, stage, score)
        -> /dashboard (on "Continue to Your Journey")
```

## Deviations from Plan

None -- plan executed as written. The middleware gap was identified in the plan and implemented as specified.

## Verification

- [x] `reality_lens_complete` queried from profiles in middleware
- [x] Redirect to `/dashboard/reality-lens?first=true` when reality_lens_complete is false
- [x] No infinite redirect loops (reality-lens routes exempted)
- [x] TypeScript compiles cleanly (`npx tsc --noEmit` -- 0 errors from Phase 81 files)
- [x] Service client used for profile writes
- [x] Migration includes both columns + partial index
