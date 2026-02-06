# Phase 05: Auth & Onboarding Fix - Research

**Researched:** 2026-02-05
**Domain:** Supabase Auth, Next.js App Router session management, onboarding flows
**Confidence:** HIGH

## Summary

The project has three interrelated auth/onboarding issues that all stem from a partially-implemented Supabase Auth integration. Through code analysis and Supabase documentation research, I identified the root causes with high confidence:

1. **SUPABASE-AUTH (500 error):** The Supabase project almost certainly has a trigger on `auth.users` that tries to insert into a `public.profiles` table. However, no migration in this codebase creates that table -- meaning either (a) the trigger references a non-existent table, or (b) the table was created manually but with mismatched columns. Both cause the trigger to fail, which rolls back the entire user-creation transaction and surfaces as "Database error saving new user" (500).

2. **ONBOARD-AUTH (random password):** The `/get-started` flow calls `/api/onboard` which creates users with `crypto.randomUUID()` as the password (line 77 of `route.ts`). The user never sees this password. After the session cookie expires, the user cannot log back in because they don't know their password.

3. **Missing middleware:** There is NO root `middleware.ts` file in the project. The Supabase SSR pattern requires middleware to refresh auth tokens on every request. Without it, sessions expire and are never refreshed, making auth fragile even when signup works.

**Primary recommendation:** Fix the Supabase database trigger/profiles table first (unblocks everything), then fix the onboarding flow to collect a real password, then add root middleware for session refresh.

## Standard Stack

The project already uses the correct Supabase libraries. No new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.89.0 | Supabase client | Already installed, current |
| `@supabase/ssr` | 0.8.0 | Server-side auth with cookies | Already installed, current |
| `next` | 16.1.1 | Framework | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 | Validation | Already installed, use for signup form validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | Stack Auth (env vars present) | Stack Auth keys are in .env.local but NOT used in codebase. Supabase Auth is fully wired. Stick with Supabase. |
| Supabase Auth | Clerk (env vars in .env) | Clerk keys are in .env template but NOT used. Ignore. |
| Email+password | Magic links | Simpler UX but requires email delivery setup. Could add later as enhancement. |

**Installation:** No new packages needed. Everything is already installed.

## Architecture Patterns

### Current Architecture (traced from code)

```
FLOW 1: /get-started (Quick Onboard) - THE PROBLEMATIC FLOW
=========================================================
1. User lands on /get-started (app/get-started/page.tsx)
2. Step 1: Select startup stage (client state only)
3. Step 2: Select challenge (client state only)
4. Step 3: Enter email ONLY (no password field!)
5. Submit -> POST /api/onboard with { email, stage, challenges, isQuickOnboard: true }
6. /api/onboard (route.ts):
   a. If profile exists -> update profile, try signInWithPassword (will fail - no password sent)
   b. If new user -> supabase.auth.signUp({ email, password: crypto.randomUUID() })
      ^^^ THIS IS THE BUG: random password user never sees
   c. Creates profile record via supabase.from("profiles").upsert(...)
7. On success -> shows "wink" celebration -> redirects to /dashboard?welcome=true

FLOW 2: /onboarding (Multi-Step Wizard) - NO AUTH AT ALL
========================================================
1. User lands on /onboarding (app/onboarding/page.tsx)
2. Uses useOnboarding() hook -> localStorage-only state (NO server/auth calls)
3. Steps: welcome -> startup-info -> fred-intro -> complete
4. Complete step links to /dashboard, /chat, /dashboard/history
5. NO user creation, NO API calls, NO auth whatsoever
   ^^^ This flow is purely client-side localStorage. It doesn't create users.

FLOW 3: /signup -> Redirects to /get-started
=============================================
1. app/signup/page.tsx immediately does router.replace("/get-started")

FLOW 4: /login (Standard email+password)
==========================================
1. Collects email + password
2. POST /api/auth/login -> signIn(email, password) -> supabase.auth.signInWithPassword
3. On success -> router.push(redirect || "/dashboard")

FLOW 5: /api/auth/signup (Standard signup API)
===============================================
1. Accepts email + password (required)
2. signUp(email, password, name, stage, challenges)
3. BUT: No UI page calls this API! /signup redirects to /get-started instead.

DASHBOARD AUTH CHECK:
====================
1. app/dashboard/page.tsx calls supabase.auth.getUser() client-side
2. If no user -> router.push("/login")
3. Dashboard layout (layout.tsx) has HARDCODED mock user data (line 139-144)
   - user.name = "Fred Cary", email = "founder@startup.com", tier = 0
   - This means the sidebar NEVER shows real user data
```

### Recommended Fix Architecture

```
/signup (or /get-started)
  |
  v
Collect: email + password + name + stage + challenge
  |
  v
POST /api/auth/signup (or POST /api/onboard with password)
  |
  v
supabase.auth.signUp({ email, password })
  |
  v
[If email confirmation disabled] -> Session created automatically
[If email confirmation enabled] -> Show "check your email" page
  |
  v
/dashboard (middleware refreshes session on every request)
  |
  v
supabase.auth.getUser() -> returns authenticated user
```

### Root Middleware Pattern (MISSING - must add)

```typescript
// middleware.ts (project root)
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

The existing `lib/supabase/middleware.ts` already has the `updateSession` function with correct cookie handling. It just needs a root `middleware.ts` to invoke it. The existing implementation calls `supabase.auth.getUser()` which validates the JWT and refreshes the token.

### Anti-Patterns to Avoid
- **Using `getSession()` for auth checks on server:** Use `getUser()` instead (validates JWT signature). The existing code already does this correctly in `auth-helpers.ts` line 178.
- **Creating users without passwords they can use:** The entire point of ONBOARD-AUTH fix.
- **Client-side auth gates without middleware:** The dashboard currently only checks auth client-side. Middleware should protect routes server-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session refresh | Custom token refresh logic | Root middleware.ts + `updateSession()` | Supabase SSR handles cookie rotation automatically |
| Password hashing | bcrypt/argon2 | Supabase Auth `signUp()` | Supabase handles hashing internally |
| Auth state management | Custom React context | `supabase.auth.getUser()` + `onAuthStateChange` | Built into Supabase client |
| Email confirmation | Custom email flow | Supabase project settings toggle | Can disable email confirmation in Supabase Dashboard |
| Profiles sync | Manual INSERT after signup | Database trigger `on_auth_user_created` | Atomic, can't get out of sync |

**Key insight:** The existing codebase already has almost all the right patterns (server client, browser client, middleware helper, auth-helpers). The problems are: (1) a broken database trigger, (2) missing root middleware.ts, and (3) a signup flow that doesn't collect passwords.

## Common Pitfalls

### Pitfall 1: Trigger on auth.users References Non-Existent or Mismatched Table
**What goes wrong:** `supabase.auth.signUp()` returns 500 "Database error saving new user"
**Why it happens:** A trigger function fires `AFTER INSERT ON auth.users` and tries to INSERT into `public.profiles`, but either the table doesn't exist or the columns don't match what the trigger expects.
**How to avoid:**
1. Check Supabase Dashboard > Database > Triggers (filter by `auth` schema)
2. Check Supabase Dashboard > Database > Functions for `handle_new_user` or similar
3. Either fix the trigger to match the actual `profiles` table schema, or drop and recreate it
4. The `profiles` table must have at minimum: `id uuid references auth.users on delete cascade PRIMARY KEY`
**Warning signs:** 500 error on ANY user creation method (signUp, admin create, dashboard invite)

### Pitfall 2: Email Confirmation Blocks Login After Signup
**What goes wrong:** `signUp()` succeeds but returns `session: null` because email confirmation is required
**Why it happens:** Supabase projects default to requiring email confirmation. The user gets an email with a confirmation link, but if the app redirects to dashboard immediately, they have no session.
**How to avoid:**
1. For MVP/development: Disable email confirmation in Supabase Dashboard > Auth > Settings
2. For production: Handle the "check your email" state in the UI
3. Check `data.session` after `signUp()` -- if null, email confirmation is likely required
**Warning signs:** `signUp()` returns `{ user: {...}, session: null }` -- user exists but no session

### Pitfall 3: No Root Middleware Means Sessions Silently Expire
**What goes wrong:** Users get logged out randomly. Auth works initially but breaks after ~1 hour.
**Why it happens:** Supabase auth tokens expire (default 1 hour). Without middleware calling `getUser()` on every request, the token is never refreshed and the cookie goes stale.
**How to avoid:** Create root `middleware.ts` that calls `updateSession()` on every non-static request.
**Warning signs:** Auth works fine immediately after login but breaks after some time.

### Pitfall 4: Server-Side Cookie Setting Fails Silently in Server Components
**What goes wrong:** `signUp` or `signIn` called from Server Component doesn't persist the session cookie.
**Why it happens:** Next.js Server Components cannot set cookies. The `setAll` method in `lib/supabase/server.ts` (line 17-21) has a try/catch that silently swallows this error.
**How to avoid:** Always perform auth actions (signUp, signIn, signOut) from Route Handlers (API routes) or Server Actions, never from Server Components directly. The current code already does this correctly.
**Warning signs:** Login "succeeds" but user is immediately unauthenticated on next page load.

### Pitfall 5: Two Onboarding Flows Confuse Users
**What goes wrong:** Users who visit `/onboarding` go through a wizard that creates no account. They then can't access the dashboard.
**Why it happens:** `/onboarding` is a client-side-only wizard (localStorage state, no API calls). `/get-started` is the actual signup flow. They're completely disconnected.
**How to avoid:** Either (a) merge them into one flow, or (b) make `/onboarding` require auth and serve as a post-signup wizard.
**Warning signs:** Users complete onboarding but have no account.

## Code Examples

### Fix 1: Profiles Table + Trigger (SQL to run in Supabase Dashboard)

```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data

-- Step 1: Drop any existing broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  stage TEXT,
  challenges JSONB DEFAULT '[]',
  teammate_emails JSONB DEFAULT '[]',
  tier INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 5: Service role can do anything (for API routes using service client)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Step 6: Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$;

-- Step 7: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Fix 2: Root Middleware (create at project root)

```typescript
// middleware.ts (project root)
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  // Optional: redirect unauthenticated users from protected routes
  const protectedPaths = ["/dashboard", "/chat"];
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Fix 3: Updated /get-started Page (add password field)

The `/get-started` page currently collects only email. It needs a password field added to Step 3. The `handleSubmit` function should pass `password` to `/api/onboard`:

```typescript
// In handleSubmit:
const response = await fetch("/api/onboard", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    password: password,  // NEW: actual user password
    stage: selectedStage,
    challenges: selectedChallenge ? [selectedChallenge] : [],
    isQuickOnboard: true,
  }),
});
```

### Fix 4: Updated /api/onboard Route (require password, remove random generation)

```typescript
// In route.ts, line 77 changes from:
const userPassword = password || crypto.randomUUID();

// To:
if (!password || password.length < 6) {
  return NextResponse.json(
    { error: "Password must be at least 6 characters" },
    { status: 400 }
  );
}
const userPassword = password;
```

### Fix 5: Dashboard Layout Should Use Real User Data

```typescript
// app/dashboard/layout.tsx currently has hardcoded mock (line 139-144):
// const user = { name: "Fred Cary", email: "founder@startup.com", tier: 0 };
//
// Should be replaced with actual user data from Supabase auth
// This is noted but may be Phase 06 scope (tier system fix)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Project already uses `@supabase/ssr` correctly |
| `getSession()` for server auth | `getUser()` for server auth | 2024 | `getUser()` validates JWT; `getSession()` does not. Project uses `getUser()` correctly in `auth-helpers.ts:178` |
| `getUser()` for middleware | `getClaims()` for middleware | Late 2025 | Newer pattern but `getUser()` still works; lower priority to migrate |
| Custom cookie management | `@supabase/ssr` cookie handlers | 2024 | Project already uses the correct pattern |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Project does NOT use the old package.
- `supabase.auth.getSession()` for server-side auth: Still works but doesn't validate JWT. Use `getUser()`.

## Detailed Issue Analysis

### Issue 1: SUPABASE-AUTH (500 on User Creation)

**Root Cause (HIGH confidence):** A trigger on `auth.users` in the Supabase project is failing. Evidence:

1. The codebase has no migration creating a `profiles` table, yet code references `profiles` in 8 locations
2. The auth-test.json in root shows `{"error":"Invalid API key"}` suggesting earlier debugging attempts
3. The 500 error occurs on "both admin and public API" per the audit, which is the hallmark of a trigger failure (not a client-side issue)
4. Supabase docs explicitly state this error is "normally associated with a side effect of a database transaction" -- a trigger

**Diagnosis steps (must do in Supabase Dashboard):**
1. Go to Database > Triggers > filter by `auth` schema
2. Look for a trigger like `on_auth_user_created`
3. Check the associated function -- does it INSERT into `public.profiles`?
4. Check if `public.profiles` table exists and has the expected columns
5. Check Postgres logs for the exact error message

**Fix:** Either fix the trigger function to match the actual table, or drop and recreate both the table and trigger using the SQL in Code Examples above.

### Issue 2: ONBOARD-AUTH (Random Password)

**Root Cause (HIGH confidence):** `app/api/onboard/route.ts` line 77:
```typescript
const userPassword = password || crypto.randomUUID();
```

The `/get-started` page (line 204-209) sends `{ email, stage, challenges, isQuickOnboard: true }` -- no `password` field. So `password` is undefined, and `crypto.randomUUID()` is used.

**Fix:** Add a password input field to Step 3 of `/get-started`, and make `/api/onboard` require it for new users.

### Issue 3: Missing Root Middleware

**Root Cause (HIGH confidence):** No file at `/middleware.ts` or `/src/middleware.ts`. The helper at `lib/supabase/middleware.ts` exists with correct `updateSession()` implementation, but it's never invoked.

**Fix:** Create root `middleware.ts` that calls `updateSession()`.

### Issue 4: Two Disconnected Onboarding Flows

**Analysis:**
- `/get-started` = signup flow (creates auth user, calls API)
- `/onboarding` = client-only wizard (localStorage, NO auth, NO API calls)
- `/signup` = redirects to `/get-started`

**Recommendation:** Keep `/get-started` as the primary signup+onboard flow. Make `/onboarding` either:
- (a) Redirect to `/get-started` for unauthenticated users, or
- (b) Serve as a post-signup wizard that requires auth (for users who skip setup during signup)

### Issue 5: Dashboard Layout Hardcoded User

**Analysis:** `app/dashboard/layout.tsx` line 139-144 hardcodes user data:
```typescript
const user = { name: "Fred Cary", email: "founder@startup.com", tier: 0 };
```

This means the sidebar never shows real user info. While not a blocker for auth itself, it's part of the broken auth experience. The dashboard page (`page.tsx`) correctly fetches real user data, but the layout does not.

**Recommendation:** Fix as part of this phase since it's directly related to the auth flow working end-to-end.

## Open Questions

1. **What trigger exists on auth.users in the Supabase project?**
   - What we know: The 500 error pattern strongly suggests a broken trigger
   - What's unclear: We can't see the Supabase Dashboard from here to confirm
   - Recommendation: First task in Phase 05 should be to diagnose via Supabase Dashboard logs, then fix

2. **Is email confirmation enabled in Supabase?**
   - What we know: No code references email confirmation settings. No `app/auth/callback` route exists for handling confirmation links.
   - What's unclear: The Supabase project's auth settings (Dashboard > Auth > Settings)
   - Recommendation: Disable email confirmation for now (MVP). Can re-enable when email infrastructure is ready. If disabled, `signUp()` returns a session immediately.

3. **Should we use the service role client for user creation in /api/onboard?**
   - What we know: The current code uses the regular server client (anon key + cookies). A `createServiceClient()` exists in `lib/supabase/server.ts` using the service role key.
   - What's unclear: Whether RLS on the profiles table might block the anon-key client from upserting profiles
   - Recommendation: For the onboard API route, use `createServiceClient()` for the profile upsert since it bypasses RLS. But use the regular client for `auth.signUp()` so the session cookie is set properly.

4. **What about existing users with random passwords?**
   - What we know: If any users were created before the 500 error started, they have random UUID passwords
   - What's unclear: How many such users exist (likely zero given the 500 error blocks creation)
   - Recommendation: Add a "forgot password" / password reset flow as a follow-up (not blocking for v1.0)

## Sources

### Primary (HIGH confidence)
- Supabase official docs: [Managing User Data (Triggers + Profiles)](https://supabase.com/docs/guides/auth/managing-user-data)
- Supabase official docs: [Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- Supabase official docs: [Troubleshooting Database Error Saving New User](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB)
- Codebase analysis: All files listed in context section read and traced

### Secondary (MEDIUM confidence)
- GitHub Issue #563: [Database error saving new user with triggers](https://github.com/supabase/supabase/issues/563)
- Supabase official docs: [Creating a Supabase Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

### Tertiary (LOW confidence)
- WebSearch: Supabase SSR middleware patterns (verified against official docs)
- WebSearch: `getClaims()` vs `getUser()` migration (newer pattern, not critical)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, versions verified from package.json
- Architecture: HIGH - All code paths traced, every file read
- Root causes: HIGH for ONBOARD-AUTH (code is explicit), HIGH for missing middleware (verified no file exists), MEDIUM-HIGH for SUPABASE-AUTH (trigger theory matches all symptoms but can't verify without Dashboard access)
- Pitfalls: HIGH - Documented from official Supabase troubleshooting docs

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (Supabase SSR patterns are stable; database fix is project-specific)

## Fix Priority Order

1. **Database fix (SUPABASE-AUTH)** - Unblocks ALL user creation. Nothing else works without this.
2. **Root middleware.ts** - Enables session refresh. Quick win, prevents session expiry.
3. **Password collection in /get-started (ONBOARD-AUTH)** - Makes signup result in a usable account.
4. **Consolidate onboarding flows** - Eliminate user confusion between /get-started and /onboarding.
5. **Dashboard layout real user data** - Show actual authenticated user in sidebar.
6. **Auth callback route** - Only needed if email confirmation is enabled (skip for MVP).
