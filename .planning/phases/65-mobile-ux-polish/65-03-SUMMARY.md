---
phase: 65-mobile-ux-polish
plan: 03
subsystem: accessibility
tags: [wcag, a11y, aria, landmarks, axe-core, playwright]
dependency-graph:
  requires: [60-01]
  provides: [wcag-aa-compliance, skip-navigation, expanded-a11y-tests]
  affects: [65-04]
tech-stack:
  added: []
  patterns: [skip-to-content, aria-landmarks, semantic-headings, accessible-loading-states]
key-files:
  created: []
  modified:
    - app/layout.tsx
    - app/dashboard/layout.tsx
    - tests/e2e/accessibility-authenticated.spec.ts
decisions:
  - id: d65-03-01
    choice: "Use aria-hidden on nav section headings rather than aria-labelledby groups"
    reason: "Simpler implementation; section headings are visual grouping aids, not structural landmarks"
  - id: d65-03-02
    choice: "Add role=main alongside id=main-content for older assistive tech"
    reason: "Redundant with semantic <main> but improves compatibility with legacy screen readers"
metrics:
  duration: "6 minutes"
  completed: 2026-02-24
---

# Phase 65 Plan 03: WCAG Accessibility Compliance Summary

**One-liner:** Skip-to-content link, ARIA landmarks, accessible loading states, and a11y test coverage expanded from 5 to 16 dashboard pages.

## What Was Done

### Task 1: Add skip-to-content link and main landmark to root layout

Added WCAG 2.1 AA compliance infrastructure across the root and dashboard layouts:

- **Skip-to-content link** in `app/layout.tsx` -- visually hidden, appears on keyboard focus with `sr-only focus:not-sr-only` pattern, links to `#main-content`
- **Main landmark** on dashboard `<main>` element with `id="main-content"` and `role="main"`
- **Navigation landmark** with `aria-label="Main navigation"` on sidebar `<nav>`
- **Semantic headings** -- converted nav section labels from `<p>` to `<h3 aria-hidden="true">` for proper heading hierarchy
- **Accessible loading state** -- auth-checking spinner now has `role="status"`, `aria-label="Loading"`, and `<span className="sr-only">Loading...</span>`

### Task 2: Expand accessibility test coverage to all dashboard pages

Expanded `tests/e2e/accessibility-authenticated.spec.ts` from 5 to 16 pages:

**New pages added:** Strategy, Insights, Journey, Coaching, Pitch Deck, Investor Targeting, Communities, Documents, Notifications, Wellbeing, Profile Snapshot

**Test improvements:**
- Added `test.setTimeout(30_000)` for slower page loads
- Added `waitForSelector('[id="main-content"], main')` before axe analysis to prevent false positives from loading states
- Maintained existing violation logging (impact, id, description, first 3 node HTML snippets)

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| d65-03-01 | Use aria-hidden on nav section headings | Simpler than aria-labelledby groups; headings are visual grouping aids |
| d65-03-02 | Add role=main alongside id=main-content | Redundant but improves legacy screen reader compatibility |

## Commits

| Hash | Message |
|------|---------|
| 915356b | feat(65-03): add WCAG landmarks, skip-to-content link, and aria labels |
| fa7e4d5 | test(65-03): expand a11y test coverage from 5 to 16 dashboard pages |

## Next Phase Readiness

- All WCAG landmark and skip-navigation infrastructure is in place
- A11y test suite now covers all 16 core dashboard pages
- No blockers for subsequent plans
