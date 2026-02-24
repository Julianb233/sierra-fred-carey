---
phase: 65-mobile-ux-polish
plan: 04
subsystem: push-notifications
tags: [push, pwa, ios, retry, exponential-backoff, mobile]

dependency_graph:
  requires: ["65-01"]
  provides: ["push-subscription-retry", "ios-pwa-detection", "denied-permission-ui"]
  affects: []

tech_stack:
  added: []
  patterns: ["exponential-backoff-retry", "ios-standalone-detection", "permission-state-machine"]

key_files:
  created: []
  modified:
    - lib/hooks/use-push-subscription.ts
    - components/settings/NotificationSettings.tsx

decisions:
  - id: "65-04-01"
    decision: "Retry uses subscribeWithRetry helper with 3 attempts and 1s/2s/4s exponential backoff"
    rationale: "Isolated retry logic keeps hook clean; 3 retries covers transient network failures without excessive delay"
  - id: "65-04-02"
    decision: "Track actual PushSubscription object instead of boolean flag"
    rationale: "Enables future features like subscription details display without additional API calls"
  - id: "65-04-03"
    decision: "iOS non-standalone check comes before denied-permission check in UI"
    rationale: "iOS users who haven't installed the PWA can't use push at all, so showing install guidance first is more actionable"

metrics:
  duration: "~5 minutes"
  completed: "2026-02-24"
---

# Phase 65 Plan 04: Push Notification Hardening Summary

Push subscription hook now retries with exponential backoff (3 attempts, 1s/2s/4s delays), tracks permission state as a typed enum, and detects iOS standalone mode for PWA guidance.

## What Was Done

### Task 1: Push Subscription Hook Enhancement
- Added `subscribeWithRetry()` helper with exponential backoff (1s, 2s, 4s) for up to 3 attempts
- Added `permissionState` tracking (`default | granted | denied | unsupported`) replacing the old `isSupported` + `permission` split
- Added `detectIsIOS()` and `detectIsIOSStandalone()` helpers for iOS PWA detection
- Hook now tracks the actual `PushSubscription` object (not just boolean)
- Subscribe function early-returns as no-op when permission is `denied`
- **Commit:** `3d76d2b`

### Task 2: NotificationSettings UI States
- **Denied permission:** Amber warning card with step-by-step re-enable instructions (lock icon, change to Allow, reload)
- **iOS non-standalone:** Blue info card with PWA install steps (Share, Add to Home Screen, open from home screen)
- **Unsupported browser:** Gray card with "not supported" message
- Loading spinner already present on subscribe button (using hook's `isLoading`)
- **Commit:** `09b558f`

## Decisions Made

1. **Retry helper isolation** -- `subscribeWithRetry` is a standalone async function, not embedded in the hook callback, for clarity and testability
2. **PushSubscription object tracking** -- Hook stores the actual subscription object instead of a boolean, enabling future subscription-detail features
3. **iOS check priority** -- iOS non-standalone check appears before denied-permission in the UI cascade, since PWA installation is a prerequisite for iOS push

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npm run build` succeeds (208 pages)
- Hook returns `permissionState`, `isIOS`, `isIOSStandalone`
- NotificationSettings handles denied/iOS/unsupported states with actionable guidance
- Retry logic uses exponential backoff (1s, 2s, 4s)
