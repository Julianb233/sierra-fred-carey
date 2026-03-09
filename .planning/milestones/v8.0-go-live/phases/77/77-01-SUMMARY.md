---
phase: 77
plan: 01
subsystem: onboarding
tags: [welcome-screen, journey-framing, mentor-rename, orientation]
completed: 2026-03-09
duration: ~10min
---

# Phase 77 Plan 01: Welcome Screen & Mentor Rename Summary

**One-liner:** Journey-framing welcome screen with Mentor+Progress orientation cards and Fred AI -> Mentor rename across onboarding surfaces.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Enhance welcome screen with journey framing and orientation | 6a34603 | components/welcome/journey-welcome.tsx |
| 2 | Rename Fred AI to Mentor across onboarding UI | 2bbdc12 | coaching-layout.tsx, event-landing.tsx, coaching/page.tsx, coaching/history/page.tsx |

## Changes Made

### Task 1: Welcome Screen Enhancement
- Updated subheading from generic "guided path" to explicit "This is a journey, not a transaction" with desert/Sahara metaphor
- Added Mentor + Progress orientation cards between Oases timeline and CTA button
- Cards use existing design patterns (motion.div, Sahara orange accents, backdrop blur)
- Adjusted animation delay sequence for smooth staggered reveal

### Task 2: Mentor Rename
- coaching-layout.tsx: "FRED AI sidebar" -> "Mentor sidebar"
- event-landing.tsx: "FRED AI Coaching" -> "Mentor Coaching"
- coaching/history/page.tsx: "FRED AI" -> "Mentor"
- coaching/page.tsx: "FRED AI assistance" -> "Mentor assistance"
- Grep confirmed zero user-facing "Fred AI"/"FRED AI" references remain

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript: 0 new errors (1 pre-existing in active-memory.ts, unrelated)
- Grep: No user-facing "Fred AI" / "FRED AI" matches in components/ or app/
- Welcome screen renders: journey framing, Oases timeline, orientation cards, CTA button
