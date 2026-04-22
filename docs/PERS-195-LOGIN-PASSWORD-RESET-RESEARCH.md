# PERS-195: Login/Password Reset Flow Research — Sahara Emails

**Date:** 2026-03-24
**Status:** Research Complete
**Assignee:** agent5

## Executive Summary

The Sahara login and password reset flows are fully implemented using **Supabase Auth** with PKCE. The code is well-structured and production-ready. The main risk area for `@saharacompanies.com` email users is **email deliverability** — Supabase's built-in email service (via SendGrid/Postmark) may be filtered by corporate IT at Sahara Companies.

---

## Current Architecture

### Login Flow
1. User enters email/password at `/login`
2. Client POSTs to `/api/auth/login` (rate-limited: 5/min per IP)
3. Server calls `supabase.auth.signInWithPassword()` via `lib/auth.ts` → `lib/supabase/auth-helpers.ts`
4. Supabase sets session cookies automatically
5. Client redirects to `/dashboard` (with open-redirect protection)

### Password Reset Flow (PKCE)
1. User enters email at `/forgot-password`
2. Client calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: /api/auth/callback?next=/reset-password`
3. Supabase sends password reset email (via Supabase's built-in email infra, NOT Resend)
4. User clicks email link → hits `/api/auth/callback` with PKCE `code`
5. Server exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
6. Redirects to `/reset-password` with valid session cookies
7. User enters new password (8+ chars, 1 uppercase, 1 number)
8. Client calls `supabase.auth.updateUser({ password })`

---

## Key Files

| Component | File |
|---|---|
| Login page | `app/login/page.tsx` |
| Login API | `app/api/auth/login/route.ts` |
| Forgot password page | `app/forgot-password/page.tsx` |
| Reset password page | `app/reset-password/page.tsx` |
| Auth callback (PKCE) | `app/api/auth/callback/route.ts` |
| Auth helpers | `lib/supabase/auth-helpers.ts` |
| Auth wrapper | `lib/auth.ts` |
| Supabase server client | `lib/supabase/server.ts` |
| Supabase middleware | `lib/supabase/middleware.ts` |
| App middleware | `middleware.ts` |

---

## Identified Issues & Risks

### 1. Email Deliverability (HIGH PRIORITY)

**Problem:** Password reset emails are sent via Supabase's built-in email service (shared SendGrid/Postmark infra). Corporate domains like `@saharacompanies.com` often have:
- Aggressive spam filters (Microsoft 365 / Google Workspace ATP)
- SPF/DKIM/DMARC policies that reject emails from unknown senders
- IT-managed email filters that quarantine automated emails

**Evidence:** The forgot-password page already includes a UX tip: *"For @saharacompanies.com addresses, also check your IT-managed email filters"* — suggesting this is a known issue.

**Fix Options:**
1. **Configure custom SMTP in Supabase** (Dashboard → Auth → SMTP Settings) using a verified `@joinsahara.com` sender domain with proper SPF/DKIM/DMARC records. This is the recommended approach.
2. **Switch to Resend** for password reset emails (env vars already stubbed in `.env.example` but not active). Would require a custom password reset flow instead of Supabase's built-in one.
3. **Use Supabase custom email hooks** (available on Pro plan) to route auth emails through Resend.

### 2. No .env.local in Repo (DEPLOYMENT CONCERN)

**Observation:** No `.env.local` file exists in the checked-out repo. This means:
- The `NEXT_PUBLIC_SUPABASE_URL` and keys are likely only in Vercel env vars
- Local development/testing of auth flows requires manual env setup
- Cannot verify Supabase project configuration from here

**Action needed:** Verify Supabase project settings in the dashboard:
- Auth → URL Configuration → Site URL should be `https://joinsahara.com`
- Auth → URL Configuration → Redirect URLs should include `https://joinsahara.com/api/auth/callback`
- Auth → SMTP Settings → Check if custom SMTP is configured

### 3. Session Verification Timeout (MINOR)

**Observation:** The reset-password page has a 15-second timeout (`SESSION_VERIFY_TIMEOUT_MS = 15_000`) to detect expired links. If the PKCE code exchange in `/api/auth/callback` is slow (network latency, cold start), legitimate users might see "expired link" incorrectly.

**Fix:** Consider increasing to 20-30 seconds, or better yet, pass a query param from the callback route to confirm the code was exchanged successfully, instead of relying on an auth state change event race.

### 4. Login API Cookie Handling (POTENTIAL BUG)

**Observation:** The login API route at `app/api/auth/login/route.ts` creates a Supabase server client via `signIn()` → `supabaseSignIn()` → `createClient()`. The `createClient()` in `lib/supabase/server.ts` uses `cookies()` from `next/headers` which sets cookies on the response. However, the API route returns a simple `NextResponse.json()` — **cookies set via `cookieStore.set()` inside the `setAll` callback may not propagate to the JSON response**.

This could cause a race condition where:
1. Login API returns success
2. Client redirects to `/dashboard`
3. Session cookies aren't set yet → middleware redirects back to `/login`

**Fix:** The login route should use `createServerClient` directly (like the callback route does) and explicitly set cookies on the response object, OR use the middleware pattern where cookies are set on the `NextResponse` object.

### 5. Supabase Auth Redirect URLs (CONFIGURATION)

**Observation:** The forgot-password page uses `window.location.origin` for the redirect URL:
```ts
redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`
```

If a user accesses the app via a Vercel preview URL (e.g., `sahara-xyz.vercel.app`) instead of `joinsahara.com`, the redirect URL won't match what's configured in Supabase Auth settings, causing the PKCE flow to fail silently.

**Fix:** Add all valid redirect URLs to Supabase Auth → URL Configuration → Redirect URLs:
- `https://joinsahara.com/api/auth/callback`
- `https://*.vercel.app/api/auth/callback` (wildcard for preview deploys)

---

## Recommendations (Priority Order)

1. **Configure custom SMTP in Supabase** with a `@joinsahara.com` sender and proper DNS records (SPF, DKIM, DMARC). This fixes the root email deliverability issue for all Sahara users.

2. **Verify Supabase redirect URLs** include both production and preview domains.

3. **Audit the login route cookie propagation** — test whether session cookies are correctly set when the login API returns. If not, refactor to match the callback route's pattern.

4. **Increase session verification timeout** to 25 seconds on the reset-password page.

5. **Add Resend as email provider** (optional, for higher deliverability control):
   - Activate the Resend env vars already in `.env.example`
   - Configure Supabase to use custom email hooks pointing to a `/api/auth/send-email` route
   - Use Resend's `@joinsahara.com` domain sender

---

## What Works Well

- PKCE flow is correctly implemented (no passwords in URLs)
- Rate limiting on login (5/min) and signup (3/min)
- Open redirect protection on login page
- Clear error messages with actionable guidance
- Password strength validation with live checklist
- Expired link detection with re-request flow
- Email normalization (lowercase) on all auth endpoints
- Proper cleanup of orphaned auth users on signup failure
