---
phase: 65-mobile-ux-polish
plan: 01
subsystem: pwa-service-worker
tags: [serwist, pwa, service-worker, offline, push-notifications]
dependency-graph:
  requires: [22-pwa-mobile-polish]
  provides: [serwist-managed-sw, auto-precache-manifest, offline-fallback]
  affects: [65-02, 65-03, 65-04]
tech-stack:
  added: ["@serwist/next@9.5.6", "serwist@9.5.6"]
  patterns: ["Serwist precache manifest injection", "Serwist+Sentry config wrapping order"]
key-files:
  created: ["app/sw.ts"]
  modified: ["next.config.mjs", "app/providers.tsx", "tsconfig.json", ".gitignore"]
  removed: ["public/sw.js (from git tracking, now auto-generated)"]
decisions:
  - id: "65-01-d1"
    description: "Serwist wraps inner, Sentry wraps outer in next.config.mjs"
  - id: "65-01-d2"
    description: "Push handlers placed BEFORE serwist.addEventListeners() to ensure registration"
  - id: "65-01-d3"
    description: "Serwist disabled in development mode (Turbopack incompatible)"
metrics:
  duration: "4 minutes"
  completed: "2026-02-24"
---

# Phase 65 Plan 01: Serwist PWA Service Worker Migration Summary

Migrated from hand-rolled public/sw.js to Serwist-managed app/sw.ts with automatic precache manifest injection, runtime caching strategies, navigation preload, and offline fallback -- preserving all push notification handlers.

## What Was Done

### Task 1: Install Serwist and create app/sw.ts
- Installed `@serwist/next@9.5.6` and `serwist@9.5.6`
- Created `app/sw.ts` with Serwist precaching, `defaultCache` runtime strategies, and `/offline` document fallback
- Preserved push notification handlers (`push` and `notificationclick` events) from the old SW
- Added old `sahara-*` cache cleanup on activation to prevent stale data
- Commit: `54b5c99`

### Task 2: Update build pipeline and configuration
- Wrapped `next.config.mjs` with `withSerwistInit` (inner) then `withSentryConfig` (outer)
- Added git revision-based precache entry for `/offline` route
- Removed `ServiceWorkerRegistrar` component from `app/providers.tsx` (Serwist auto-registers)
- Added `webworker` to `tsconfig.json` lib array and `@serwist/next/typings` to types
- Added `public/sw.js` to tsconfig exclude (auto-generated)
- Added Serwist generated files to `.gitignore`
- Removed `public/sw.js` from git tracking
- Verified `npm run build` succeeds and generates Serwist-managed `public/sw.js`
- Commit: `a12803d`

## Verification Results

- Build generates `public/sw.js` from Serwist (confirmed)
- Generated SW contains precache entries and `/offline` fallback (confirmed)
- Generated SW contains push notification handlers (confirmed)
- Generated SW contains `sahara-` cache cleanup (confirmed)
- `app/providers.tsx` has no ServiceWorkerRegistrar reference (confirmed)
- TypeScript config includes webworker lib and Serwist typings (confirmed)

## Decisions Made

1. **Serwist wraps inner, Sentry outer** -- Ensures SW compilation happens before Sentry source map upload. Both use webpack config hooks.
2. **Push handlers before addEventListeners()** -- Custom event listeners must be registered before Serwist's own listeners to ensure they are not overridden.
3. **Serwist disabled in dev** -- `disable: process.env.NODE_ENV === "development"` prevents Turbopack incompatibility issues in development.

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

Plan 65-02 (animations), 65-03 (accessibility), and 65-04 (push reliability) can proceed. The Serwist SW is now the foundation for all subsequent PWA work in this phase.
