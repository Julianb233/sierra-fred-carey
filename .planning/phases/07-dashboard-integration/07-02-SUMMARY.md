---
phase: 07-dashboard-integration
plan: 02
subsystem: dashboard-navigation
tags: [navigation, sidebar, radix-icons, gap-closure]
dependency-graph:
  requires: [02-03, 03-02]
  provides: [dashboard-nav-history-link, dashboard-nav-investor-readiness-link]
  affects: []
tech-stack:
  added: []
  patterns: [radix-icon-per-nav-item]
key-files:
  created: []
  modified:
    - app/dashboard/layout.tsx
    - app/dashboard/page.tsx
    - app/dashboard/journey/page.tsx
decisions:
  - id: use-countdown-timer-icon
    context: "Decision History nav item needed an icon distinct from Monitoring (ActivityLogIcon)"
    choice: "CountdownTimerIcon from @radix-ui/react-icons"
    rationale: "History/time concept maps well to a countdown timer icon; avoids icon duplication"
metrics:
  duration: ~1 minute
  completed: 2026-02-06
---

# Phase 07 Plan 02: Fix Dashboard Navigation Summary

**One-liner:** Added Decision History sidebar link and corrected Investor Readiness link across three dashboard files.

## What Was Done

### Task 1: Fix dashboard nav items

**Changes to `app/dashboard/layout.tsx`:**
- Added `CountdownTimerIcon` to the `@radix-ui/react-icons` import block
- Inserted a new "Decision History" nav item (`/dashboard/history`) with `CountdownTimerIcon` and "Free" badge, placed after "Your Journey" and before "AI Insights"
- Renamed "Investor Score" to "Investor Readiness" and changed href from `/dashboard/investor-score` to `/dashboard/investor-readiness`

**Changes to `app/dashboard/page.tsx`:**
- Updated the "Check Investor Readiness" quick action href from `/dashboard/investor-score` to `/dashboard/investor-readiness`

**Changes to `app/dashboard/journey/page.tsx`:**
- Updated two links from `/dashboard/investor-score` to `/dashboard/investor-readiness` (lines 411 and 423)

**Final nav order (verified):**
- Free tier: Overview, Reality Lens, Your Journey, Decision History, AI Insights, Monitoring
- Pro tier: Positioning, Investor Lens, Investor Readiness, Pitch Deck Review, Strategy Docs, Weekly Check-ins
- Studio tier: Virtual Team, Boardy Integration
- Settings (bottom)

## Verification Results

| Check | Result |
|-------|--------|
| `/dashboard/history` in layout.tsx | 1 match (line 61) |
| `/dashboard/investor-readiness` in layout.tsx | 1 match (line 93) |
| `/dashboard/investor-score` in layout/page/journey | 0 matches (removed) |
| TypeScript compilation | Zero errors |
| Nav order: Free -> Pro -> Studio -> Settings | Confirmed |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| dce2c82 | fix(07-02): fix dashboard nav - add Decision History, correct Investor Readiness links |

## Notes

- The old `app/dashboard/investor-score/page.tsx` page still exists and references `/api/investor-score` internally. This is the page's own API call (not a navigation link) and was intentionally left untouched since the plan only targets navigation links.
- The `app/api/investor-score/route.ts` API route was also left as-is; it serves both the old and new pages.
