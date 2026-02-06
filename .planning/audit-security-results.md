# Security Audit Results

**Date:** 2026-02-06
**Scope:** All authentication flows, authorization guards, API route protection, credential handling, CORS/CSRF
**Status:** COMPLETE - All identified issues fixed

---

## Executive Summary

Audited 90+ API route files and all auth-related library code. Found **10 unprotected API routes** (8 monitoring endpoints, 1 admin endpoint, 1 experiments endpoint) that allowed unauthenticated access to sensitive data and operations. All have been fixed with `isAdmin` auth guards. The ADMIN_SECRET_KEY bypass fix (commit b79d202) is confirmed solid.

---

## 1. Token Generation & Validation (`lib/auth/token.ts`)

**Status:** SECURE

- Uses `jose` library with HS256 algorithm (edge-compatible)
- Default 7-day token expiry with configurable durations
- `verifyTokenSafely` returns `{ valid, expired, payload }` tuple (no exceptions on invalid tokens)
- `verifyToken` throws on invalid tokens (for strict contexts)
- Proper error categorization: expired vs invalid vs malformed
- `extractTokenFromHeader` handles `Bearer` prefix correctly
- `extractTokenFromCookies` reads from `auth-token` cookie
- Test coverage comprehensive (`lib/auth/__tests__/token.test.ts`)

**No issues found.**

---

## 2. Tier-Based Access Control (`lib/api/tier-middleware.ts`)

**Status:** SECURE

- `requireTier(minimumTier)` pattern wraps API handlers
- Tier lookup via Supabase service client (server-side, not client-controllable)
- Defaults to `FREE` tier for unrecognized/missing subscriptions (secure default)
- Tier hierarchy: FREE < PRO < STUDIO
- Returns 401 for unauthenticated, 403 for insufficient tier
- Uses `requireAuth()` internally before tier check

**No issues found.**

---

## 3. Admin Authentication

### 3.1 Admin Layout (`app/admin/layout.tsx`)

**Status:** SECURE

- Server component checks `admin-session` cookie against `ADMIN_SECRET_KEY`
- Critical guard: `if (!secret) return false` -- prevents bypass when env var is unset
- Redirects to `/admin/login` on auth failure

### 3.2 Admin Login (`app/api/admin/login/route.ts`)

**Status:** SECURE

- Uses `crypto.timingSafeEqual` for password comparison (prevents timing attacks)
- Returns 503 if `ADMIN_SECRET_KEY` not configured (fail-closed)
- Sets cookie with `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "strict"`
- Cookie max-age: 24 hours

### 3.3 Admin Logout (`app/api/admin/logout/route.ts`)

**Status:** SECURE

- Clears cookie with `maxAge: 0`
- Sets all security flags on cleared cookie

### 3.4 Commit b79d202 Verification

**Status:** FIX IS SOLID

The fix added `if (!secret) return false` to the `isAdmin()` function in `app/admin/layout.tsx`. This prevents the bypass scenario where `ADMIN_SECRET_KEY` is unset and `undefined === undefined` would evaluate to `true`. The pattern is now consistently applied across all admin routes.

---

## 4. Admin API Routes (`app/api/admin/*`)

**Status:** ALL SECURE

All admin API routes use the `isAdmin()` pattern with the `!secret` guard:

| Route | Methods | Auth | Notes |
|-------|---------|------|-------|
| `/api/admin/dashboard` | GET | isAdmin (cookie) | Timing-safe comparison |
| `/api/admin/logout` | POST | isAdmin (cookie) | Cookie-based |
| `/api/admin/voice-agent/analytics` | GET | isAdmin (header) | |
| `/api/admin/voice-agent/config` | GET, POST, PUT, DELETE | isAdmin (header) | |
| `/api/admin/voice-agent/escalation` | GET, POST, PUT, DELETE | isAdmin (header) | |
| `/api/admin/voice-agent/knowledge` | GET, POST, PUT, DELETE | isAdmin (header) | **FIXED** (was unprotected) |
| `/api/admin/config` | GET, PUT | isAdmin (cookie) | |
| `/api/admin/prompts` | GET, POST | isAdmin (cookie) | |
| `/api/admin/prompts/activate` | POST | isAdmin (cookie) | |
| `/api/admin/prompts/test` | POST | isAdmin (cookie) | |
| `/api/admin/ab-tests` | GET, POST | isAdmin (cookie) | |
| `/api/admin/ab-tests/[id]` | GET, PUT, DELETE | isAdmin (cookie) | |
| `/api/admin/training` | GET, POST | isAdmin (cookie) | |

---

## 5. User Authentication (`app/api/auth/*`)

**Status:** SECURE

| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/api/auth/login` | POST | Public (login endpoint) | Uses Supabase `signInWithPassword` |
| `/api/auth/logout` | POST | None required | Calls `supabase.auth.signOut()` |
| `/api/auth/me` | GET | `requireAuth()` | Returns current user profile |

- Auth flow uses Supabase Auth (`signInWithPassword`, `getUser`, `getSession`)
- `requireAuth()` in `lib/supabase/auth-helpers.ts` throws `Response(401)` if no valid session
- `getCurrentUser()` calls `supabase.auth.getUser()` (validates token server-side)
- `getOptionalUserId()` available for routes that optionally use auth

---

## 6. All API Routes - Auth Coverage

### 6.1 User-Authenticated Routes (requireAuth)

All properly protected:

- `/api/fred/chat` - requireAuth + tier check
- `/api/fred/feedback` - requireAuth
- `/api/check-ins/*` - requireAuth
- `/api/notifications/*` - requireAuth
- `/api/documents/*` - requireAuth
- `/api/journey/*` - requireAuth
- `/api/insights/*` - requireAuth
- `/api/agents/*` - requireAuth
- `/api/diagnostic/*` - requireAuth or getOptionalUserId
- `/api/positioning` - requireAuth
- `/api/livekit/token` - requireAuth + requireTier(PRO)
- `/api/stripe/checkout` - requireAuth

### 6.2 Webhook/External Routes

All properly verified:

- `/api/stripe/webhook` - Stripe signature verification (`stripe.webhooks.constructEvent`)
- `/api/sms/webhook` - Twilio signature validation
- `/api/cron/weekly-checkin` - CRON_SECRET Bearer token

### 6.3 Intentionally Public Routes

- `/api/contact` - Public contact form submission
- `/api/onboard` - Public user registration (creates Supabase user)
- `/api/onboard/invite` - Public invite-based registration
- `/api/monitoring/health` - Public health check (returns basic status only)
- `/api/setup-db` - Blocks production access (`NODE_ENV !== "production"`)

### 6.4 Monitoring Routes (FIXED)

These were the primary security findings. All have been fixed:

| Route | Methods | Before | After | Severity |
|-------|---------|--------|-------|----------|
| `/api/monitoring/dashboard` | GET | **NO AUTH** | isAdmin (timing-safe) | HIGH |
| `/api/monitoring/alerts` | GET, POST | **NO AUTH** | isAdmin (timing-safe) | HIGH |
| `/api/monitoring/charts` | GET | **NO AUTH** | isAdmin (timing-safe) | HIGH |
| `/api/monitoring/experiments/[name]` | GET | **NO AUTH** | isAdmin | HIGH |
| `/api/monitoring/experiments/[name]/history` | GET | **NO AUTH** | isAdmin | HIGH |
| `/api/monitoring/experiments/[name]/promote` | GET, POST, DELETE | **NO AUTH** | isAdmin | CRITICAL |
| `/api/monitoring/variants/[id]` | GET | **NO AUTH** | isAdmin | HIGH |
| `/api/monitoring/alerts/check` | GET, POST | Weak (optional CRON_SECRET) | Mandatory CRON_SECRET | MEDIUM |
| `/api/monitoring/auto-promotion/check` | GET: **NO AUTH**, POST: Weak | GET: isAdmin, POST: cron secret OR isAdmin | HIGH |
| `/api/experiments/auto-promote` | GET, POST | **NO AUTH** | isAdmin (timing-safe) | CRITICAL |

---

## 7. Hardcoded Credentials & Secret Handling

**Status:** SECURE

- No hardcoded credentials in production source code
- Test files contain expected test values only (vitest.setup.ts, token.test.ts, ai-sdk.test.ts) -- acceptable
- All secrets loaded from `process.env`:
  - `ADMIN_SECRET_KEY` - Admin authentication
  - `JWT_SECRET` - Token signing (fallback to ADMIN_SECRET_KEY)
  - `CRON_SECRET` - Cron job authentication
  - `AUTO_PROMOTION_CRON_SECRET` - Auto-promotion cron auth
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Database
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Payment
  - `TWILIO_AUTH_TOKEN` - SMS verification
  - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` - Voice
  - Various AI API keys (OPENAI, ANTHROPIC, etc.)

---

## 8. CORS & CSRF Protections

**Status:** ACCEPTABLE (with notes)

- **CORS:** Next.js App Router does not set permissive CORS headers by default. No custom CORS middleware found. API routes are same-origin by default.
- **CSRF:** Admin login uses `SameSite: strict` cookies, which provides CSRF protection for cookie-based admin sessions. User auth uses Supabase Auth tokens (Bearer tokens in headers), which are inherently CSRF-resistant.
- **Note:** No explicit CSRF token implementation. The combination of `SameSite: strict` cookies (admin) and Bearer token auth (users) provides adequate protection for this application.

---

## 9. Security Patterns Assessment

### Positive Patterns

1. **Fail-closed on missing secrets:** `if (!secret) return false` consistently prevents auth bypass when env vars are unset
2. **Timing-safe comparison:** Admin login uses `crypto.timingSafeEqual` -- prevents timing attacks on password comparison
3. **HttpOnly cookies:** Admin session cookies are `httpOnly: true` (not accessible via JavaScript)
4. **Secure cookies in production:** `secure: process.env.NODE_ENV === "production"` ensures HTTPS-only in prod
5. **Service client isolation:** Supabase service client (elevated privileges) only used server-side, never exposed to client
6. **Input validation:** Routes validate required fields before processing
7. **Error message sanitization:** Admin routes return generic errors, not stack traces (in most cases)

### Areas for Future Improvement

1. **Timing-safe comparison inconsistency:** Some monitoring routes use simple `===` comparison for admin key instead of `timingSafeEqual`. The dashboard, alerts, charts, and auto-promote routes use timing-safe; others (experiments, variants, promote, knowledge) use direct comparison. Recommend standardizing to `timingSafeEqual` everywhere.
2. **Rate limiting:** No rate limiting on admin login endpoint. Recommend adding rate limiting to prevent brute-force attacks.
3. **Admin key rotation:** No mechanism for key rotation. Consider adding key version tracking.
4. **Centralized auth middleware:** The `isAdmin()` function is duplicated across ~15 route files. Consider extracting to a shared middleware to ensure consistent implementation.
5. **Audit logging:** No audit trail for admin actions (who did what, when). Consider adding structured audit logs.

---

## 10. Issues Fixed (Summary)

### CRITICAL (2)

1. **`/api/monitoring/experiments/[name]/promote`** - Allowed unauthenticated users to promote experiment winners and roll back promotions. Could alter production behavior without authorization.
2. **`/api/experiments/auto-promote`** - Allowed unauthenticated triggering of auto-promotion scans, promoting experiments, checking eligibility, and rolling back -- all without any auth.

### HIGH (7)

3. **`/api/monitoring/dashboard`** - Exposed monitoring dashboard data (experiments, metrics, alerts) without auth.
4. **`/api/monitoring/alerts`** - GET exposed all alerts; POST allowed sending notifications to arbitrary user IDs.
5. **`/api/monitoring/charts`** - Exposed conversion, latency, traffic, and error rate chart data.
6. **`/api/monitoring/experiments/[name]`** - Exposed detailed experiment metrics.
7. **`/api/monitoring/experiments/[name]/history`** - Exposed promotion history.
8. **`/api/monitoring/variants/[id]`** - Exposed variant-level metrics.
9. **`/api/monitoring/auto-promotion/check` GET** - Exposed auto-promotion config without auth.

### MEDIUM (2)

10. **`/api/monitoring/alerts/check`** - Weak auth: CRON_SECRET check was optional (endpoint open if env var not set). Fixed to require CRON_SECRET, returning 503 if not configured.
11. **`/api/admin/voice-agent/knowledge`** - All 4 methods (GET, POST, PUT, DELETE) had no auth. Fixed with isAdmin guards.

**Total: 11 security issues identified and fixed.**
