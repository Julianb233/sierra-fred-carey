---
phase: 77-guided-venture-journey-onboarding
plan: 02
subsystem: onboarding
tags: [middleware, redirect, signup-flow, journey-welcomed]
dependency-graph:
  requires: [77-01]
  provides: [signup-to-welcome-redirect, middleware-welcome-enforcement]
  affects: [78-reality-lens, 79-stage-gating]
tech-stack:
  added: []
  patterns: [middleware-db-query, dynamic-import-in-middleware, exempt-path-list]
file-tracking:
  key-files:
    created: []
    modified:
      - app/api/onboard/route.ts
      - app/get-started/page.tsx
      - middleware.ts
decisions:
  - id: middleware-db-check
    description: "Lightweight DB query in middleware for journey_welcomed check (~5-10ms), using indexed column"
  - id: dynamic-import-supabase
    description: "Dynamic import of createClient inside middleware if-block to avoid loading on non-protected routes"
  - id: explicit-false-check
    description: "Only redirect when journey_welcomed === false explicitly; null/missing profiles pass through"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-08"
---

# Phase 77 Plan 02: Wire Signup Flow to Welcome Screen Summary

**One-liner:** Post-signup redirect to /welcome, middleware gates unwelcomed users from dashboard, journey_welcomed=false set on new profiles.

## What Was Built

### Onboard API Changes (`app/api/onboard/route.ts`)
- Added `journey_welcomed: false` to new user profile upsert (line 238)
- Added `journey_welcomed: false` to retry upsert block (line 254)
- Existing user updates left unchanged -- does NOT overwrite journey_welcomed

### Get-Started Page Changes (`app/get-started/page.tsx`)
- Changed post-signup celebration redirect from `/dashboard?welcome=true` to `/welcome`
- Updated loading text from "Preparing your dashboard..." to "Preparing your journey..."

### Middleware Welcome Enforcement (`middleware.ts`)
- Added welcome flow enforcement block after existing auth check (lines 49-70)
- Exempt paths prevent infinite redirects: `/welcome`, `/api/`, `/login`, `/signup`, `/get-started`, `/onboarding`, `/_next/`, `/favicon`
- Only checks on protected routes where user is authenticated
- Uses dynamic import of `createServerClient` to avoid unnecessary loading on non-protected routes
- Queries profiles table for `journey_welcomed` column (indexed via partial index from Plan 01)
- Only redirects when `profile.journey_welcomed === false` explicitly -- null/missing profiles pass through
- Reuses existing `user` object from `updateSession()` call

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| DB query in middleware | Indexed column makes it fast (~5-10ms); cookie-based approach would require syncing state |
| Dynamic import | Edge runtime optimization -- only loads Supabase client when needed |
| Explicit false check | New users without profiles yet should not be blocked; only redirect confirmed unwelcomed users |
| Keep onboarding_completed: true | Other code may depend on this flag; journey_welcomed is the new control |

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Updated celebration loading text**
- **Found during:** Task 1, get-started page modification
- **Issue:** Loading text said "Preparing your dashboard..." but user is going to /welcome, not dashboard
- **Fix:** Changed to "Preparing your journey..." for consistency
- **Files modified:** app/get-started/page.tsx

## Verification Results

- `grep -n "journey_welcomed" app/api/onboard/route.ts` -- shows field in both upsert blocks (lines 238, 254)
- `grep -n "/welcome" app/get-started/page.tsx` -- shows redirect change (line 200)
- `grep -n "journey_welcomed" middleware.ts` -- shows middleware check (lines 59, 63)
- `grep -n "welcomeExemptPaths" middleware.ts` -- shows exempt paths array (lines 51, 52)
- `npx tsc --noEmit` -- no new errors (only pre-existing feedback/funnel errors)
- `/welcome` confirmed in exempt paths array -- no infinite redirect loops

## Commits

| Hash | Message |
|------|---------|
| 94ae477 | feat(77-02): wire signup flow to welcome screen with middleware enforcement |

## Next Phase Readiness

- Full signup-to-welcome flow is now wired: /get-started -> /welcome -> intake -> /dashboard/reality-lens
- Middleware enforcement ensures no user can bypass the welcome intake
- Ready for human verification (Task 2 checkpoint) to test end-to-end flow
- Phase 78 (Reality Lens) can proceed -- the redirect to `/dashboard/reality-lens?first=true` is in place
