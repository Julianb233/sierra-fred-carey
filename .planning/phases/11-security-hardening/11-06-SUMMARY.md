# Phase 11 Plan 06: Service Role Key Scoping & Error Sanitization Summary

**One-liner:** DI migration for 5 DB modules (accept SupabaseClient param), user-scoped clients for user-initiated routes, plus error.message sanitization across 19 API route files.

## Completed Tasks

### Task 1: Audit Service Role Usage
All `createServiceClient()` usages were audited and categorized:

**Keep service role (admin/background/webhook):**
- `lib/db/fred-memory.ts` -- Server-side FRED memory CRUD (no user session context)
- `lib/db/supabase-sql.ts` -- SQL tagged template for admin/monitoring queries
- `app/api/contact/route.ts` -- Contact form submission (no user session)
- `app/api/dashboard/stats/route.ts` -- Aggregated dashboard stats (TODO: needs RLS)
- `app/api/fred/history/route.ts` -- Decision history (TODO: needs RLS)
- `app/api/user/delete/route.ts` -- Account deletion (needs admin privileges)
- `app/api/sms/verify/route.ts` -- Phone verification (needs admin privileges, TODO)
- `app/api/admin/voice-agent/*` -- Admin-only voice agent config
- `app/api/investor-lens/*` -- Investor analysis (TODO: needs RLS)
- `app/api/journey/stats/route.ts` -- Journey statistics (TODO: needs RLS)
- `lib/fred/scoring/calibration.ts` -- Score calibration (server-only)
- `lib/sms/scheduler.ts` -- Cron job (no user session)
- `lib/sms/webhook-handler.ts` -- Inbound SMS webhook (no user session)
- `lib/boardy/mock.ts` -- Background AI processing (no user session)
- `app/api/boardy/callback/route.ts` -- Webhook (no user session)

**Switched to user-scoped (createClient):**
- `app/api/fred/investor-readiness/route.ts`
- `app/api/fred/pitch-review/route.ts`
- `app/api/fred/strategy/route.ts`
- `app/api/fred/strategy/[id]/route.ts`
- `app/api/fred/strategy/[id]/export/route.ts`
- `app/api/sms/preferences/route.ts`

### Task 2: Create User-Scoped DB Helper
Already satisfied by existing `createClient()` in `lib/supabase/server.ts` which uses `@supabase/ssr` with cookie-based auth. Added `createUserClient` alias for clarity. Also exported `SupabaseClient` type for callers.

### Task 3: Migrate DB Modules to Dependency Injection
All 5 DB modules now accept `SupabaseClient` as first parameter:

| Module | Functions Migrated | Old Pattern |
|--------|-------------------|-------------|
| `lib/db/boardy.ts` | createMatch, getMatches, updateMatchStatus, deleteMatchesByStatus, getMatchById | Lazy Proxy with service client |
| `lib/db/sms.ts` | createCheckin, getCheckinHistory, getCheckinByMessageSid, findUserByPhoneNumber, updateCheckinStatus, getUserSMSPreferences, updateSMSPreferences, getOptedInUsers | Lazy Proxy with service client |
| `lib/fred/irs/db.ts` | saveIRSResult, getIRSHistory, getLatestIRS, getIRSById, deleteIRS | getSupabase() factory |
| `lib/fred/strategy/db.ts` | saveStrategyDocument, getStrategyDocuments, getStrategyDocumentById, updateStrategyDocument, deleteStrategyDocument | getSupabase() factory |
| `lib/fred/pitch/db.ts` | savePitchReview, getPitchReview, getPitchReviews, getPitchReviewByDocument | getSupabase() factory |

All callers updated:
- User-initiated routes pass `await createClient()` (user-scoped)
- Webhooks/cron pass `createServiceClient()` (service role)
- Background AI processing passes `createServiceClient()` (no user session)

Also simplified `createServiceClient()` to use `@supabase/supabase-js` directly instead of creating a server client with empty cookie adapter.

### Task 4: Sanitize Error Messages in API Responses
Found and fixed error message leaks in 19 API route files (30+ catch blocks):

**Patterns eliminated:**
1. Raw `error.message` in response body (monitoring/*, notifications/send)
2. `error instanceof Error ? error.message : "Unknown error"` conditional leak (fred/*, admin/ab-tests)
3. `error.message` in error field itself (monitoring/charts, monitoring/health, health/ai)
4. `details: errorMessage` on 500 responses (pitch-deck/upload, pitch-deck/parse)

**Fix pattern applied:**
1. Server-side: `console.error('[RouteName] Error:', error)` for logging
2. Client-side: generic error message in JSON response
3. Changed `catch (error: any)` to `catch (error)` for type safety
4. Added `error instanceof Error` guards for branching logic
5. Kept FileValidationError/PDFParseError on 400s (user-facing by design)
6. Fixed `app/api/onboard/route.ts` leaking `signUpError.message`

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Dependency injection pattern for DB modules | Callers choose user-scoped or service-role client; eliminates hardcoded service key usage in user-initiated flows |
| 2 | User routes use createClient(), webhooks/cron use createServiceClient() | User-scoped client respects RLS; service role needed for background jobs without user session |
| 3 | Simplified createServiceClient() to use @supabase/supabase-js directly | Service role bypasses RLS; no cookie adapter needed |
| 4 | TODO comments on routes needing RLS before switching | investor-lens, journey/stats, dashboard/stats need RLS policies before safe migration |
| 5 | Keep validation error details on 400 responses | FileValidationError, PDFParseError have user-facing messages by design |
| 6 | Replace `catch (error: any)` with `catch (error)` | Type safety; forces proper instanceof checks |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Additional routes with error leaks**
- **Found during:** Task 4 comprehensive search
- **Issue:** Plan only listed monitoring/alerts and admin/ab-tests, but 15+ additional routes also leaked error.message
- **Fix:** Applied same sanitization pattern to all discovered routes
- **Files modified:** 19 total API route files
- **Commit:** 21c3ea9

**2. [Rule 1 - Bug] Onboard route leaked Supabase error message**
- **Found during:** Task 4 comprehensive search
- **Issue:** `app/api/onboard/route.ts` returned `signUpError.message` to clients
- **Fix:** Replaced with generic "Account creation failed. Please try again."
- **Files modified:** app/api/onboard/route.ts
- **Commit:** 3ce3426

## Verification

- `npx tsc --noEmit` passes with zero errors
- All error responses return generic messages; server-side logging preserved
- All DB module callers pass appropriate SupabaseClient
- No direct service client creation remains in the 5 migrated DB modules

## Metrics

- **Duration:** ~15 minutes (two-phase execution)
- **Files modified:** 44 total (19 error sanitization + 25 DI migration)
- **DB functions migrated:** 27 across 5 modules
- **Callers updated:** 14 route/handler files
- **Catch blocks sanitized:** 30+
- **Commits:** 21c3ea9 (error sanitization), 3ce3426 (DI migration)
