---
phase: 05-auth-onboarding-fix
verified: 2026-02-05T19:00:00Z
status: gaps_found
score: 3/6 must-haves verified
gaps:
  - truth: "Supabase auth.signUp() no longer returns 500 Database error"
    status: failed
    reason: "Code is correct but Supabase credentials in .env are placeholders (xxx.supabase.co, eyJ...). All auth SDK calls will fail at runtime with connection/API errors. The SQL migration and trigger were created for Supabase but run against Neon instead, so the auth.users trigger does not exist."
    artifacts:
      - path: "lib/db/migrations/032_profiles_table_trigger.sql"
        issue: "Migration references auth.users and auth.uid() which only exist in Supabase, not Neon. Trigger was not applied to a Supabase instance."
      - path: ".env"
        issue: "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co and keys are placeholders"
    missing:
      - "Real Supabase project credentials in .env (URL, anon key, service role key)"
      - "Migration SQL actually executed in real Supabase SQL Editor"
  - truth: "Auth sessions are refreshed on every navigation (no silent expiry)"
    status: failed
    reason: "proxy.ts correctly calls updateSession() and protects routes, but updateSession() connects to placeholder Supabase URL. No session can be created or refreshed until real credentials exist."
    artifacts:
      - path: "proxy.ts"
        issue: "Code is correct but will fail at runtime due to placeholder Supabase credentials"
    missing:
      - "Real Supabase credentials for updateSession() to reach a real Supabase instance"
  - truth: "Onboarding flow results in a persistent, authenticated session"
    status: failed
    reason: "The full flow /get-started -> /api/onboard -> supabase.auth.signUp() -> /dashboard cannot complete because supabase.auth.signUp() will fail against placeholder URL. Code is structurally correct but blocked by infrastructure."
    artifacts:
      - path: "app/get-started/page.tsx"
        issue: "Code is correct (password collected, sent to API) but runtime will fail"
      - path: "app/api/onboard/route.ts"
        issue: "Code is correct (password required, signUp called) but runtime will fail"
    missing:
      - "Real Supabase credentials to enable the runtime auth flow"
---

# Phase 05: Auth & Onboarding Fix Verification Report

**Phase Goal:** Fix Supabase auth (500 error on user creation), onboarding password flow (random password user never sees), and ensure signup -> onboarding -> dashboard E2E flow works with persistent authenticated sessions.
**Verified:** 2026-02-05T19:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Supabase auth.signUp() no longer returns 500 Database error | FAILED | Code changes correct but .env has placeholder Supabase credentials (xxx.supabase.co). Auth SDK cannot connect. Migration SQL exists but was applied to Neon, not Supabase -- the auth.users trigger only works in Supabase. |
| 2 | User can sign up with a real password they choose | VERIFIED (code) | `app/get-started/page.tsx` line 60: `password` state, line 199: validation (min 6 chars), line 213: sent in fetch body. `app/api/onboard/route.ts` line 77-82: rejects if password missing/short, line 83: `const userPassword = password` (no randomUUID). |
| 3 | User can log back in with the password they chose during signup | VERIFIED (code) | `app/login/page.tsx` collects email+password, POSTs to `/api/auth/login`. `/api/auth/login/route.ts` calls `signIn()` which calls `supabaseSignIn()` which calls `supabase.auth.signInWithPassword()`. Full chain verified. |
| 4 | Dashboard sidebar shows the actual authenticated user's name, email, and tier | VERIFIED (code) | `app/dashboard/layout.tsx` line 143-160: useEffect fetches `supabase.auth.getUser()`, queries profiles for name+tier, sets state. Line 162-166: `user` object derives from real data. Line 182: avatar guard `(user.name \|\| "?")`. No hardcoded "Fred Cary" or "founder@startup.com". |
| 5 | Auth sessions are refreshed on every navigation | FAILED | `proxy.ts` correctly calls `updateSession(request)` from `lib/supabase/middleware.ts` which calls `supabase.auth.getUser()`. But placeholder Supabase URL means no real connection. |
| 6 | /onboarding redirects unauthenticated users to /get-started | VERIFIED (code) | `app/onboarding/page.tsx` line 34-45: useEffect calls `supabase.auth.getUser()`, redirects to `/get-started` if no user. Loading guard at line 48 prevents content flash. |

**Score:** 3/6 truths verified at code level; 0/6 verified at runtime (all blocked by placeholder credentials)

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `proxy.ts` | Root proxy for session refresh + route protection | YES (37 lines) | YES - imports updateSession, protects 6 route prefixes, redirects to /login with redirect param | YES - imported by Next.js runtime | VERIFIED |
| `lib/db/migrations/032_profiles_table_trigger.sql` | SQL for profiles table + auth trigger | YES (69 lines) | YES - DROP TRIGGER, CREATE TABLE with 10 columns, RLS policies, trigger function, CREATE TRIGGER | PARTIAL - file exists but not applied to real Supabase | VERIFIED (artifact), PARTIAL (execution) |
| `app/get-started/page.tsx` | Signup flow with password collection | YES (575 lines) | YES - Lock icon imported, password state, password input, client-side validation (min 6), password in fetch body | YES - POSTs to /api/onboard with password field | VERIFIED |
| `app/api/onboard/route.ts` | Onboard API requiring password for new users | YES (158 lines) | YES - line 77-82 validates password, line 83 uses user password directly, no crypto.randomUUID | YES - called by /get-started, calls supabase.auth.signUp | VERIFIED |
| `app/dashboard/layout.tsx` | Dashboard layout using real auth user data | YES (297 lines) | YES - useEffect with supabase.auth.getUser(), profile query, avatar guard, dynamic tier from useTier() | YES - renders children, uses createClient from supabase/client | VERIFIED |
| `app/onboarding/page.tsx` | Onboarding page with auth gate | YES (143 lines) | YES - useEffect auth check, redirect to /get-started, loading state guard | YES - uses createClient, useRouter | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | `lib/supabase/middleware.ts` | `import updateSession` | VERIFIED | Line 2: `import { updateSession } from "@/lib/supabase/middleware"`. updateSession function exists and returns `{ response, user }`. |
| `app/get-started/page.tsx` | `/api/onboard` | `fetch POST with password` | VERIFIED | Lines 208-218: `fetch("/api/onboard", { method: "POST", body: JSON.stringify({ ...password: password... }) })`. Response handled, errors displayed. |
| `app/api/onboard/route.ts` | `supabase.auth.signUp` | password parameter | VERIFIED | Line 85-95: `supabase.auth.signUp({ email, password: userPassword })`. No randomUUID fallback. Line 77-82 rejects if password missing. |
| `app/dashboard/layout.tsx` | `supabase.auth.getUser` | useEffect fetch | VERIFIED | Line 146: `const { data: { user: authUser } } = await supabase.auth.getUser()`. Profile queried at line 148-152. |
| `app/login/page.tsx` | `/api/auth/login` | `fetch POST` | VERIFIED | Line 30-34: `fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })`. |
| `/api/auth/login/route.ts` | `signIn()` | import from lib/auth | VERIFIED | Line 2: `import { signIn } from "@/lib/auth"`. signIn -> supabaseSignIn -> supabase.auth.signInWithPassword. Full chain traced. |
| `app/onboarding/page.tsx` | `/get-started` | router.replace on no auth | VERIFIED | Line 39: `router.replace("/get-started")` when `!user`. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.env` | 26-28 | Placeholder credentials (xxx.supabase.co, eyJ...) | BLOCKER | All Supabase auth SDK calls fail at runtime -- signUp, signIn, getUser, session refresh |

No TODO/FIXME/placeholder patterns found in any code artifacts. No stub implementations. No empty handlers.

### Human Verification Required

### 1. Real Supabase Credentials Test
**Test:** Configure real Supabase project URL and keys in .env, then attempt signup at /get-started with email and password.
**Expected:** User is created in Supabase auth, session cookie is set, user lands on /dashboard with their name and email in the sidebar.
**Why human:** Cannot verify runtime auth flow without real Supabase instance credentials.

### 2. Login Persistence Test
**Test:** After signing up, close the browser tab, reopen /dashboard.
**Expected:** User is still authenticated (session persists via cookie). Proxy.ts refreshes the token on each request.
**Why human:** Session persistence and cookie behavior require a real browser and real Supabase instance.

### 3. Login with Chosen Password
**Test:** After signing up, sign out, then visit /login and enter the email and password used during signup.
**Expected:** User is signed in and redirected to /dashboard.
**Why human:** Requires real Supabase instance to verify password storage and retrieval.

### 4. Visual Verification of Password Field
**Test:** Visit /get-started, proceed to Step 3.
**Expected:** Password input field appears below email input with Lock icon and placeholder "Create a password (6+ chars)".
**Why human:** Visual layout and styling cannot be verified programmatically.

### Gaps Summary

The phase 05 code changes are structurally complete and correct. Every artifact exists, is substantive (no stubs), and is wired to the system. The specific fixes delivered:

1. **Random password removed:** `crypto.randomUUID()` no longer used in `/api/onboard/route.ts`. Password is required (min 6 chars) for new user creation, validated both client-side and server-side.

2. **Password field added:** `/get-started` Step 3 now collects both email and password. Password is sent to the API.

3. **Dashboard uses real auth data:** Layout fetches `supabase.auth.getUser()` and queries profiles table. No hardcoded "Fred Cary" or "founder@startup.com".

4. **Proxy protects routes:** `proxy.ts` calls `updateSession()` on every request, protects /dashboard, /chat, /agents, /documents, /settings, /profile, and /api/protected routes.

5. **Onboarding auth gate:** `/onboarding` redirects unauthenticated users to `/get-started`.

6. **Migration SQL created:** Complete SQL for profiles table, RLS policies, and auth trigger.

**However, the blocking gap is infrastructure, not code:** The `.env` file contains placeholder Supabase credentials (`https://xxx.supabase.co`, `eyJ...`). Until real credentials are configured:
- `supabase.auth.signUp()` will fail (cannot reach a real Supabase instance)
- `supabase.auth.signInWithPassword()` will fail
- `supabase.auth.getUser()` will fail
- Session refresh in proxy.ts will fail
- The migration SQL needs to be run in a real Supabase SQL Editor

This is a pre-existing infrastructure issue documented in both SUMMARY files. The code is ready; the environment is not.

---

_Verified: 2026-02-05T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
