# Sahara Launch Audit: API, Database & Integrations

**Auditor:** api-auditor
**Date:** 2026-02-13
**Scope:** All API routes, database migrations, Stripe/Supabase/Twilio/LiveKit/AI integrations, environment variables, cron jobs, webhooks

---

## Executive Summary

The Sahara API layer is **substantially complete and well-engineered** for launch. 132 route files export properly-typed HTTP handlers with consistent error handling. All critical integrations (Stripe, Supabase Auth, Twilio, LiveKit, AI providers) are fully wired with signature verification, fallback chains, and idempotency guards.

**Key findings:**
- **0 BLOCKERS** -- No issues that prevent launch
- **3 HIGH** issues -- Missing env vars in `.env.example`, LiveKit webhook receiver instantiated with empty strings at module scope, Communities feature has unlisted env var
- **4 MEDIUM** issues -- Stale model references in AI config, health endpoint unauthenticated, setup-db route still compiled, verification code not cryptographically random
- **4 LOW** issues -- Minor observability/consistency improvements

The previously-reported "5 stub admin training routes returning 503" has been **fully resolved** -- all 5 routes now contain real database-backed implementations with proper `safeQuery` fallbacks.

---

## 1. API Route Matrix

### Total: 132 route files under `app/api/`

| Route | Methods | Auth | Status | Issues |
|---|---|---|---|---|
| **Auth** | | | | |
| `/api/auth/login` | POST | Rate-limited (5/min/IP) | OK | -- |
| `/api/auth/logout` | POST | Session | OK | -- |
| `/api/auth/me` | GET | Session | OK | -- |
| **Stripe** | | | | |
| `/api/stripe/checkout` | POST | requireAuth | OK | Graceful 503 if unconfigured |
| `/api/stripe/webhook` | POST | Signature | OK | Idempotent, sig verified |
| `/api/stripe/portal` | POST | requireAuth | OK | -- |
| **SMS** | | | | |
| `/api/sms/webhook` | POST | Twilio sig | OK | Replay attack protection |
| `/api/sms/preferences` | GET, POST | requireAuth + Studio tier | OK | Zod validated |
| `/api/sms/verify` | POST, PUT | requireAuth + Studio tier | OK | **M-04**: Math.random() |
| **LiveKit** | | | | |
| `/api/livekit/token` | GET, POST | requireAuth + Studio tier | OK | Room name sanitized |
| `/api/livekit/webhook` | POST | SDK auth | OK | **H-03**: module-scope init |
| **Fred (AI Chat)** | | | | |
| `/api/fred/chat` | POST | requireAuth + rate-limited | OK | Streaming SSE |
| `/api/fred/analyze` | POST | requireAuth | OK | -- |
| `/api/fred/call` | POST | requireAuth + Pro tier | OK | -- |
| `/api/fred/call/summary` | GET | requireAuth | OK | -- |
| `/api/fred/decide` | POST | requireAuth | OK | -- |
| `/api/fred/export` | GET | requireAuth | OK | -- |
| `/api/fred/history` | GET | requireAuth | OK | -- |
| `/api/fred/investor-readiness` | POST | requireAuth | OK | -- |
| `/api/fred/memory` | GET, POST, DELETE | requireAuth | OK | -- |
| `/api/fred/memory/stats` | GET | requireAuth | OK | -- |
| `/api/fred/mode` | GET, POST | requireAuth | OK | -- |
| `/api/fred/pitch-review` | POST | requireAuth | OK | -- |
| `/api/fred/reality-lens` | POST | requireAuth | OK | -- |
| `/api/fred/strategy` | GET, POST | requireAuth | OK | -- |
| `/api/fred/strategy/[id]` | GET, PUT, DELETE | requireAuth | OK | -- |
| `/api/fred/strategy/[id]/export` | GET | requireAuth | OK | -- |
| **Admin** | | | | |
| `/api/admin/login` | POST | Rate-limited (3/min/IP) | OK | timing-safe compare |
| `/api/admin/logout` | POST | adminSession | OK | -- |
| `/api/admin/dashboard` | GET | isAdminRequest | OK | -- |
| `/api/admin/config` | GET, POST | isAdminRequest | OK | -- |
| `/api/admin/analytics/engagement` | GET | isAdminRequest | OK | -- |
| `/api/admin/prompts` | GET, POST | isAdminRequest | OK | -- |
| `/api/admin/prompts/activate` | POST | isAdminRequest | OK | -- |
| `/api/admin/prompts/test` | POST | isAdminRequest | OK | -- |
| `/api/admin/ab-tests` | GET, POST | isAdminRequest | OK | -- |
| `/api/admin/ab-tests/[id]` | GET, PUT, DELETE | isAdminRequest | OK | -- |
| `/api/admin/ab-tests/[id]/end` | POST | isAdminRequest | OK | -- |
| `/api/admin/ab-tests/[id]/promote` | POST | isAdminRequest | OK | -- |
| `/api/admin/ab-tests/[id]/traffic` | PUT | isAdminRequest | OK | -- |
| `/api/admin/training/metrics` | GET, POST | isAdminRequest | OK | safeQuery fallback |
| `/api/admin/training/ratings` | GET, POST | isAdminRequest | OK | safeQuery fallback |
| `/api/admin/training/requests` | GET | isAdminRequest | OK | safeQuery fallback |
| `/api/admin/training/requests/[id]` | GET | isAdminRequest | OK | safeQuery fallback |
| `/api/admin/voice-agent/analytics` | GET, POST | isAdminRequest | OK | -- |
| `/api/admin/voice-agent/config` | GET, POST, PUT | isAdminRequest | OK | -- |
| `/api/admin/voice-agent/escalation` | GET, POST | isAdminRequest | OK | -- |
| `/api/admin/voice-agent/knowledge` | GET, POST, DELETE | isAdminRequest | OK | -- |
| **Cron** | | | | |
| `/api/cron/weekly-checkin` | GET | CRON_SECRET (HMAC) | OK | timing-safe |
| `/api/cron/weekly-digest` | GET | CRON_SECRET (HMAC) | OK | timing-safe |
| `/api/cron/re-engagement` | GET | CRON_SECRET (HMAC) | OK | timing-safe |
| **Dashboard** | | | | |
| `/api/dashboard/command-center` | GET | requireAuth | OK | -- |
| `/api/dashboard/documents` | GET | requireAuth | OK | -- |
| `/api/dashboard/nav` | GET | requireAuth | OK | -- |
| `/api/dashboard/next-actions` | GET | requireAuth | OK | -- |
| `/api/dashboard/next-steps` | GET, POST, PUT | requireAuth | OK | -- |
| `/api/dashboard/profile/snapshot` | GET | requireAuth | OK | -- |
| `/api/dashboard/readiness` | GET | requireAuth | OK | -- |
| `/api/dashboard/stats` | GET | requireAuth | OK | -- |
| `/api/dashboard/strategy/reframe` | POST | requireAuth | OK | -- |
| **Communities** | | | | |
| `/api/communities` | GET, POST | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]` | GET, PUT | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/members` | GET, POST, DELETE | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/posts` | GET, POST | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/posts/[postId]` | GET, PUT, DELETE | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/posts/[postId]/replies` | GET, POST | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/posts/[postId]/replies/[replyId]` | PUT, DELETE | requireAuth | OK | Feature-flagged |
| `/api/communities/[slug]/posts/[postId]/reactions` | GET, POST | requireAuth | OK | Feature-flagged |
| `/api/community/consent` | POST | requireAuth | OK | -- |
| **Other** | | | | |
| `/api/health/ai` | GET, POST | **None** | **M-01** | Unauthenticated |
| `/api/setup-db` | GET | NODE_ENV check | **M-02** | Compiled into prod |
| `/api/ai/rating` | POST | requireAuth | OK | -- |
| `/api/agents` | GET, POST | requireAuth | OK | -- |
| `/api/agents/[agentId]` | GET, PUT, DELETE | requireAuth | OK | -- |
| `/api/agents/tasks` | GET, POST | requireAuth | OK | -- |
| `/api/boardy/callback` | POST | Signature | OK | -- |
| `/api/boardy/match` | POST | requireAuth | OK | -- |
| `/api/check-ins` | GET, POST | requireAuth | OK | -- |
| `/api/coaching/participants` | GET, POST | requireAuth | OK | -- |
| `/api/coaching/sessions` | GET, POST | requireAuth | OK | -- |
| `/api/contact` | POST | Rate-limited | OK | -- |
| `/api/diagnostic/*` (7 routes) | GET/POST | requireAuth | OK | -- |
| `/api/documents/*` (6 routes) | GET/POST/PUT/DELETE | requireAuth | OK | -- |
| `/api/document-repository/*` (3 routes) | GET/POST/PUT/DELETE | requireAuth | OK | -- |
| `/api/experiments/auto-promote` | POST | CRON_SECRET | OK | -- |
| `/api/inbox` | GET | requireAuth | OK | -- |
| `/api/insights/*` (4 routes) | GET | requireAuth | OK | -- |
| `/api/investor-lens/*` (4 routes) | GET/POST | requireAuth | OK | -- |
| `/api/investors/*` (4 routes) | GET/POST | requireAuth | OK | -- |
| `/api/journey/*` (5 routes) | GET/POST/PUT | requireAuth | OK | -- |
| `/api/monitoring/*` (9 routes) | GET/POST/PUT | Mixed | OK | -- |
| `/api/notifications/*` (7 routes) | GET/POST/PUT | requireAuth | OK | -- |
| `/api/onboard` | POST | requireAuth | OK | -- |
| `/api/onboard/invite` | POST | requireAuth | OK | -- |
| `/api/pitch-deck/*` (2 routes) | POST | requireAuth | OK | -- |
| `/api/positioning/*` (4 routes) | GET/POST | requireAuth | OK | -- |
| `/api/push/*` (2 routes) | POST | requireAuth | OK | -- |
| `/api/red-flags` | GET, POST | requireAuth | OK | -- |
| `/api/red-flags/[id]` | PUT, DELETE | requireAuth | OK | -- |
| `/api/share` | POST | requireAuth | OK | -- |
| `/api/share/[token]` | GET | Token auth | OK | -- |
| `/api/team` | GET, POST, PUT | requireAuth | OK | -- |
| `/api/team/accept` | POST | Token | OK | -- |
| `/api/team/invitations` | GET, POST, DELETE | requireAuth | OK | -- |
| `/api/user/delete` | DELETE | requireAuth | OK | -- |
| `/api/user/subscription` | GET | requireAuth | OK | -- |
| `/api/wellbeing/check-in` | POST | requireAuth | OK | -- |

---

## 2. Integration Status

| Integration | Fully Wired | Gaps |
|---|---|---|
| **Supabase Auth** | YES | None -- SSR cookies, middleware refresh, getUser() properly configured |
| **Supabase DB (RLS)** | YES | All 4 migrations use proper RLS + service_role bypass policies |
| **Stripe Checkout** | YES | Signature verified, idempotency via `stripe_events` table |
| **Stripe Portal** | YES | -- |
| **Stripe Webhook** | YES | Handles 6 event types with fallback userId resolution |
| **Twilio SMS** | YES | Signature validation, replay protection, STOP handled in processInboundSMS |
| **LiveKit Voice** | YES | Token scoping, room name sanitization, tier gating |
| **LiveKit Webhook** | PARTIAL | **H-03**: Receiver initialized at module scope with empty strings |
| **OpenAI** | YES | Primary provider, fallback chain, circuit breaker |
| **Anthropic** | YES | Fallback provider with circuit breaker |
| **Google Gemini** | YES | Second fallback with circuit breaker |
| **Resend Email** | YES | Weekly digest, re-engagement, invites |
| **Boardy** | YES | Mock client when BOARDY_API_KEY absent |
| **Upstash Redis** | YES | In-memory fallback for dev |
| **PostHog** | YES | Client + server analytics |
| **Web Push (VAPID)** | YES | -- |
| **Vercel Cron** | YES | 3 jobs configured in vercel.json |

---

## 3. Database Migrations

### Migration Files (4 total, all dated 2026-02-12)

| # | File | Description | Status |
|---|---|---|---|
| 1 | `20260212000001_create_next_steps.sql` | Creates `next_steps` table with RLS | OK |
| 2 | `20260212000002_add_channel_to_episodic_memory.sql` | Adds `channel` column to `fred_episodic_memory` | OK |
| 3 | `20260212000003_create_document_repository.sql` | Creates `document_repository` table + storage bucket | OK |
| 4 | `20260212000004_add_enrichment_data_to_profiles.sql` | Adds `enrichment_data JSONB` column to `profiles` | OK |

**Assessment:**
- Sequential numbering: OK (000001 through 000004, no gaps)
- All use `IF NOT EXISTS` or `IF NOT EXISTS` patterns: idempotent
- Migration 2 uses `ADD COLUMN IF NOT EXISTS`: safe on existing data
- Migration 4 uses `ADD COLUMN IF NOT EXISTS`: safe on existing data
- All tables have proper RLS enabled with user-scoped policies
- Service role bypass policies included for server-side operations
- **Note:** These 4 are the most recent. The codebase references many tables (profiles, ai_requests, ai_responses, ai_ratings, voice_calls, etc.) that were created in earlier migrations not present in this directory -- likely applied previously.

---

## 4. Environment Variables Audit

### Missing from `.env.example` (used in code)

| Variable | Used In | Impact |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `lib/api/rate-limit.ts:40` | Falls back to in-memory, but should be documented |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/api/rate-limit.ts:43` | Falls back to in-memory, but should be documented |
| `COMMUNITIES_ENABLED` | `lib/communities/sanitize.ts:15` | Feature flag, unlisted |

### In `.env.example` but optional (correctly marked)

All other env vars in `.env.example` are properly annotated as `[REQUIRED]` or `[OPTIONAL]`.

### Env validation (`lib/env.ts`)

- Zod schema validates required vars at import time (lazy proxy)
- Server: `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` required
- Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` required
- Stripe keys optional with empty string defaults (correct for dev)
- `validateEnv()` in instrumentation.ts warns on missing optional vars

---

## 5. Stripe Integration Deep Dive

### Pricing Tiers
- **Free**: $0, no Stripe priceId (correct)
- **Fundraising (Pro)**: $99/mo, priceId from `NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID`
- **Venture Studio**: $249/mo, priceId from `NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID`
- Tier mapping in checkout: `PRO -> FUNDRAISING`, `STUDIO -> VENTURE_STUDIO` (correct)

### Webhook Handler
- Signature verification: YES (`constructWebhookEvent` uses `stripe.webhooks.constructEvent`)
- Idempotency: YES (atomic `INSERT ... ON CONFLICT DO NOTHING` via `recordStripeEvent`)
- Events handled: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- UserId resolution: metadata first, then DB lookup by customerId (fallback)
- Error tracking: Failed events logged via `markEventAsFailed`

### Assessment: **Fully production-ready**

---

## 6. AI Provider Integration Deep Dive

### Two AI Client Systems
1. **Vercel AI SDK** (`lib/ai/providers.ts`): Used for streaming responses via `ai` package
2. **Direct clients** (`lib/ai/client.ts`): Used for tracked/logged responses with A/B testing

### Fallback Chain
- Priority: OpenAI (GPT-4o) -> Anthropic (Claude 3.5 Sonnet) -> Google (Gemini 1.5 Pro/Flash)
- Circuit breaker pattern with automatic recovery
- Health monitor with cached checks at `/api/health/ai`

### Model References (M-03)
- `lib/ai/providers.ts:75` references `claude-3-5-sonnet-20241022` (stale -- current is claude-sonnet-4-5-20250929)
- `lib/ai/providers.ts:99` references `o1` (should be `o3` or latest)
- `lib/ai/client.ts:83` references `claude-3-5-sonnet-20241022` (stale)
- `lib/ai/client.ts:102` references `gemini-1.5-flash` (should be `gemini-2.0-flash`)
- `app/api/setup-db/route.ts:71-74` references `gpt-4-turbo-preview` (deprecated)

---

## 7. Detailed Findings

### HIGH Severity

#### H-01: Missing env vars in .env.example
- **File:** `.env.example`
- **Description:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are used in `lib/api/rate-limit.ts` for production rate limiting but are not listed in `.env.example`. In production without Redis, rate limiting falls back to in-memory (per-instance) which is insufficient for multi-instance deployments.
- **Impact:** Rate limiting won't work properly across multiple serverless function instances in production. Brute-force protection on login (5/min/IP) becomes per-instance.
- **Fix:** Add to `.env.example`:
  ```
  # UPSTASH REDIS [REQUIRED for production rate limiting]
  # Falls back to in-memory in development.
  # UPSTASH_REDIS_REST_URL=
  # UPSTASH_REDIS_REST_TOKEN=
  ```

#### H-02: COMMUNITIES_ENABLED env var not documented
- **File:** `lib/communities/sanitize.ts:15`
- **Description:** The communities feature uses `COMMUNITIES_ENABLED=false` as a kill switch, but this var is not listed in `.env.example`.
- **Impact:** Operators have no way to discover this feature flag without reading source code.
- **Fix:** Add to `.env.example` under a new `FEATURE FLAGS` section.

#### H-03: LiveKit WebhookReceiver initialized at module scope with empty strings
- **File:** `app/api/livekit/webhook/route.ts:4-7`
- **Description:** The `WebhookReceiver` is instantiated at module load time with `process.env.LIVEKIT_API_KEY || ''` and `process.env.LIVEKIT_API_SECRET || ''`. If these vars are empty, the receiver is created with empty credentials. The SDK may or may not error gracefully -- but the verification will silently fail or behave unexpectedly.
- **Impact:** If LiveKit credentials are not set, webhook signature verification will fail silently or pass all requests.
- **Fix:** Lazy-initialize the receiver inside the POST handler, or add an explicit guard:
  ```typescript
  export async function POST(req: NextRequest) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
    }
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    // ...
  }
  ```

### MEDIUM Severity

#### M-01: Health endpoint `/api/health/ai` has no authentication
- **File:** `app/api/health/ai/route.ts:16`
- **Description:** The GET and POST endpoints expose detailed provider configuration, circuit breaker states, failure rates, and model information without any authentication.
- **Impact:** Information disclosure -- attackers can see which AI providers are configured, their health status, and failure patterns.
- **Fix:** Either add basic auth/admin check, or reduce the response to only expose an overall status code without details to unauthenticated callers.

#### M-02: `/api/setup-db` route compiled and routable in production
- **File:** `app/api/setup-db/route.ts:15`
- **Description:** While the handler correctly returns 403 in production, the route is still compiled and routable. It should ideally not exist in the production bundle.
- **Impact:** Low -- the 403 guard works, but the route's existence is discoverable and its error response reveals it's a database setup endpoint.
- **Fix:** Consider moving to a CLI script, or add the route to a `.vercelignore` / build exclusion.

#### M-03: Stale AI model identifiers
- **File:** `lib/ai/providers.ts:75,99`, `lib/ai/client.ts:83,102`, `app/api/setup-db/route.ts:71-74`
- **Description:** Several model identifiers reference older versions:
  - `claude-3-5-sonnet-20241022` should be updated to `claude-sonnet-4-5-20250929`
  - `o1` could be `o3` depending on availability
  - `gemini-1.5-flash` and `gemini-1.5-pro` could be updated to `gemini-2.0-flash`
  - `gpt-4-turbo-preview` is deprecated in favor of `gpt-4o`
- **Impact:** Using older models means missing performance/quality improvements. The models still work (backward compatible) so this is not a blocker.
- **Fix:** Update model identifiers to latest versions.

#### M-04: SMS verification code uses Math.random()
- **File:** `app/api/sms/verify/route.ts:56`
- **Description:** The 6-digit verification code is generated with `Math.floor(100000 + Math.random() * 900000)`, which uses a non-cryptographic PRNG.
- **Impact:** Verification codes are potentially predictable. Combined with the 10-minute window and per-user scope, exploitation is difficult but the fix is trivial.
- **Fix:** Use `crypto.randomInt(100000, 999999)` instead.

### LOW Severity

#### L-01: Fred chat TODOs for file upload detection
- **File:** `app/api/fred/chat/route.ts:370,439`
- **Description:** Two TODO comments: `// TODO: detect from attachments when file upload is wired` indicating deck upload detection is stubbed.
- **Impact:** Deck-related prompts won't automatically trigger when a user uploads a file. Feature gap, not a bug.
- **Fix:** Wire up file upload detection when the upload feature is implemented.

#### L-02: LiveKit webhook handler only logs events
- **File:** `app/api/livekit/webhook/route.ts:37-59`
- **Description:** The webhook handler receives and validates events but only logs them -- no business logic is executed (e.g., updating call records, triggering follow-ups).
- **Impact:** Voice call lifecycle events are not persisted. Admin voice analytics relies on the separate POST endpoint for recording.
- **Fix:** Add event persistence for room lifecycle tracking if needed for analytics.

#### L-03: Inconsistent error response format in some admin routes
- **File:** Various admin routes
- **Description:** Most routes return `{ success: false, error: "..." }` but some return `{ error: "..." }` without the `success` field.
- **Impact:** Frontend error handling may need to check for both formats.
- **Fix:** Standardize on `{ success: boolean, error?: string }` across all routes.

#### L-04: setup-db route references deprecated model names
- **File:** `app/api/setup-db/route.ts:71-74`
- **Description:** Default AI config seeds reference `gpt-4-turbo-preview` which is deprecated.
- **Impact:** If setup-db is ever run, it would seed stale model configs. Admin can override via the config API.
- **Fix:** Update to `gpt-4o`.

---

## 8. Cron Jobs & Webhooks Summary

### Cron Jobs (3 configured in `vercel.json`)

| Job | Schedule | Auth | Dependencies |
|---|---|---|---|
| Weekly Check-in | Monday 2 PM UTC | CRON_SECRET (HMAC) | Twilio |
| Weekly Digest | Monday 10 AM UTC | CRON_SECRET (HMAC) | Resend |
| Re-engagement | Daily 2 PM UTC | CRON_SECRET (HMAC) | Resend |

All cron jobs use timing-safe HMAC comparison for auth. Each gracefully handles missing service credentials (returns 503).

### Webhooks (3 external)

| Webhook | Provider | Auth Method | Status |
|---|---|---|---|
| `/api/stripe/webhook` | Stripe | `stripe.webhooks.constructEvent` signature | Fully secured |
| `/api/sms/webhook` | Twilio | `validateWebhook` signature + replay protection | Fully secured |
| `/api/livekit/webhook` | LiveKit | `WebhookReceiver.receive` signature | **H-03**: init issue |

---

## 9. Summary Scorecard

| Category | Score | Notes |
|---|---|---|
| API Coverage | 10/10 | 132 routes, no dead stubs |
| Error Handling | 9/10 | Consistent try/catch, minor format inconsistencies |
| Authentication | 9/10 | All user routes use requireAuth, admin uses session + key |
| Webhook Security | 9/10 | All 3 webhooks verify signatures (LiveKit has init concern) |
| Database Migrations | 10/10 | Sequential, idempotent, proper RLS |
| Stripe Integration | 10/10 | Complete checkout, webhook, portal with idempotency |
| Supabase Auth | 10/10 | SSR cookies, middleware refresh, getUser |
| AI Providers | 9/10 | 3-provider fallback with circuit breaker (stale model IDs) |
| Env Var Documentation | 8/10 | 3 vars missing from .env.example |
| Cron Jobs | 10/10 | Properly secured, graceful degradation |

**Overall: LAUNCH READY** -- Address H-01 through H-03 before launch for production hardening.
