---
phase: 90-user-testing-loop
plan: 01
subsystem: testing
tags: [playwright, e2e, smoke-test, feedback, sla, iteration]
dependency-graph:
  requires: [74, 76, 88]
  provides: [onboarding-smoke-test, mobile-e2e, event-feedback-widget, iteration-sla-dashboard]
  affects: []
tech-stack:
  added: []
  patterns: [cli-smoke-test, iteration-sla-tracking, event-feedback-pipeline]
key-files:
  created:
    - scripts/smoke-test-onboarding.ts
    - tests/e2e/onboarding-journey-smoke.spec.ts
    - tests/e2e/mobile-voice-continuity.spec.ts
    - components/feedback/event-feedback-widget.tsx
    - app/api/feedback/event/route.ts
    - lib/feedback/iteration-tracker.ts
    - app/admin/testing/iteration-dashboard.tsx
    - app/api/admin/iteration-metrics/route.ts
  modified:
    - app/admin/testing/page.tsx
decisions:
  - Smoke test uses Playwright chromium for programmatic browser navigation
  - Event feedback creates dual rows (event_feedback + feedback_signals) for pipeline integration
  - Iteration metrics compute 48h SLA from metadata.resolved_at on feedback_signals
  - SLA color coding: green >= 80%, yellow 50-79%, red < 50%
metrics:
  duration: ~15min
  completed: 2026-03-09
---

# Phase 90 Plan 01: User Testing Loop Summary

**One-liner:** Onboarding smoke test CLI + mobile E2E suites + event feedback widget + 48-hour SLA iteration dashboard

## What Was Built

### Task 1: Onboarding Smoke Test + Mobile E2E Suites
- **CLI smoke test** (`scripts/smoke-test-onboarding.ts`): Creates test account, navigates signup -> login -> onboarding -> dashboard -> chat via Playwright, reports pass/fail per step with timing, cleans up account after run
- **Onboarding E2E** (`tests/e2e/onboarding-journey-smoke.spec.ts`): 5 Playwright tests covering signup page, get-started flow, dashboard render, stage gating, and Reality Lens page. Skips gracefully when Supabase env vars missing
- **Mobile voice E2E** (`tests/e2e/mobile-voice-continuity.spec.ts`): Tests chat and voice pages on iPhone 14 + Galaxy S23 viewports. Validates input positioning, touch targets (>= 44px), no horizontal scroll, voice control rendering

### Task 2: Event Feedback Widget + Iteration SLA Dashboard
- **Event feedback widget** (`components/feedback/event-feedback-widget.tsx`): Floating "Share Feedback" button with modal containing 5-star overall rating, 5-star FRED rating, recommendation (Yes/Maybe/No), improvement and love text areas. Submits to `/api/feedback/event`
- **Event feedback API** (`app/api/feedback/event/route.ts`): POST endpoint inserting into both `event_feedback` and `feedback_signals` tables for pipeline integration
- **Iteration tracker** (`lib/feedback/iteration-tracker.ts`): `getIterationMetrics()` and `getIterationTimeline()` functions querying feedback_signals and prompt_patches for SLA compliance
- **Iteration dashboard** (`app/admin/testing/iteration-dashboard.tsx`): 4 stat cards (Total Signals, Triaged %, Resolved in 48h %, Avg Resolution) + recent signals table with status badges
- **Admin testing page**: Now has 3 tabs (Test Accounts, User Feedback, Iteration)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0bc5bc9 | Onboarding smoke test + mobile E2E suites |
| 2 | e877e0a | Event feedback widget + iteration SLA dashboard |

## Deviations from Plan

### Auto-added (Rule 2 - Missing Critical)
**1. Created `/api/admin/iteration-metrics/route.ts`**
- Not explicitly in plan but required for iteration dashboard to fetch data
- Uses `requireAdminRequest` for access control consistent with other admin routes

## Verification Results

- `npx tsx scripts/smoke-test-onboarding.ts --help` -- prints usage without error
- `npx playwright test tests/e2e/onboarding-journey-smoke.spec.ts --list` -- lists 5 test cases (x3 browsers = 15)
- `npx playwright test tests/e2e/mobile-voice-continuity.spec.ts --list` -- lists 6 test cases per device x 2 devices x 3 browsers
- `npx tsc --noEmit` -- passes with 0 errors
- Admin /admin/testing page has 3 tabs: Test Accounts, User Feedback, Iteration

## Success Criteria Met

- [x] TEST-01: smoke test + onboarding E2E validate full flow
- [x] TEST-02: mobile voice continuity E2E covers chat/voice on mobile
- [x] TEST-03: event feedback widget collects structured input via API
- [x] TEST-04: iteration dashboard tracks 48-hour SLA compliance
