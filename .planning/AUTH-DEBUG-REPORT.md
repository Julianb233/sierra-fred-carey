# Auth Debug Report

## Overview

Full audit of the Sahara auth flow: sign-up, profile creation, login, and session management.

---

## Architecture Summary

- **Auth provider**: Supabase Auth (email/password)
- **Database**: Neon PostgreSQL via Supabase client
- **Session management**: Supabase SSR cookies, refreshed in Next.js middleware
- **Barrel file**: `lib/auth.ts` re-exports `signIn`, `signUp`, `signOut`, `getCurrentUser`, etc. from `lib/supabase/auth-helpers.ts`
- **Signup UI flow**: `/signup` redirects to `/get-started` (onboarding wizard), which POSTs to `/api/onboard`
- **Login UI flow**: `/login` page POSTs to `/api/auth/login`
- **Profile table**: `public.profiles` with columns: id, email, name, stage, challenges, teammate_emails, tier, onboarding_completed, created_at, updated_at

## Findings

### BUG 1 (CRITICAL): Missing database columns cause profile creation to fail silently

The `createOrUpdateProfile` function in `lib/supabase/auth-helpers.ts` (line 261-282) writes these columns:
- `industry`, `revenue_range`, `team_size`, `funding_history`, `enriched_at`, `enrichment_source`

**These columns do NOT exist in the `profiles` table.** The table only has: id, email, name, stage, challenges, teammate_emails, tier, onboarding_completed, created_at, updated_at.

**Impact**: Any call to `supabaseSignUp()` (from `lib/auth.ts`) will fail because `createOrUpdateProfile` tries to upsert non-existent columns. The error is caught and the auth user is cleaned up (deleted), so signup via `signUp()` always fails.

**However**: The `/api/onboard` route does NOT use `supabaseSignUp()`. It calls `supabase.auth.signUp()` directly and then does its own `profiles` upsert with only valid columns (plus optional enrichment fields). So the onboard route has the SAME bug -- if enrichment fields (industry, revenueRange, etc.) are provided, the upsert will fail. But for the quick onboard flow from `/get-started`, those fields are not sent, so it works.

### BUG 2 (CRITICAL): No dedicated `/api/auth/signup` route

There is no `app/api/auth/signup/route.ts`. The only signup path is `/api/onboard`. This means:
- The `signUp()` function exported from `lib/auth.ts` is usable server-side but there's no API route that calls it
- Any client code trying to POST to `/api/auth/signup` will get a 404
- The onboard route duplicates signup logic instead of using the shared `signUp()` function

### BUG 3 (MODERATE): Email confirmation may block login

Supabase projects have email confirmation enabled by default. When `supabase.auth.signUp()` is called:
- If email confirmation is required, `data.session` will be `null` (user must verify email first)
- The `/api/onboard` route does not check for this -- it proceeds to create a profile and returns success
- But the user cannot log in until they confirm their email
- The UI redirects to `/dashboard?welcome=true` immediately after signup, which will fail if the user has no session

**Current status**: Cannot determine if email confirmation is enabled without checking the Supabase dashboard settings. If it IS enabled, signup appears to succeed but users cannot actually use the app.

### BUG 4 (MODERATE): `createOrUpdateProfile` uses anon key client, not service role

In `lib/supabase/auth-helpers.ts` line 259, `createOrUpdateProfile` uses `createClient()` (anon key with user cookies). If RLS is enabled on the `profiles` table and the policy requires the user to be authenticated, a brand-new user might not have a valid session cookie yet when this is called during signup. The `/api/onboard` route has the same pattern.

This could cause profile creation to fail if RLS policies are strict.

### BUG 5 (LOW): Orphan cleanup uses wrong client in onboard route

In `/api/onboard/route.ts` line 289, orphan auth user cleanup calls `supabase.auth.admin.deleteUser(userId)` but `supabase` is the anon-key client. The `admin.deleteUser` API requires the service role key. This call will silently fail, leaving orphaned auth users.

Compare with `lib/supabase/auth-helpers.ts` line 99 which correctly uses `createServiceClient()` for cleanup.

### BUG 6 (LOW): `/signup` not in public routes list

`lib/auth/middleware-utils.ts` defines public routes but `/signup` is not listed (only `/register` is). However, `/signup` just redirects to `/get-started`, which is also not in the public routes list. Since neither is in the protected routes list either, they default to "no auth required" (line 125: unspecified routes don't require auth). So this is not a blocking issue but is inconsistent.

### OBSERVATION: 0 profiles in database

`SELECT count(*) FROM profiles` returns 0. No users have been successfully created yet.

---

## Auth Flow Summary

### Signup Flow (working path):
1. User visits `/signup` -> redirects to `/get-started`
2. User selects stage, challenge, enters email + password
3. Client POSTs to `/api/onboard` with `isQuickOnboard: true`
4. Server calls `supabase.auth.signUp()` with user metadata
5. Server creates profile via `supabase.from("profiles").upsert()`
6. Returns success; client redirects to `/dashboard?welcome=true`

### Login Flow:
1. User visits `/login`
2. Client POSTs to `/api/auth/login` with email + password
3. Server calls `signIn()` from `lib/auth.ts` -> `supabaseSignIn()`
4. Supabase sets session cookies automatically
5. Returns user data; client redirects to dashboard

### Session Management:
1. Root `middleware.ts` runs on every request
2. Calls `updateSession()` from `lib/supabase/middleware.ts`
3. This refreshes the Supabase auth token via `getUser()`
4. Protected routes redirect to `/login` if no user session

---

## Recommendations (Priority Order)

1. **Add missing columns to profiles table** OR **remove enrichment fields from `createOrUpdateProfile`** in auth-helpers.ts. The latter is simpler since those fields are NULL defaults anyway.
2. **Create `/api/auth/signup` route** that delegates to `signUp()` from `lib/auth.ts` for a clean API.
3. **Check Supabase email confirmation setting** -- if enabled, either disable it for dev or handle the "email not confirmed" state in the UI.
4. **Fix orphan cleanup in `/api/onboard`** to use service role client.
5. **Consider using service role client for profile creation** during signup to avoid RLS issues.

---

## Fix Applied (2026-02-18)

### Root Cause Confirmed: BUG 4 was the active 500 cause

After BUG 1 was fixed (enrichment columns removed in commit `61b18b1`) and BUG 2 was fixed (signup route created in commit `150eaae`), the remaining 500 was caused by **BUG 4**: `createOrUpdateProfile()` used the anon/cookie-based client (`createClient()`), but during signup the user's session cookie doesn't exist yet. RLS blocks the profile INSERT, the error propagates, and the route returns 500.

### Evidence
- Direct Supabase auth signup (`POST /auth/v1/signup`) succeeds -- Supabase Auth is healthy.
- The API route (`POST /api/auth/signup`) returns 500 -- the bug is in our code, not Supabase config.
- All env vars (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) are present.

### Fix (commit `71cdece`)
Changed `createOrUpdateProfile()` in `lib/supabase/auth-helpers.ts` to use `createServiceClient()` instead of `createClient()`. The service role client bypasses RLS, which is appropriate for this admin-level profile creation during signup.

### Status
- Build passes.
- Needs deployment to Vercel to verify on the live site.

---

## Fix 2: /get-started redirects to /login (P0) — 2026-02-18

### Root Cause

`vercel.json` had duplicate security headers that overrode the CSP in `next.config.mjs`. The `vercel.json` CSP was missing `'unsafe-eval'`, while the Supabase client bundle uses `Function()` for internal template compilation. When `'unsafe-eval'` is blocked by CSP, this `Function()` call throws an EvalError during Supabase client initialization (triggered by AnalyticsProvider's `getSession()` call in the root layout). This crashes the React component tree during hydration, causing Next.js to redirect to `/login`.

### Evidence
- Server returns 200 with correct `/get-started` HTML (confirmed via curl)
- Browserbase: page loads at `/get-started`, then ~3s later redirects to `/login`
- Live CSP (from vercel.json): `script-src 'self' 'unsafe-inline' ...` (NO `'unsafe-eval'`)
- Config CSP (next.config.mjs): `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...`
- Supabase bundle chunk uses `compile(){return Function(...)}` outside try/catch

### Fix (commit `e78b277`)
1. Removed duplicate headers from `vercel.json` — `next.config.mjs` is the single source of truth
2. Added Vercel domains to `next.config.mjs` CSP script-src

### Status
- Build passes.
- Needs deployment to verify on live site.
