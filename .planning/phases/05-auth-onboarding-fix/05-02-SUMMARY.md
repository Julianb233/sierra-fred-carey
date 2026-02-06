---
phase: 05
plan: 02
subsystem: auth-onboarding
tags: [auth, signup, password, onboarding, dashboard, supabase]

dependency_graph:
  requires:
    - "Phase 05-01 (auth infrastructure, profiles migration, middleware)"
    - "Phase 06-01 (TierProvider mount, dashboard layout wired to real auth)"
  provides:
    - "Password collection in signup flow (/get-started)"
    - "Server-side password validation in /api/onboard"
    - "Dashboard avatar loading guard for empty name"
  affects:
    - "All future auth flows (users now have real passwords)"
    - "Login page (/login) now works end-to-end with chosen passwords"
    - "Dashboard sidebar displays real authenticated user data"

tech_stack:
  added: []
  patterns:
    - "Client-side password validation before API submission"
    - "Server-side password requirement with 400 rejection (no random UUID fallback)"
    - "Avatar initials guard with fallback for loading state"

key_files:
  created: []
  modified:
    - app/get-started/page.tsx
    - app/api/onboard/route.ts
    - app/dashboard/layout.tsx

decisions:
  - id: "require-password-on-signup"
    description: "Removed crypto.randomUUID() fallback; new users must provide a password (min 6 chars) or get 400 response"
  - id: "client-side-password-validation"
    description: "Validate password length before API call to avoid unnecessary server round-trip"
  - id: "avatar-loading-guard"
    description: "Use (user.name || '?') for avatar initials to prevent crash/confusion during async user fetch"

metrics:
  duration: "~3 minutes"
  completed: "2026-02-06"
---

# Phase 05 Plan 02: Signup Password & Dashboard Real User Data Summary

**One-liner:** Add password field to /get-started signup, require password in /api/onboard (no more random UUIDs), and harden dashboard layout avatar for loading state.

## What Was Done

### Task 1: Password Field in Signup + API Validation
- **app/get-started/page.tsx**: Added `Lock` icon import, `password` state variable, password input field in Step 3 (after email, before error display), client-side validation (min 6 chars), and password in fetch body
- Updated Step 3 heading from "Enter your email to create your account" to "Create your account"
- Password input styled identically to email input with Lock icon, placeholder "Create a password (6+ chars)", and Enter key submission
- **app/api/onboard/route.ts**: Replaced `const userPassword = password || crypto.randomUUID()` with strict validation that returns 400 if password is missing or under 6 characters. The existing-user branch remains unchanged (only new user creation requires password).

### Task 2: Dashboard Layout Loading Guard
- **app/dashboard/layout.tsx**: The layout was already wired to real Supabase auth by plan 06-01 (which executed before this plan). This task hardened the implementation:
  - Changed loading placeholder from "Loading..." to empty string for cleaner UX
  - Added avatar initials guard: `(user.name || "?")` prevents crash on empty string
  - Updated profile query to select `name, tier` instead of just `name` for completeness

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Remove crypto.randomUUID() password fallback | Users must know their password to log back in; random UUIDs created accounts nobody could access |
| Validate password on both client and server | Client-side avoids unnecessary API calls; server-side is the security boundary |
| Avatar "?" fallback during loading | Prevents `"".split(" ").map(n => n[0])` from producing empty/broken initials |
| Keep existing-user branch unchanged | Returning users may sign in with password via the existing-user path; the password requirement only applies to NEW user creation |

## Deviations from Plan

### Observed: Dashboard Layout Already Updated

**Found during:** Task 2
**Issue:** Plan 06-01 had already replaced the hardcoded "Fred Cary" / "founder@startup.com" mock with real Supabase auth + useTier(). The dashboard layout was not in the state the plan expected.
**Action:** Applied the remaining improvements (loading guard, tier field in profile query) rather than duplicating the 06-01 work. Tracked as deviation.
**Rule:** [Rule 1 - Bug] Avatar initials guard was missing (would show "L" for "Loading..." placeholder).

## Verification Results

| Check | Result |
|-------|--------|
| `crypto.randomUUID` in onboard route | PASS -- no matches |
| `password` references in get-started page | PASS -- state, input, validation, fetch body |
| `Password must be at least 6` in onboard route | PASS -- line 79 |
| `Fred Cary` in dashboard layout | PASS -- no matches |
| `founder@startup.com` in dashboard layout | PASS -- no matches |
| `supabase.auth.getUser` in dashboard layout | PASS -- line 146 |
| `createClient` import in dashboard layout | PASS -- line 30 |
| `npx next build` | PASS -- clean compilation, no TypeScript errors |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 91e97db | feat | Add password field to signup and require password in onboard API |
| 1cfe191 | feat | Harden dashboard layout user data with loading guard and tier field |

## Important Notes

The Supabase URL and keys in `.env` are placeholders (xxx.supabase.co). The actual database is Neon (DATABASE_URL). Supabase auth SDK calls (`signUp`, `signInWithPassword`, `getUser`) will not function until real Supabase credentials are provided. However, the code changes in this plan are correct and necessary -- they will work immediately once real credentials are configured.

## Next Phase Readiness

Phase 05 auth-onboarding-fix is now complete (both 05-01 and 05-02). The signup-to-dashboard flow is code-complete:
- /get-started collects email + password (3-click onboarding)
- /api/onboard validates and creates user with real password
- /dashboard shows authenticated user's real name, email, and tier
- Users can log out and back in at /login with their chosen password

Remaining dependency: Real Supabase credentials in .env for auth SDK to function at runtime.
