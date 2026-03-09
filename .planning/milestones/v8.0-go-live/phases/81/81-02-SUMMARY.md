---
phase: 81-reality-lens-first
plan: 02
subsystem: assessment
tags: [ai-prompt, gap-analysis, stage-placement, results-ui]
dependency-graph:
  requires: [81-01, 78-01]
  provides: [stage-placement-logic, gap-awareness-messaging]
  affects: [82, 83, 84]
tech-stack:
  added: []
  patterns: [investor-perspective-gap-framing, heuristic-fallback]
file-tracking:
  key-files:
    created: []
    modified: [lib/fred/reality-lens-quick.ts]
decisions:
  - id: investor-gap-framing
    description: "AI prompt instructs LLM to frame gaps as what investors would immediately question"
  - id: gaps-before-strengths
    description: "Results UI renders gaps card before strengths card for urgency"
metrics:
  duration: "3 minutes"
  completed: "2026-03-09"
---

# Phase 81 Plan 02: Stage Placement & Gap Awareness Summary

**One-liner:** Enhanced AI gap analysis with investor-perspective framing and verified results UI for "spook them" messaging.

## What Was Done

### Task 1: Verify and enhance stage placement logic
- **Verified:** `mapScoreToStage` correctly implements all 7 priority rules:
  - No customers + idea-only -> clarity
  - Score < 30 -> clarity
  - Score >= 80 + paying customers -> launch
  - Score 60-79 + mvp/launched -> build
  - Score 30-59 -> validation
  - Informal validation -> validation
  - Default -> clarity
  - Never returns "grow"
- **Verified:** Heuristic fallback produces sane scores when AI fails
- **Enhanced:** AI prompt now instructs LLM to:
  - "Be brutally honest about gaps. Frame each gap as something an investor would immediately question."
  - "Gaps should be specific to THIS founder's situation, not generic startup advice."
- **Commit:** 25cd620

### Task 2: Verify gap awareness messaging in results UI
- **Verified:** Gaps card uses orange gradient (`from-orange-50 to-red-50/50`) with `ExclamationTriangleIcon`
- **Verified:** Heading: "What you need to figure out before investors will listen"
- **Verified:** Gaps card appears BEFORE strengths card in DOM (urgency first)
- **Verified:** Stage badge shows "Your starting point: {Stage}" with description
- **Verified:** "#1 Next Step" card with actionable recommendation
- **Verified:** CTAs: "Continue to Your Journey" -> /dashboard, "Get Detailed Analysis" -> /dashboard/reality-lens
- **No changes needed** -- UI messaging was already correctly implemented per ONBOARD-05 requirements

## Deviations from Plan

None -- plan executed as written.

## Verification

- [x] mapScoreToStage returns correct stage for all score/signal combinations
- [x] AI prompt produces investor-perspective gap analysis
- [x] Results UI shows gaps before strengths with warning styling
- [x] "What you need to figure out before investors will listen" heading present
- [x] Stage badge clearly shows starting Oases stage with description
- [x] CTA buttons navigate correctly
- [x] TypeScript compiles cleanly
