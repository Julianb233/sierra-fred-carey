# Database & Data Layer Audit Results

**Date:** 2026-02-06
**Scope:** Supabase clients, all API routes with DB calls, setup-db, diagnostics, CRUD routes, fred-cary-db/, graceful degradation
**Files examined:** 40+ route files, 10 lib/db files, 34 migration files, fred-cary-db/ directory

---

## Executive Summary

The data layer is generally well-structured with proper use of Supabase's parameterized queries via the `sql` tagged template literal, consistent authentication via `requireAuth()`, and ownership scoping (WHERE user_id = ...). Several critical and high-severity issues were found and fixed. The remaining findings are documented below for tracking.

**Issues found:** 20 total (3 CRITICAL, 5 HIGH, 7 MEDIUM, 5 LOW)
**Issues fixed:** 8 (all CRITICAL and most HIGH)

---

## 1. Supabase Client Initialization Review

### 1.1 Client Files

| File | Client Type | Key Used | Purpose | Status |
|------|------------|----------|---------|--------|
| `lib/supabase/client.ts` | Browser (SSR) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side, singleton | OK |
| `lib/supabase/server.ts` (createClient) | Server (SSR) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server components with cookies | OK |
| `lib/supabase/server.ts` (createServiceClient) | Server (service role) | `SUPABASE_SERVICE_ROLE_KEY` | Admin/webhook operations | OK |
| `lib/supabase/middleware.ts` | Server (SSR) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Session refresh | OK |
| `lib/db/supabase-sql.ts` | Service role | `SUPABASE_SERVICE_ROLE_KEY` | SQL template literal interface | OK |

### 1.2 Module-Level Clients (MEDIUM risk)

Six files create Supabase clients at module level using `createClient()` directly:

| File | Risk | Mitigation |
|------|------|------------|
| `lib/db/documents.ts` | Module-level client with `!` assertion | Will crash at import time if env vars missing |
| `lib/db/boardy.ts` | Module-level client with `!` assertion | Same |
| `lib/db/sms.ts` | Module-level client with `!` assertion | Same |
| `lib/fred/strategy/db.ts` | Module-level client with `!` assertion | Same |
| `lib/fred/pitch/db.ts` | Module-level client with `!` assertion | Same |
| `lib/fred/irs/db.ts` | Module-level client with `!` assertion | Same |
| `lib/db/agent-tasks.ts` | Lazy-init via Proxy | **Good pattern** - handles missing env vars |

**Recommendation:** Follow the `agent-tasks.ts` lazy-init pattern for all module-level clients. Not fixed in this audit (low blast radius -- build fails early if vars missing).

### 1.3 Service Role vs Anon Key Usage

- **Correct:** `createServiceClient()` is used for admin operations, webhooks, and the `sql` tagged template
- **Correct:** `createClient()` (anon key) is used for user-facing server components and auth
- **Correct:** Browser client uses anon key only
- **No misuse found** -- no route passes service role key to client-side

---

## 2. SQL Injection Analysis

### 2.1 `sql` Tagged Template (Safe)

The `lib/db/supabase-sql.ts` uses a tagged template literal that converts template interpolations into parameterized `$N` placeholders. This is safe against SQL injection for all normal usage. All API routes using `sql\`...\`` with `${value}` interpolation are properly parameterized.

### 2.2 `sql.unsafe()` Usage (FIXED)

| File | Line | Usage | Severity | Status |
|------|------|-------|----------|--------|
| `app/api/notifications/config/route.ts` | 314 | `SET ${sql.unsafe(updates.join(", "))}` | **CRITICAL** | **FIXED** |
| `app/api/notifications/settings/route.ts` | 362 | `SET ${sql.unsafe(updateFields.join(", "))}` | **CRITICAL** | **FIXED** |
| `app/api/admin/config/route.ts` | 184 | `await sql.unsafe(query, values)` | MEDIUM | Open (admin-only) |
| `app/api/admin/ab-tests/[id]/route.ts` | 287 | `await sql.unsafe(query, values)` | MEDIUM | Open (admin-only) |
| `app/api/admin/ab-tests/route.ts` | 350 | `await sql.unsafe(query, values)` | MEDIUM | Open (admin-only) |
| `app/api/insights/trends/route.ts` | 50, 58 | `${sql.unsafe(dateFormat)}` | LOW | Open (ternary-guarded) |
| `lib/ai/config-loader.ts` | 267 | `await sql.unsafe(query, values)` | MEDIUM | Open (internal) |

**Fix applied:** Notifications config and settings PATCH routes were rewritten to use the COALESCE pattern, eliminating `sql.unsafe()` entirely. The original code built `$N` placeholder strings that were embedded inside `sql.unsafe()`, meaning the placeholders were never bound to actual parameter values -- they would appear as literal `$1`, `$2` in the query, causing runtime errors or unexpected behavior.

### 2.3 Remaining `sql.unsafe()` Risk Assessment

The admin routes (`/api/admin/*`) use `sql.unsafe(query, values)` where:
- Column names are hardcoded in code (not from user input)
- Values are passed as a separate array with `$N` placeholders
- All routes are behind admin authentication

**Risk:** LOW in current state, but the pattern invites future mistakes. Recommend refactoring to COALESCE pattern or Supabase native SDK.

---

## 3. Error Handling on DB Operations

### 3.1 Proper Error Handling (Good)

Most routes follow the correct pattern:
```typescript
try {
  const userId = await requireAuth();
  // ... DB operations
} catch (error) {
  if (error instanceof Response) return error; // Auth errors
  // Generic error response (no leak)
}
```

### 3.2 Error Message Leaks (FIXED)

| File | Issue | Status |
|------|-------|--------|
| `app/api/notifications/settings/route.ts` | `error.message` leaked in GET, POST, PATCH, DELETE responses | **FIXED** |

**Fix applied:** All four error handlers now return generic error messages instead of `error.message`.

### 3.3 Missing Table Graceful Degradation (Good -- verified)

The following routes correctly handle missing tables (commit 0ef65d2):

| Route | Pattern | Status |
|-------|---------|--------|
| `app/api/check-ins/route.ts` GET | `error?.code === "42P01" || error?.message?.includes("does not exist")` | OK |
| `app/api/notifications/config/route.ts` GET | Same pattern | OK |
| `app/api/notifications/logs/route.ts` GET | Same pattern | OK |
| `lib/db/agent-tasks.ts` | `PGRST205` + `relation` + `42P01` | OK |
| `lib/db/boardy.ts` | Same pattern | OK |
| `lib/db/sms.ts` | Same pattern | OK |
| `lib/db/subscriptions.ts` | Try-catch returning null | OK |

**Missing graceful degradation (LOW risk):**
- `app/api/documents/route.ts` -- will 500 if `documents` table missing
- `app/api/positioning/route.ts` -- will 500 if `positioning_assessments` table missing
- `app/api/diagnostic/state/route.ts` -- will 500 if `diagnostic_states` table missing
- `app/api/diagnostic/events/route.ts` -- will 500 if `diagnostic_events` table missing

These are all behind auth and represent core features that should exist, so missing tables indicate a serious configuration problem.

---

## 4. setup-db Route Security (FIXED)

### Issue: No authentication, exposable in production

**Before:** `GET /api/setup-db` was accessible by anyone, leaking:
- Database table existence status
- Supabase project URL (previously in instructions, cleaned by linter)
- Database schema information

**Fix applied:** Added production guard:
```typescript
if (process.env.NODE_ENV === "production") {
  return NextResponse.json(
    { error: "This endpoint is disabled in production" },
    { status: 403 }
  );
}
```

---

## 5. Diagnostic Routes Data Leak Analysis (FIXED)

### 5.1 `GET /api/diagnostic/investor` -- HIDDEN_VC_FILTERS exposed (FIXED)

**Before:** The GET endpoint returned `HIDDEN_VC_FILTERS` to any caller, exposing the internal criteria VCs use to silently filter startups. These are specifically meant to be hidden evaluation criteria.

**Fix applied:** Removed `hiddenFilters: HIDDEN_VC_FILTERS` from both GET and POST responses.

### 5.2 Other Diagnostic Routes (OK)

| Route | Auth | Data Scope | Status |
|-------|------|-----------|--------|
| `GET /api/diagnostic` | None (public framework list) | Generic framework descriptions | OK |
| `POST /api/diagnostic` | Optional (getOptionalUserId) | Analysis result + userId | OK |
| `GET /api/diagnostic/state` | `requireAuth()` | User's own state only | OK |
| `PUT /api/diagnostic/state` | `requireAuth()` | User's own state only | OK |
| `POST /api/diagnostic/analyze` | Optional (getOptionalUserId) | Persists only if authenticated | OK |
| `GET /api/diagnostic/events` | `requireAuth()` | User's own events only | OK |
| `POST /api/diagnostic/events` | `requireAuth()` | User's own events only | OK |

---

## 6. CRUD Operations Review

### 6.1 Check-ins (`/api/check-ins`)

| Method | Auth | Ownership | Input Validation | Error Handling | Status |
|--------|------|-----------|-----------------|----------------|--------|
| GET | requireAuth | `WHERE user_id = ${userId}` | N/A | Good + graceful degrade | OK |
| POST | requireAuth | userId from session | JSON body parsed | Good | OK |
| PATCH | requireAuth | `WHERE id = ${id} AND user_id = ${userId}` | ID required | Good + 404 check | OK |

### 6.2 Documents (`/api/documents`)

| Method | Auth | Ownership | Tier Check | Status |
|--------|------|-----------|-----------|--------|
| GET | requireAuth | `WHERE user_id = ${userId}` | Pro tier | OK |
| POST | requireAuth | userId from session | Pro tier | OK |

**Note:** `lib/db/documents.ts` has comprehensive CRUD with ownership checks on all operations. Vector search uses RPC with user_id parameter. Chunk storage batched at 50 per insert with 500 max cap.

### 6.3 Notifications (`/api/notifications/config` and `/api/notifications/settings`)

| Method | Auth | Ownership | Validation | Status |
|--------|------|-----------|-----------|--------|
| GET | requireAuth | `WHERE user_id = ${userId}` | N/A | OK |
| POST | requireAuth | userId from session | Channel, alert levels | OK |
| PATCH | requireAuth | Ownership verified before update | ID required | **FIXED** (was using sql.unsafe) |
| DELETE | requireAuth | `WHERE id = ${id} AND user_id = ${userId}` | ID required | OK |

**Good:** Webhook URLs and routing keys are redacted in GET responses.

### 6.4 Positioning (`/api/positioning`)

| Method | Auth | Ownership | Tier Check | Status |
|--------|------|-----------|-----------|--------|
| GET | requireAuth | `WHERE user_id = ${userId}` | Pro tier | OK |
| POST | requireAuth | userId from session | Pro tier + input length validation | OK |

**Good:** Input validation for companyDescription (50-5000 chars). Pagination with bounded limit (max 100).

### 6.5 Ratings (`/api/ratings`)

Both GET and POST return 503 "temporarily unavailable". No DB operations. **Safe.**

### 6.6 User Subscription (`/api/user/subscription`)

| Method | Auth | Ownership | Status |
|--------|------|-----------|--------|
| GET | requireAuth | userId from session | OK |

**Good:** Only returns subscription status, period end, and cancel flag. No sensitive Stripe data leaked.

### 6.7 Fred Chat (`/api/fred/chat`)

| Method | Auth | Rate Limit | Validation | Status |
|--------|------|-----------|-----------|--------|
| POST | requireAuth | Tier-based | Zod schema (1-10000 chars) | OK |

**Good:** Comprehensive input validation with Zod. Memory storage failures are caught and don't break the response.

---

## 7. Admin Routes Review

### 7.1 Authentication Pattern

All admin routes use one of two patterns:
- Cookie-based: `cookieStore.get("adminKey")?.value === process.env.ADMIN_SECRET_KEY`
- Header-based: `request.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY`

**Both patterns correctly return false when `ADMIN_SECRET_KEY` is unset** (commit b79d202).

### 7.2 Admin Dashboard (`/api/admin/dashboard`)

Uses complex SQL with UNION ALL for activity feed. All queries are against system tables (ai_prompts, ai_config, ab_experiments, ai_ratings). No user data exposed. **OK.**

### 7.3 Voice Agent Admin Routes

| Route | Auth | DB Operations | Status |
|-------|------|--------------|--------|
| `/api/admin/voice-agent/config` | isAdmin (header) | CRUD on voice_agent_config | OK |
| `/api/admin/voice-agent/analytics` | isAdmin (header) | SELECT all voice_calls | MEDIUM -- fetches ALL calls with no pagination |
| `/api/admin/voice-agent/escalation` | isAdmin (header) | CRUD on escalation_rules | OK |

**Issue:** Analytics GET fetches ALL voice_calls records to compute statistics in JavaScript. For high-volume systems, this could cause memory issues. Should use SQL aggregation.

---

## 8. fred-cary-db/ Directory Review

The `fred-cary-db/` directory is a **separate Git repository** containing:
- `Fred_Cary_Profile.md` -- Fred Carey biographical data
- `comma-separated values.csv` -- Data file
- `website/` -- A separate React/Vite website for fredcarey.com

**This is NOT a database directory.** It's a content/knowledge base repository cloned as a Git submodule. There are no migration files, SQL schemas, or database configurations in this directory.

**No migration issues found** -- the actual migrations are in `lib/db/migrations/` (002 through 034) and appear well-structured with:
- Sequential numbering (some gaps for parallel development)
- `CREATE TABLE IF NOT EXISTS` for idempotency
- RLS policies defined
- Appropriate indexes

---

## 9. Connection Handling

### 9.1 Supabase Client Lifecycle

- **Browser:** Singleton pattern in `lib/supabase/client.ts` -- correct
- **Server:** Per-request client creation in `lib/supabase/server.ts` -- correct (Next.js recommendation)
- **Service role:** Per-call creation in `createServiceClient()` -- acceptable (Supabase handles pooling)
- **SQL template:** Per-query service client in `lib/db/supabase-sql.ts` -- acceptable

### 9.2 Module-Level Clients

See section 1.2. Six files create clients at module load time. The Supabase JS client handles connection pooling internally, but these will crash if env vars are missing during build or test.

---

## 10. Null Check Coverage

### 10.1 Proper Null Checks (Good)

Most routes check for empty results:
```typescript
if (!result || result.length === 0) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

### 10.2 Missing Null Checks (LOW risk)

- `app/api/positioning/route.ts` line 578: `parseInt(countResult[0].total)` -- if `countResult` is empty, this will throw
- `app/api/admin/dashboard/route.ts`: Multiple `result[0]?.count` accesses are null-safe via `|| "0"` fallback -- OK
- `lib/db/subscriptions.ts` line 143: `result[0]` after INSERT RETURNING -- should always return, but no guard

---

## 11. Summary of Fixes Applied

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | CRITICAL | `app/api/setup-db/route.ts` | Block in production with NODE_ENV check |
| 2 | CRITICAL | `app/api/notifications/config/route.ts` | Replace `sql.unsafe()` PATCH with COALESCE pattern |
| 3 | CRITICAL | `app/api/notifications/settings/route.ts` | Replace `sql.unsafe()` PATCH with COALESCE pattern |
| 4 | HIGH | `app/api/notifications/settings/route.ts` | Remove error.message leak from 4 error handlers |
| 5 | HIGH | `app/api/diagnostic/investor/route.ts` | Remove HIDDEN_VC_FILTERS from GET response |
| 6 | HIGH | `app/api/diagnostic/investor/route.ts` | Remove HIDDEN_VC_FILTERS from POST response |
| 7 | HIGH | `app/api/notifications/config/route.ts` PATCH | Fix error handler to properly catch auth Response errors |
| 8 | HIGH | `app/api/notifications/config/route.ts` DELETE | Fix error handler to properly catch auth Response errors |

## 12. Remaining Issues (Not Fixed)

| # | Severity | File | Issue | Recommendation |
|---|----------|------|-------|---------------|
| 1 | MEDIUM | 6 lib/db files | Module-level Supabase clients with `!` assertion | Adopt lazy-init pattern from agent-tasks.ts |
| 2 | MEDIUM | `app/api/admin/voice-agent/analytics` | Fetches ALL voice_calls with no limit | Add SQL aggregation or pagination |
| 3 | MEDIUM | Admin routes (3 files) | `sql.unsafe(query, values)` for dynamic updates | Refactor to COALESCE or Supabase SDK |
| 4 | MEDIUM | `lib/ai/config-loader.ts` | `sql.unsafe(query, values)` | Same |
| 5 | LOW | `app/api/insights/trends/route.ts` | `sql.unsafe(dateFormat)` from ternary | Add explicit validation of granularity param |
| 6 | LOW | 4 diagnostic/positioning routes | No graceful degradation for missing tables | Add try-catch with 42P01 handling |
| 7 | LOW | `app/api/positioning/route.ts` L578 | Missing null check on countResult | Add `|| []` fallback |
| 8 | LOW | RLS policies in migration 008 | `FOR ALL USING (true)` -- allows any role | Should restrict to service_role |
| 9 | LOW | `app/api/diagnostic/state/route.ts` PUT | Dead code: lines 140-216 build dynamic query that is never used (COALESCE version at line 219 is used instead) | Remove dead code |
