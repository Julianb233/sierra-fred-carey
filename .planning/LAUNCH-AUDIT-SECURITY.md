# Sahara Security & Auth Audit Report

**Date:** 2026-02-13
**Auditor:** Security & Auth Auditor (Launch Gap Audit Team)
**Scope:** Authentication, authorization, tier gating, RLS, input validation, rate limiting, secrets, CORS/CSP, session handling
**Codebase:** /opt/agency-workspace/sierra-fred-carey (Next.js 16 + Supabase + Stripe)

---

## Executive Summary

The application has made **significant security improvements** since the v1.0 audit (Feb 7). All 4 previously identified gaps that were fixable have been resolved: Pro page tier gating is in place, root middleware.ts exists and protects routes, rate limiting is on the invite endpoint, and the 5 stub admin training routes are now fully implemented with admin auth. The security posture is **launch-ready with caveats** -- there are a few MEDIUM issues that should be addressed soon after launch, and one HIGH issue around a publicly exposed health endpoint that leaks infrastructure details.

**Summary of findings:**
- BLOCKERS: 0
- HIGH: 2
- MEDIUM: 5
- LOW: 4

---

## v1.0 Audit Gap Resolution Status

| Gap | Description | Status | Evidence |
|-----|-------------|--------|----------|
| GAP 1 | Missing tier gating on 5 Pro pages (positioning, investor-lens, investor-readiness, pitch-deck, strategy) | **RESOLVED** | All 5 pages use `useUserTier()` + `<FeatureLock requiredTier={UserTier.PRO}>`. API routes also enforce via `checkTierForRequest()`. |
| GAP 3 | No root middleware.ts for route protection | **RESOLVED** | `middleware.ts` exists at project root. Uses `isProtectedRoute()` to gate `/dashboard/*`, `/chat`, `/agents`, `/documents`, etc. Redirects unauthenticated users to `/login`. Handles CORS, session refresh, and correlation IDs. |
| GAP 4 | Missing rate limiting on /api/onboard/invite | **RESOLVED** | `app/api/onboard/invite/route.ts:9` -- Uses in-memory `RateLimiter` at 5 requests/minute/IP. |
| GAP 5 | 5 stub admin training routes returning 503 | **RESOLVED** | All 5 routes (`metrics`, `ratings`, `requests`, `requests/[id]`) are fully implemented with `isAdminRequest()` auth checks and real database queries. No 503 stubs remain. |

---

## Findings

### HIGH Severity

#### H1: `/api/health/ai` exposes infrastructure details without authentication

**File:** `app/api/health/ai/route.ts:16-121`
**Severity:** HIGH
**Attack vector:** Any unauthenticated user can call `GET /api/health/ai` to discover which AI providers are configured, their circuit breaker states, failure rates, latency data, and model names. This is useful reconnaissance for an attacker.
**Details:** Neither `GET` nor `POST` handlers check authentication. The endpoint exposes:
- Configured provider names and availability status
- Circuit breaker failure counts, rates, and state transitions
- Health check latency measurements per provider
- Exact model names being used

**Suggested fix:** Add `requireAuth()` or `isAdminRequest()` check. At minimum, restrict to admin-only access since this is operational data.

---

#### H2: `/api/setup-db` relies solely on `NODE_ENV` check for production blocking

**File:** `app/api/setup-db/route.ts:15`
**Severity:** HIGH
**Attack vector:** If `NODE_ENV` is accidentally misconfigured or overridden (e.g., in a staging deployment that uses `development` mode), this endpoint exposes database schema information and can seed default configurations. It also uses `createServiceClient()` (service role), bypassing all RLS.
**Details:** The check `process.env.NODE_ENV === "production"` is the sole guard. No authentication is required.

**Suggested fix:** Add admin authentication check (`isAdminRequest()`) in addition to the NODE_ENV check, or remove this route entirely for production builds (e.g., via file-based route exclusion in Vercel config).

---

### MEDIUM Severity

#### M1: Auto-promotion cron secret uses non-timing-safe comparison

**File:** `app/api/monitoring/auto-promotion/check/route.ts:29`
**Severity:** MEDIUM
**Attack vector:** The cron secret is compared with `===` (`cronSecret === expectedSecret`), which is vulnerable to timing attacks. An attacker could incrementally deduce the secret character by character by measuring response times.
**Details:** Other cron endpoints (`weekly-digest`, `re-engagement`) correctly use `timingSafeEqual` with HMAC normalization. The `monitoring/alerts/check/route.ts:23` also uses `===` for its CRON_SECRET comparison. Both should be fixed.

**Suggested fix:** Replace `===` with the same HMAC + `timingSafeEqual` pattern used in `app/api/cron/weekly-digest/route.ts:50-52`.

**Affected files:**
- `app/api/monitoring/auto-promotion/check/route.ts:29`
- `app/api/monitoring/alerts/check/route.ts:23,74`

---

#### M2: `process.env.KEY!` non-null assertions without runtime validation

**File:** `lib/push/index.ts:100-102`
**Severity:** MEDIUM
**Attack vector:** If VAPID environment variables are not set, the non-null assertion (`!`) will pass `undefined` to `web-push`, which may throw an unhandled error or produce cryptic 500 responses.
**Details:**
```typescript
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const privateKey = process.env.VAPID_PRIVATE_KEY!;
const subject = process.env.VAPID_SUBJECT!;
```
These are asserted as non-null but never validated.

**Suggested fix:** Add a guard clause at the top of `sendPushNotification()` that returns `false` if any VAPID var is missing, similar to the `initWebPush()` check above it.

---

#### M3: Permissions-Policy blocks microphone but app uses voice features

**File:** `next.config.mjs:46`
**Severity:** MEDIUM
**Attack vector:** Not an attack vector, but a functional breakage. The Permissions-Policy header is `camera=(), microphone=(), geolocation=()` which blocks ALL microphone access. However, the app has LiveKit-based voice calling (`components/dashboard/call-fred-modal.tsx`) that requires microphone access.
**Details:** The `Call FRED` feature uses LiveKit rooms which need `getUserMedia()` for microphone. The current header will silently deny microphone permission, causing the voice feature to fail in production.

**Suggested fix:** Change to `microphone=(self)` to allow microphone access from the same origin.

---

#### M4: In-memory rate limiter on `/api/onboard/invite` does not persist across serverless invocations

**File:** `app/api/onboard/invite/route.ts:9` and `lib/rate-limit.ts`
**Severity:** MEDIUM
**Attack vector:** In a serverless deployment (Vercel), each function invocation may get a fresh instance, making the in-memory rate limiter ineffective. An attacker could send many requests that hit different instances, bypassing the 5-request limit.
**Details:** The deprecated `lib/rate-limit.ts` is used here while the rest of the app uses `lib/api/rate-limit.ts` (Upstash Redis-backed). The invite endpoint is the only consumer of the old in-memory limiter.

**Suggested fix:** Migrate this endpoint to use `checkRateLimit()` from `lib/api/rate-limit.ts` which uses Upstash Redis in production.

---

#### M5: CSP `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`

**File:** `next.config.mjs:8`
**Severity:** MEDIUM
**Attack vector:** `'unsafe-inline'` allows inline scripts, which weakens XSS protections. `'unsafe-eval'` allows `eval()`, which can be exploited if an attacker achieves any form of script injection.
**Details:** This is common in Next.js apps due to how the framework injects inline scripts for hydration. However, Next.js supports nonce-based CSP which would allow removing `'unsafe-inline'`.

**Suggested fix:** For launch, this is acceptable. Post-launch, implement nonce-based CSP using Next.js's `generateMetadata` or a custom `_document` with nonces to remove `'unsafe-inline'` and `'unsafe-eval'`.

---

### LOW Severity

#### L1: HMAC comparison key is hardcoded in admin auth

**File:** `lib/auth/admin.ts:24` and `app/api/admin/login/route.ts:12`
**Severity:** LOW
**Attack vector:** The HMAC key `"admin-comparison-key"` is hardcoded in source code. While the HMAC is only used to normalize string lengths for `timingSafeEqual` (not for authentication itself -- the actual secret is from `ADMIN_SECRET_KEY` env var), using a hardcoded key is not ideal.
**Details:** This is a cosmetic concern. The HMAC approach is sound -- it prevents length-leakage timing attacks. But the fixed key means all deployments share the same comparison key.

**Suggested fix:** Low priority. Could derive the HMAC key from a deployment-specific value, but the current approach is safe since the HMAC is only used for length normalization, not authentication.

---

#### L2: `sanitizeInput()` limits strings to 1000 characters

**File:** `lib/auth/middleware-utils.ts:306`
**Severity:** LOW
**Details:** The `sanitizeInput` helper truncates input to 1000 characters. This is fine for short fields but could silently truncate valid longer inputs (like strategy document descriptions). Verify that this function is only used for short-field sanitization, not for longer content.

---

#### L3: Admin session stored in-memory, lost on server restart

**File:** `lib/auth/admin-sessions.ts` (referenced from `lib/auth/admin.ts:16`)
**Severity:** LOW
**Details:** Admin sessions use an in-memory store (`createAdminSession()`, `verifyAdminSession()`). In a serverless/multi-instance environment, the admin may need to re-authenticate after each cold start. This is acceptable for an admin panel but worth noting.

**Suggested fix:** For production admin panel usage at scale, consider storing admin sessions in Redis or the database.

---

#### L4: `img-src` CSP directive allows `https:` (any HTTPS source)

**File:** `next.config.mjs:10`
**Severity:** LOW
**Details:** `img-src 'self' data: blob: https:` allows loading images from any HTTPS origin. This is broadly permissive but common for apps that display user-uploaded content or third-party avatars.

---

## Areas Verified as Secure

### 1. Auth on Every Route
- **Root middleware** (`middleware.ts`) runs on all non-static paths, refreshes Supabase auth sessions, and redirects unauthenticated users from protected routes.
- **Protected route config** (`lib/auth/middleware-utils.ts:33-36`) covers: `/dashboard`, `/agents`, `/documents`, `/settings`, `/profile`, `/chat`, `/check-ins`, `/video`, `/onboarding`, `/interactive`, plus `/api/protected/*` pattern.
- **89 API routes** use `requireAuth()` for user authentication.
- **All admin routes** use `isAdminRequest()` with timing-safe secret comparison.
- **Public endpoints** are correctly limited: auth endpoints, static assets, share links.
- **Webhook endpoints** (Stripe, Twilio, Boardy) use signature verification instead of session auth.

### 2. Tier Gating (Client + API)
- **All 5 Pro dashboard pages** use `useUserTier()` + `<FeatureLock>`: positioning, investor-lens, investor-readiness, pitch-deck, strategy.
- **16 API routes** enforce tier checking via `checkTierForRequest()` or `requireTier()`: fred/strategy, fred/investor-readiness, pitch-deck/upload, documents, investor-lens, investors, etc.
- **Studio-tier features** (boardy, sharing, SMS, investor targeting) also enforce tier at API level.
- **Tier middleware** (`lib/api/tier-middleware.ts`) defaults to `FREE` for unrecognized price IDs -- prevents tier escalation via unknown Stripe prices.

### 3. RLS Policies
- **Comprehensive RLS coverage**: Migration `040_rls_hardening.sql` added RLS to all 27 previously unprotected tables.
- **New tables** (`next_steps`, `document_repository`) in `supabase/migrations/` include RLS from creation.
- **All user-data tables** use `auth.uid() = user_id` policies (with `::text` cast for VARCHAR columns).
- **Child/junction tables** use `EXISTS` subqueries through parent ownership.
- **Service role bypass** policies exist on all tables for server-side operations.
- **System tables** (`users`, `ab_promotion_audit_log`) are default-deny with service_role-only access.

### 4. Input Validation & Sanitization
- **POST endpoints** validate required fields before processing (e.g., `admin/training/ratings` validates ratingType enum, ratingValue ranges).
- **Onboarding** uses `stripHtml()` sanitization on all text inputs.
- **Contact form** validates name, email, message presence and email format.
- **Zod validation** used in structured endpoints (e.g., `boardy/callback` uses `z.object()` schema).
- **SQL injection**: Prevented by Supabase SDK's parameterized queries and the `sql` tagged template literal.
- **XSS**: `sanitizeInput()` function HTML-encodes dangerous characters and strips `javascript:`, `data:` URIs, and event handlers.

### 5. Rate Limiting
- **Production rate limiter** (`lib/api/rate-limit.ts`) uses Upstash Redis with sliding window, with in-memory fallback for dev.
- **Rate-limited endpoints**: Login (5/min/IP), admin login (3/min/IP), contact form (5/hr/IP), onboarding (10/hr/IP).
- **Tier-based limits**: Free (20/min), Pro (100/min), Studio (500/min).
- **Rate limit headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` included in responses.

### 6. Secrets & Credentials
- **.env files properly gitignored**: `.env`, `.env.local`, `.env.production`, `.env.development` all in `.gitignore`.
- **Only `.env.example` tracked in git**, with all values empty.
- **No hardcoded secrets** found in application code (verified via pattern search).
- **Admin secret** uses `ADMIN_SECRET_KEY` env var with timing-safe comparison.

### 7. CORS & CSP Headers
- **CORS** (`lib/api/cors.ts`): Allowlist-based origin checking. Only `NEXT_PUBLIC_APP_URL`, `localhost:3000`, `localhost:3001` allowed. Credentials enabled.
- **Security headers** in `next.config.mjs`: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` with 1-year max-age, `Permissions-Policy` (restrictive).
- **CSP**: Allowlists self, Stripe, Supabase, AI providers, Sentry, LiveKit. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- **Webhook paths** bypass CORS (use signature verification instead).

### 8. Session Handling
- **Supabase Auth** manages sessions via HTTP-only cookies.
- **Middleware refreshes sessions** on every request (`updateSession()` in `lib/supabase/middleware.ts`).
- **Logout** calls `supabase.auth.signOut()` and returns `clearStorage` keys for client-side cleanup.
- **Admin sessions**: Cookie-based with `httpOnly: true`, `secure` in production, `sameSite: strict`, 24-hour max age.
- **Stripe webhook**: Idempotent event processing with `recordStripeEvent` using `ON CONFLICT DO NOTHING`.

---

## Recommendations Summary (Priority Order)

1. **[HIGH] Protect `/api/health/ai`** - Add admin auth check
2. **[HIGH] Protect `/api/setup-db`** - Add admin auth in addition to NODE_ENV check
3. **[MEDIUM] Fix timing-safe comparison** in auto-promotion and alerts check cron routes
4. **[MEDIUM] Update Permissions-Policy** to allow `microphone=(self)` for voice features
5. **[MEDIUM] Migrate invite rate limiter** from in-memory to Upstash Redis
6. **[MEDIUM] Add VAPID env validation** before non-null assertion usage
7. **[POST-LAUNCH] Implement nonce-based CSP** to remove `unsafe-inline`/`unsafe-eval`
