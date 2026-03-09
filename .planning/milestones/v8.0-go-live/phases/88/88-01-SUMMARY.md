---
phase: 88-event-launch-kit
plan: 01
subsystem: event-signup
tags: [event, auth, session, onboarding, mobile]
requires: [77, 78, 79]
provides: [end-to-end-event-signup-flow, auto-login, welcome-redirect]
affects: []
tech-stack:
  added: []
  patterns: [admin-createUser-plus-signInWithPassword, client-session-hydration]
key-files:
  created: []
  modified:
    - lib/event/config.ts
    - app/api/event/register/route.ts
    - components/event/event-signup-form.tsx
    - components/event/event-landing.tsx
    - app/event/[slug]/layout.tsx
decisions:
  - key: event-redirect-target
    value: "/welcome instead of /dashboard for guided journey entry"
  - key: session-hydration-approach
    value: "signInWithPassword on server, return tokens, setSession on client"
  - key: viewport-no-zoom
    value: "maximumScale=1, userScalable=false for kiosk-like mobile usage"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-09"
---

# Phase 88 Plan 01: Event Signup Flow Wiring Summary

End-to-end event signup with auto-login, session hydration, and /welcome redirect for guided onboarding journey.

## What Was Done

### Task 1: Fix event registration redirect and auto-login
- Changed `redirectAfterSignup` from `/dashboard` to `/welcome` in event config
- Added `signInWithPassword` step after `admin.createUser` in registration API to create a client-usable session
- Return `access_token` and `refresh_token` in API response
- Client-side `setSession` call hydrates the browser Supabase client before redirect
- Added `journey_welcomed: false` to profile upsert so /welcome page shows welcome screen
- Updated fallback redirect from `/onboarding` to `/welcome`

### Task 2: Mobile polish and viewport meta
- Added `viewport` export to event layout with `maximumScale=1`, `userScalable=false`, `themeColor: "#0a0a0a"`
- Changed `router.push` to `router.replace` in event landing to prevent back-navigation to signup

## Decisions Made

1. **Session hydration via tokens**: Server creates session with signInWithPassword, returns tokens to client which calls setSession. This avoids cookie-setting complexity in API routes.
2. **No-zoom viewport**: Critical for event kiosk-like usage where founders scan QR and sign up on their phones.
3. **router.replace**: Prevents confusing back-to-signup navigation after registration completes.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 656bbfe | feat(event): wire auto-login and /welcome redirect for event signup |
| 5d65298 | feat(event): mobile viewport and navigation polish for event landing |
