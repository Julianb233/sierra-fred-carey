---
phase: 65-mobile-ux-polish
plan: 02
subsystem: ui-animations
tags: [framer-motion, animations, page-transitions, scroll-animations, a11y]

dependency-graph:
  requires: []
  provides:
    - "PageTransition component for route-change animations"
    - "FadeIn component for scroll-triggered animations"
    - "Dashboard layout with animated page transitions"
    - "Dashboard home with FadeIn-wrapped content sections"
  affects:
    - "65-03 (touch gestures may compose with animations)"
    - "65-04 (any new dashboard widgets should use FadeIn)"

tech-stack:
  added: []
  patterns:
    - "framer-motion AnimatePresence for page transitions"
    - "whileInView for scroll-triggered animations"
    - "useReducedMotion for accessibility compliance"

file-tracking:
  key-files:
    created:
      - components/animations/PageTransition.tsx
      - components/animations/FadeIn.tsx
    modified:
      - app/dashboard/layout.tsx
      - app/dashboard/page.tsx

decisions:
  - id: "65-02-01"
    decision: "Transform-only animations (opacity + translateY) to avoid layout thrashing"
    reason: "GPU-composited properties avoid triggering layout recalculation"
  - id: "65-02-02"
    decision: "200ms page transition, 400ms scroll fade-in with staggered delays"
    reason: "Short enough to feel snappy, long enough to be perceptible"
  - id: "65-02-03"
    decision: "Reduced motion support via useReducedMotion sets duration to 0"
    reason: "WCAG compliance -- users with vestibular disorders get instant transitions"

metrics:
  duration: "~4 minutes"
  completed: "2026-02-23"
---

# Phase 65 Plan 02: Dashboard Page Transitions and Animations Summary

Framer-motion page transitions on dashboard route changes and scroll-triggered FadeIn on dashboard home content sections, with full prefers-reduced-motion support.

## What Was Done

### Task 1: Create Animation Components (pre-existing commit c8da450)

Created two reusable animation components:

- **PageTransition.tsx**: Wraps children in `AnimatePresence mode="wait"` with a `motion.div` keyed on `usePathname()`. Fade+slide (opacity 0->1, y 8->0) on enter, reverse on exit. 200ms easeOut duration.
- **FadeIn.tsx**: Scroll-triggered animation using `whileInView`. Fade+slide (opacity 0->1, y 16->0) with 400ms easeOut, configurable `delay` prop, `viewport={{ once: true, margin: "-50px" }}`.

Both components call `useReducedMotion()` and set duration to 0 when the user prefers reduced motion.

### Task 2: Integrate PageTransition into Dashboard Layout (pre-existing)

The dashboard layout (`app/dashboard/layout.tsx`) already had `PageTransition` imported and wrapping `{children}` inside the main content container. No changes needed.

### Task 3: Apply FadeIn to Dashboard Home Page (commit 0485e20)

Wrapped 4 content sections in `app/dashboard/page.tsx` with staggered `FadeIn`:

| Section | Delay |
|---------|-------|
| GetStartedWithFred | 0s |
| RedFlagsWidget | 0.1s |
| DecisionBox + FundingReadinessGauge grid | 0.2s |
| WeeklyMomentum | 0.3s |

Only content sections in the loaded-data branch are wrapped -- loading skeleton and conditionally rendered elements are left unwrapped to avoid animation on initial load flicker.

## Deviations from Plan

None -- plan executed exactly as written. Tasks 1 and 2 were already completed in a prior execution (commit c8da450); this execution completed Task 3.

## Verification

- [x] `components/animations/PageTransition.tsx` exports `PageTransition` with `useReducedMotion`
- [x] `components/animations/FadeIn.tsx` exports `FadeIn` with `useReducedMotion`
- [x] `app/dashboard/layout.tsx` wraps children in `<PageTransition>`
- [x] `app/dashboard/page.tsx` imports `FadeIn` and wraps 4 content sections
- [x] Staggered delays: 0, 0.1, 0.2, 0.3
- [x] Build: pre-existing failure in `api/cron/weekly-checkin` route (unrelated to this plan)

## Next Phase Readiness

Animation infrastructure is in place. `FadeIn` can be reused on any future dashboard page or component. `PageTransition` automatically applies to all dashboard route changes via the layout wrapper. Phase 65-03 (touch gestures) can proceed independently.
