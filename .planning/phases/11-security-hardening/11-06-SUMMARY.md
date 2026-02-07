# Phase 11 Plan 06: Service Role Key Scoping & Error Sanitization Summary

**One-liner:** Sanitized all API error responses to prevent information disclosure -- removed raw error.message from 19 route files across 30+ catch blocks.

## Completed Tasks

### Task 1: Audit Service Role Usage
All `createServiceClient()` usages were audited across the codebase. Every usage is legitimate:
- `lib/db/fred-memory.ts` -- Server-side FRED memory CRUD (no RLS, service role required)
- `lib/db/supabase-sql.ts` -- SQL tagged template for admin/monitoring queries
- `app/api/contact/route.ts` -- Contact form submission (no user session)
- `app/api/setup-db/route.ts` -- Database setup (admin only)
- `app/api/dashboard/stats/route.ts` -- Aggregated dashboard statistics
- `app/api/fred/history/route.ts` -- Decision history queries
- `app/api/user/delete/route.ts` -- Account deletion (needs admin privileges)
- `app/api/sms/verify/route.ts` -- Phone verification (needs admin privileges)
- `app/api/sms/preferences/route.ts` -- SMS preferences with write operations
- `app/api/admin/voice-agent/*` -- Admin-only voice agent config
- `app/api/investor-lens/*` -- Investor analysis (server-side AI pipeline)
- `app/api/journey/stats/route.ts` -- Journey statistics
- `lib/fred/scoring/calibration.ts` -- Score calibration (server-only)
- `lib/voice-agent.ts` -- Voice agent operations

**Conclusion:** No service role clients can be safely switched to user-scoped without RLS policies. All usages are correct for their context.

### Task 2: Sanitize Error Messages in API Responses (PRIMARY)
Found and fixed error message leaks in 19 API route files:

**Pattern 1 -- Raw `error.message` in response (most dangerous):**
- `monitoring/alerts` -- GET and POST both leaked `message: error.message`
- `monitoring/variants/[id]` -- GET leaked `message: error.message`
- `monitoring/experiments/[name]` -- GET leaked `message: error.message` in both 404 and 500
- `monitoring/experiments/[name]/promote` -- GET/POST/DELETE leaked `message: error.message` in 8 catch paths
- `monitoring/experiments/[name]/history` -- GET leaked `message: error.message`
- `notifications/send` -- POST and batch handler leaked `message: error.message`

**Pattern 2 -- `error instanceof Error ? error.message : "Unknown error"` (conditional leak):**
- `admin/ab-tests/[id]/promote` -- GET/POST/DELETE leaked via `message: error instanceof Error ? error.message : "Unknown error"`
- `fred/analyze` -- POST leaked error details
- `fred/chat` -- POST and SSE stream leaked error details
- `fred/decide` -- POST leaked error details
- `fred/history` -- GET leaked error details
- `fred/memory` -- GET/POST/DELETE leaked error details

**Pattern 3 -- `error.message` in error field itself:**
- `monitoring/charts` -- GET used `error: error instanceof Error ? error.message : "..."`
- `monitoring/health` -- GET used `error: error instanceof Error ? error.message : "..."`
- `health/ai` -- GET/POST used `error: error instanceof Error ? error.message : "Unknown error"`
- `monitoring/health` -- DB check helper embedded error.message in status message

**Pattern 4 -- `details: errorMessage` on 500 responses:**
- `pitch-deck/upload` -- POST leaked `details: errorMessage` on 500
- `pitch-deck/parse` -- POST leaked `details: errorMessage` on 500

**Fix applied to all:**
1. Added/verified `console.error('[RouteName] Error:', error)` for server-side logging
2. Replaced error.message in JSON responses with generic messages
3. Changed `catch (error: any)` to `catch (error)` for type safety
4. Added `error instanceof Error` guards before accessing `error.message` for branching logic
5. Kept controlled validation errors (FileValidationError, PDFParseError) on 400 responses -- these have user-facing messages by design

### Task 3: Service Role Scoping Assessment
As determined in Task 1, no service role clients should be changed. Without RLS policies in place, switching from service role to user-scoped client would break all queries. The error sanitization (Task 2) is the safe, high-value deliverable.

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Keep all service role clients as-is | No RLS policies exist; switching would break queries |
| 2 | Remove `message` field entirely from error responses (not replace with generic) | Cleaner API surface; the `error` field already has a generic description |
| 3 | Keep validation error details on 400 responses (FileValidationError, PDFParseError) | These are controlled error classes with user-facing messages |
| 4 | Replace `catch (error: any)` with `catch (error)` | Eliminates TypeScript escape hatch; forces proper instanceof checks |
| 5 | Use `error instanceof Error` guard before `error.message` | Type-safe access pattern; prevents crashes on non-Error throws |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Additional routes with error leaks**
- **Found during:** Task 2 comprehensive search
- **Issue:** Plan only listed monitoring/alerts and admin/ab-tests, but 15+ additional routes also leaked error.message
- **Fix:** Applied same sanitization pattern to all discovered routes (fred/*, health/ai, notifications/send, pitch-deck/*, monitoring/*)
- **Files modified:** 19 total API route files
- **Commit:** 21c3ea9

## Verification

- `grep -r "message: error" app/api/ --include="*.ts"` returns 0 matches for error.message in JSON responses
- `npx tsc --noEmit` passes (pre-existing errors in boardy/sms/strategy unrelated to this change)
- All error responses now return generic messages while logging full details server-side

## Metrics

- **Duration:** ~7 minutes
- **Files modified:** 19
- **Catch blocks sanitized:** 30+
- **Patterns eliminated:** 4 distinct information disclosure patterns
- **Commit:** 21c3ea9
