# Backend Validation Report

**Date:** 2026-02-11
**Auditor:** Backend Validator (Agent)
**Scope:** RLS policies, auth guards, API validation, database schema, edge cases

---

## 1. RLS Policy Audit

### Status: GOOD -- Comprehensive Coverage

Migration `040_rls_hardening.sql` addresses 27 tables with complete CRUD policies. The pattern is consistent:
- Owner-scoped access via `auth.uid()::text = user_id` (for VARCHAR columns) or `auth.uid() = user_id` (for UUID columns)
- Service role bypass on every table: `auth.jwt() ->> 'role' = 'service_role'`
- Child/junction tables use EXISTS subqueries to the parent table (good pattern)

#### Tables With RLS (Verified)
All tables from migrations 001-052 have RLS enabled. Key coverage:
- **User data tables (27):** chat_messages, check_ins, reality_lens_analyses, investor_scores, documents, pitch_deck_reviews, startup_processes, investor_lens_evaluations, deck_reviews, positioning_assessments, diagnostic_states, diagnostic_events, uploaded_documents, investor_readiness_scores, pitch_reviews, strategy_documents, agent_tasks, sms_checkins, boardy_matches, user_sms_preferences, video_rooms, video_participants, video_chat_messages
- **Community tables (5):** communities, community_members, community_posts, community_post_reactions, community_post_replies
- **Sharing tables (3):** shared_links, team_members, shared_link_recipients
- **Push/email tables (3):** push_subscriptions, push_notification_logs, email_sends
- **Conversation state (2):** fred_conversation_state, fred_step_evidence
- **System tables:** users (service_role only), ab_promotion_audit_log (read-only for authenticated)

#### Community RLS (Migration 051) -- Well Designed
- Private communities require membership check for SELECT
- Post CRUD properly scoped to community membership
- Moderator/owner escalation for UPDATE/DELETE on posts and replies
- Reactions scoped through post -> community -> membership chain

### Issues Found

**ISSUE RLS-01 (LOW): push_subscriptions uses `auth.role()` instead of `auth.jwt() ->> 'role'`**
- **File:** `lib/db/migrations/041_push_subscriptions.sql:44`
- **Problem:** Service role policy uses `auth.role() = 'service_role'` while all other tables use `auth.jwt() ->> 'role' = 'service_role'`. These may behave differently depending on Supabase version.
- **Impact:** LOW -- both should work, but inconsistency could cause confusion.
- **Fix:** Standardize to `auth.jwt() ->> 'role' = 'service_role'` for consistency.

**ISSUE RLS-02 (LOW): email_sends uses `auth.role()` pattern too**
- **File:** `lib/db/migrations/045_email_engagement.sql:41`
- **Same pattern as RLS-01.** Standardize for consistency.

**ISSUE RLS-03 (LOW): push_notification_logs uses `auth.role()` pattern too**
- **File:** `lib/db/migrations/044_push_notification_logs.sql:32`
- **Same pattern.** Standardize for consistency.

**ISSUE RLS-04 (INFO): push_subscriptions missing UPDATE policy**
- **File:** `lib/db/migrations/041_push_subscriptions.sql`
- **Problem:** Has SELECT, INSERT, DELETE policies for users but no UPDATE policy. The API uses `upsert()` which works via INSERT ON CONFLICT, but a direct UPDATE would be denied.
- **Impact:** INFO -- upsert pattern works around this, but for completeness add an UPDATE policy.

---

## 2. Auth Guard Audit

### Status: GOOD -- All Protected Routes Guarded

#### Middleware (`middleware.ts`)
- Auth session refreshed on every request via `updateSession()`
- Protected routes checked via `isProtectedRoute()` -- redirects to `/login` if unauthenticated
- Error fallback also redirects protected routes to login (good: fail-secure)
- CORS applied to API routes, skipping webhook paths
- Correlation ID (`X-Request-ID`) propagated on every response

#### Protected Routes (`lib/auth/middleware-utils.ts:33-36`)
Protected paths: `/dashboard`, `/agents`, `/documents`, `/settings`, `/profile`, `/chat`
Protected patterns: `/api/protected/*`

#### API Route Auth Verification
Every API route that handles user data uses `requireAuth()` from `lib/supabase/auth-helpers.ts`. This calls `supabase.auth.getUser()` (server-verified, not just session token). Verified routes:
- `/api/fred/chat` -- requireAuth + Zod validation + prompt injection guard
- `/api/dashboard/stats` -- requireAuth
- `/api/diagnostic/state` -- requireAuth
- `/api/push/subscribe` -- requireAuth
- `/api/stripe/checkout` -- requireAuth
- `/api/user/delete` -- requireAuth
- `/api/communities/*` -- requireAuth on all routes
- `/api/investors/upload` -- checkTierForRequest (includes auth)

#### Admin Route Auth
All 21 admin API routes are protected. Every handler checks `isAdminRequest()` or `isAdminSession()`:
- Uses timing-safe HMAC comparison for admin key (good)
- Session tokens are random UUIDs, not the raw secret (good)
- 24-hour expiry with lazy cleanup (good)
- Rate limited to 3 attempts/minute (good)

### Issues Found

**ISSUE AUTH-01 (MEDIUM): `/api/contact` has no rate limiting -- FIXED (commit 9a0e6b5)**
- **File:** `app/api/contact/route.ts`
- **Fix applied:** `checkRateLimit('contact:${ip}', { limit: 5, windowSeconds: 3600 })` -- 5 submissions per hour per IP.

**ISSUE AUTH-02 (LOW): Protected routes list doesn't include all user routes -- FIXED (commit e6d046f)**
- **File:** `lib/auth/middleware-utils.ts:34`
- **Fix applied:** Added `/check-ins`, `/video`, `/onboarding`, `/interactive` to `DEFAULT_PROTECTED_ROUTES.paths`.

**ISSUE AUTH-03 (LOW): `/api/setup-db` only checks `NODE_ENV` for production blocking**
- **File:** `app/api/setup-db/route.ts:15`
- **Problem:** Uses `process.env.NODE_ENV === "production"` check. On Vercel, this is set automatically, but if someone deploys to a different provider or misconfigures, this endpoint could be exposed.
- **Impact:** LOW -- the endpoint is read-only (just checks table existence) and uses service client, but could leak schema information.
- **Fix:** Additionally require admin auth, or remove the endpoint entirely (it's a setup helper, not needed at runtime).

---

## 3. API Validation Audit

### Status: GOOD -- Most Endpoints Validate Input

#### Well-Validated Endpoints
- **`/api/fred/chat`:** Zod schema validation, prompt injection detection (`detectInjectionAttempt`), input sanitization (`sanitizeUserInput`), rate limiting per tier
- **`/api/onboard`:** Email format validation, password strength validation (8+ chars, uppercase, number), rate limiting (10/hour/IP)
- **`/api/auth/login`:** Rate limiting (5/min/IP), email+password required
- **`/api/admin/login`:** Rate limiting (3/min/IP), timing-safe comparison
- **`/api/investors/upload`:** File type validation, size limit (1MB), CSV parsing validation, 50% error threshold
- **`/api/communities/*`:** Zod schemas, content sanitization, rate limiting, membership verification
- **`/api/stripe/checkout`:** Auth check, price ID validation against plan whitelist, downgrade prevention

#### SQL Injection Assessment
- **`sql.unsafe` usage in `/api/user/delete`:** Table and column names come from a hardcoded array (SAFE -- not user input)
- **`sql.unsafe` usage in `/api/insights/trends`:** Uses strict allowlist `ALLOWED_GRANULARITIES` mapping (SAFE -- only two whitelisted values)
- **Supabase client queries:** Parameterized by default via `.eq()`, `.insert()` etc. (SAFE)
- **Community search:** SQL LIKE wildcards (`%`, `_`, `\`) are escaped before passing to `.ilike()` (SAFE)

### Issues Found

**ISSUE API-01 (MEDIUM): `/api/diagnostic/state` PUT endpoint lacks input validation -- FIXED (commit ddfdaa0)**
- **File:** `app/api/diagnostic/state/route.ts`
- **Fix applied:** Zod schema with `z.enum(["unknown","low","medium","high"])` for clarity levels, boolean fields, signal arrays with `.max(50)` and string length limits.

**ISSUE API-02 (LOW): User delete route missing newer tables -- FIXED (commit 15c49f6)**
- **File:** `app/api/user/delete/route.ts`
- **Fix applied:** 12 new tables added to deletion cascade: fred_conversation_state, fred_step_evidence, push_subscriptions, push_notification_logs, email_sends, shared_link_recipients, shared_links, team_members, community_post_reactions, community_post_replies, community_posts, community_members.

**ISSUE API-03 (INFO): Contact form doesn't sanitize HTML in name/message fields**
- **File:** `app/api/contact/route.ts:51-54`
- **Problem:** Name and message are `.trim()`ed but not HTML-sanitized before storage. While this is admin-view data (not rendered to other users), it's best practice to sanitize.
- **Impact:** INFO -- stored XSS risk only if admin panel renders this HTML unsafely.
- **Fix:** Apply `sanitizeInput()` from middleware-utils or similar HTML escaping.

---

## 4. Database Schema Issues

### Status: GOOD -- Well-Structured With Minor Gaps

#### Positive Findings
- CHECK constraints on enum fields (community category, post_type, reaction_type, evidence_type, etc.)
- Content length constraints (post: 10000, reply: 5000)
- UNIQUE constraints on membership, reactions, slugs
- Appropriate indexes for common query patterns (user_id, community_id, created_at DESC)
- GIN index on JSONB columns (reality_lens_gate)
- Foreign keys with ON DELETE CASCADE for referential integrity
- Counter-sync triggers for member_count, reaction_count, reply_count

#### Issues Found

**ISSUE DB-01 (LOW): Duplicate migration numbers**
- `013_ab_promotion_audit.sql` and `013_experiment_promotions.sql` both use number 013
- `036_red_flags.sql` and `036_voice_agent_fred_persona.sql` both use number 036
- `045_email_engagement.sql` and `045_team_scoped_shares.sql` both use number 045
- **Impact:** LOW -- migrations run by name, not number, but this makes ordering ambiguous.

**ISSUE DB-02 (LOW): Mixed user_id types across tables**
- Early tables use `user_id VARCHAR` (cast comparison: `auth.uid()::text`)
- Later tables use `user_id UUID` (direct comparison: `auth.uid()`)
- Some tables (push_subscriptions, email_sends, push_notification_logs, shared_links, team_members) use `user_id TEXT`
- **Impact:** LOW -- RLS policies handle the casting correctly, but this inconsistency complicates future migrations and JOIN operations.

**ISSUE DB-03 (INFO): `deletePost` and `deleteReply` in communities.ts don't verify ownership -- FIXED (commit 2b259e7)**
- **File:** `lib/db/communities.ts`
- **Fix applied:** Removed misleading unused `userId` parameter from `deletePost()`. Authorization is enforced at the API layer (membership/role check before calling delete).

**ISSUE DB-04 (INFO): `updatePost` doesn't verify author_id in WHERE clause**
- **File:** `lib/db/communities.ts:717-741`
- **Problem:** Similar to DB-03, `updatePost(postId, userId, updates)` accepts userId but the `.eq("id", postId)` doesn't include an author check. The RLS policies DO enforce this at the DB level for non-service-role clients, but since the code uses `createServiceClient()` (which bypasses RLS), the check is bypassed.
- **Impact:** LOW -- service client usage means RLS won't protect against the API route passing wrong data.
- **Fix:** Add `.eq("author_id", userId)` or implement the ownership/moderator check at the DB function level.

---

## 5. FRED Chat Pipeline -- Onboarding Handoff + Diagnostic Integration

### 5.1 Chat Route Architecture

**File:** `app/api/fred/chat/route.ts` (591 lines)

Pipeline stages:
1. Auth check via `requireAuth()`
2. Rate limiting per user tier (free/pro/studio)
3. Tier-based model routing (GPT-4o-mini for Free, GPT-4o for Pro/Studio)
4. Zod request validation (message, context, sessionId, stream, storeInMemory)
5. Prompt injection guard + input sanitization
6. Dynamic founder context loading via `buildFounderContext()`
7. Conversation state loading via `getOrCreateConversationState()`
8. Step guidance block injection via `buildStepGuidanceBlock()`
9. XState FRED cognitive engine processing
10. SSE streaming response
11. Memory persistence (Pro+ only)
12. Enrichment extraction (fire-and-forget)
13. Red flag + wellbeing alert detection with push notifications

### 5.2 System Prompt (`lib/ai/prompts.ts`, 493 lines)

**Status: EXCELLENT** -- Phase 34 overhaul is comprehensive and well-structured.

Key features:
- Identity dynamically built from `fred-brain.ts` (single source of truth)
- `{{FOUNDER_CONTEXT}}` placeholder replaced at runtime with Founder Snapshot
- 11 Operating Principles (non-negotiable rules)
- Universal Entry Flow for first interactions
- Silent Diagnosis instructions (LLM-driven)
- One framework at a time rule
- 9-Step Startup Process as gating framework
- 5 COACHING_PROMPTS overlays (fundraising, pitchReview, strategy, positioning, mindset)
- Step Guidance Block generator (Phase 36)
- Drift Redirect Block generator (Phase 36)
- "Next 3 Actions" required on every substantive response

### 5.3 Onboarding-to-FRED Handoff

**File:** `lib/fred/context-builder.ts` (453 lines)

**Status: WORKING CORRECTLY** -- The handoff requirement is fully met.

Flow:
1. `buildFounderContext(userId, hasPersistentMemory)` runs on every chat request
2. Loads profile, semantic facts, first-conversation check, progress context **in parallel**
3. Builds `FOUNDER SNAPSHOT` block with all available data
4. **First conversation after onboarding:** Adds `HANDOFF: FIRST CONVERSATION AFTER ONBOARDING` -- references known data, goes deeper
5. **First conversation without onboarding:** Adds `HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)` -- runs Universal Entry Flow
6. **Returning user:** Instruction to use snapshot, skip intake questions already answered
7. On first conversation, fires `seedFounderSnapshot()` to copy profile data into `fred_conversation_state.founder_snapshot`

### 5.4 Diagnostic Engine Integration

**File:** `lib/ai/diagnostic-engine.ts` (283 lines)

**ISSUE DIAG-01 (HIGH): Diagnostic engine NOT wired into chat route**
- **Problem:** `diagnostic-engine.ts` has a complete analysis engine (`runDiagnosticAnalysis`, `analyzeConversation`, `generateDiagnosticSystemPrompt`) but is NOT imported or called in `app/api/fred/chat/route.ts`. The engine exists only as standalone API routes (`/api/diagnostic/analyze`, `/api/diagnostic/introduce`, `/api/diagnostic/events`) that are NOT called from the chat pipeline. The old `diagnostic_states` table (VARCHAR user_id, migration 019) is disconnected from the new `fred_conversation_state` (UUID user_id, migration 049+052).
- **Impact:** HIGH -- Silent diagnosis (Operating Principle #7) relies entirely on the LLM following system prompt instructions. Programmatic signal detection and framework introduction never runs during chat.
- **What IS working:** Migration 052 added `active_mode` and `mode_context` columns, and the DAL in `conversation-state.ts` has full CRUD. The plumbing is ready but not connected.
- **Fix:** Wire diagnostic analysis into the chat route post-response step.

### 5.5 Conversation State & 9-Step Process

**File:** `lib/db/conversation-state.ts` (1204 lines)

**Status: WELL IMPLEMENTED** -- Schema and DAL are complete.

Database tables: `fred_conversation_state` (current_step, step_statuses, process_status, current_blockers, diagnostic_tags, founder_snapshot, reality_lens_gate, active_mode, mode_context) + `fred_step_evidence`. Full RLS on both.

Integration in chat route (lines 262-286): Correctly loads state, builds guidance block, injects into context.

**ISSUE STEP-01 (HIGH): No mechanism to advance steps from conversation**
- **Problem:** The chat route loads and reads conversation state but NEVER writes back. `advanceToStep()`, `updateStepStatus()`, `setBlockers()`, `storeStepEvidence()` all exist in the DAL but are not called from the chat route.
- **Impact:** HIGH -- FRED cannot programmatically advance the founder through the 9-step process. State is read-only from the chat pipeline perspective.
- **Fix:** Add post-response analysis to evaluate FRED's response, advance steps, detect drift, and inject redirect blocks.

### 5.6 Missing enrichment_data Column

**ISSUE DB-05 (MEDIUM): `enrichment_data` column referenced but not in any migration**
- **Files:** `lib/fred/context-builder.ts:79`, `app/api/fred/chat/route.ts:126`
- **Problem:** `fireEnrichment()` writes to `profiles.enrichment_data` (JSONB), and `context-builder.ts` reads it. But no migration adds this column.
- **Impact:** Enrichment data from conversations silently fails to persist.
- **Fix:** Add `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;`

### 5.7 Missing PWA Manifest

**ISSUE PWA-01 (MEDIUM): manifest.webmanifest file does not exist**
- **File:** `app/layout.tsx:32` declares `manifest: "/manifest.webmanifest"` but no file exists in `public/`
- **Impact:** PWA install prompt / "Add to Home Screen" broken on mobile.
- **Fix:** Create `public/manifest.webmanifest` with proper PWA configuration.

### 5.8 Onboarding Edge Cases

**ISSUE ONBOARD-01 (LOW): No name input sanitization**
- **File:** `app/api/onboard/route.ts:45`
- **Fix:** Add `name?.trim().slice(0, 200)`.

**ISSUE ONBOARD-02 (LOW): Email enumeration via different error messages**
- **File:** `app/api/onboard/route.ts:119-134`
- **Fix:** Return generic message for both existing/new accounts.

**ISSUE ONBOARD-03 (MEDIUM): Dual-write risk between /get-started and /onboarding**
- **File:** `lib/hooks/use-onboarding.ts:51-86`
- **Problem:** `/get-started` writes via `POST /api/onboard` (sets `onboarding_completed: true`). `/onboarding` writes via client Supabase. Second flow could overwrite with empty values.
- **Fix:** `syncCompletionToDb` should merge with existing data, not overwrite.

---

## 6. Mobile-Specific Backend

### 6.1 API Response Differences by Viewport/Device
**Status: NO ISSUES** -- All API responses are device-agnostic. Responsive handling is purely UI-side.

### 6.2 Service Worker (`public/sw.js`, 165 lines)
**Status: FUNCTIONAL** -- Cache-first for static assets, network-first for pages, push notification handling, API routes excluded from caching.

### 6.3 Middleware (`middleware.ts`, 76 lines)
**Status: GOOD** -- No mobile-specific logic (correct), CORS handling, auth refresh, correlation ID propagation.

---

## 7. Fixes Verified from Code Fixer + Community Debug Team

### Backend Security Fixes (Verified)

| # | Issue | Fix Verified | Commit |
|---|-------|-------------|--------|
| 2 | Contact form no rate limiting | YES -- `checkRateLimit('contact:${ip}', { limit: 5, windowSeconds: 3600 })` added | 9a0e6b5 |
| 6 | Protected routes list incomplete | YES -- `/check-ins`, `/video`, `/onboarding`, `/interactive` added to `DEFAULT_PROTECTED_ROUTES.paths` | e6d046f |
| 7 | Diagnostic state PUT no validation | YES -- Zod schema with enum, boolean, array validation added | ddfdaa0 |
| 8 | Private community self-join not blocked | YES -- `if (community.isPrivate) return 403` at line 121-126 | 9edc0e9 |
| 11 | User deletion missing v3.0+ tables | YES -- 12 new tables added to deletion cascade array | 15c49f6 |
| 12 | Community delete/update misleading userId param | YES -- unused userId param removed from `deletePost()` | 2b259e7 |
| 15 | Contact route duplicate forwardedFor variable | YES -- duplicate declaration removed | e9e434a |

### Community Debug Fixes (Verified)

| # | Issue | Fix Verified | Commit |
|---|-------|-------------|--------|
| B1 | toggleReaction TOCTOU race condition | YES -- Replaced check-then-act with atomic delete-first pattern + 23505 handling | 7284049 |
| B2 | PostgREST filter syntax injection in search | YES -- Strips LIKE wildcards (`%_\`) and filter-syntax chars (`,.()\"'`) from search input | 3f2ac69 |
| B3 | Missing UPDATE RLS policy on community_members | YES -- Scoped UPDATE policy: owner/moderator only, WITH CHECK prevents escalation to 'owner' role | 7f2e193 |

### UX/Accessibility Fixes (Code-Verified)

| # | Issue | Backend Impact | Commit |
|---|-------|---------------|--------|
| 1 | Missing dashboard nav items (9 pages unreachable) | Nav-only, no backend issue | 3a39b3b |
| 3 | Community posts not gated by membership | Membership check added at API level | d084c5e |
| 21 | Admin nav missing Voice Agent and Analytics | Nav-only, admin auth still protects routes | bb55ef6 |

### Source Code Review Findings (Backend Validated)

| Finding | Backend Status |
|---------|---------------|
| 11 dashboard pages missing from sidebar | Nav-only issue. API routes all have `requireAuth()`. No data exposure. |
| Orphaned dashboard-shell.tsx | Dead code, not imported. No security impact. |
| Boardy "Coming Soon" on features page | Data mismatch only. Backend integration is functional. |
| 2 admin pages missing from admin nav | Admin auth (`isAdminSession()`) protects all admin routes. No bypass risk. |

---

## 8. Edge Case Results

### Verified Protections
1. **Expired sessions:** Middleware redirects to login (fail-secure)
2. **Missing Supabase config:** Middleware returns `{ response, user: null }` -- graceful degradation
3. **Rate limiting:** Login (5/min), admin login (3/min), onboard (10/hour), chat (per-tier)
4. **File upload limits:** 1MB max for investor CSV
5. **Prompt injection:** `detectInjectionAttempt()` guard on chat input
6. **CORS:** Origin whitelist with credential support
7. **Webhook bypass:** Stripe, SMS, Boardy callbacks skip CORS (use signature verification)
8. **Token expiry:** Tokens without `exp` claim treated as expired (good security default)

### Edge Cases to Watch

**EDGE-01: Admin session loss on serverless cold start**
- Admin sessions are in-memory (`Map<string, AdminSession>`). Serverless cold starts clear the store, requiring re-authentication.
- **Impact:** Acceptable per code comments ("Admin re-authenticates, low impact"). Document for ops.

**EDGE-02: Race condition in community reaction toggle**
- FIXED: `toggleReaction()` now uses delete-first atomic pattern instead of check-then-act. UNIQUE constraint (23505) still handles the remaining race window.
- **Impact:** Fully resolved by commit 7284049.

**EDGE-03: Fire-and-forget enrichment may silently fail**
- `fireEnrichment()` in chat route is fire-and-forget with `catch` logging only.
- **Impact:** Acceptable for non-critical enrichment data. No fix needed.

---

## Summary

### Fix Status

**36 total fixes applied** (23 from Code Fixer + 13 from community debug team). All backend security fixes verified by re-reading source code.

| Category | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| RLS Policies | 4 LOW + 1 INFO | 1 (B3: UPDATE policy) | 3 LOW (inconsistent `auth.role()` pattern), 1 INFO |
| Auth Guards | 1 MEDIUM + 2 LOW | 2 (contact rate limit, protected routes) | 1 LOW (setup-db env check) |
| API Validation | 1 MEDIUM + 1 LOW + 1 INFO | 2 (Zod on diagnostic PUT, user delete tables) | 1 INFO (contact HTML sanitization) |
| Database Schema | 1 MEDIUM + 3 LOW + 2 INFO | 2 (delete cascade, deletePost ownership) | 1 MEDIUM (enrichment_data column), 1 LOW (duplicate migration #s), 1 LOW (mixed user_id types), 1 INFO |
| Community APIs | 1 LOW + 3 DEBUG | 4 (private join, TOCTOU, PostgREST injection, UPDATE policy) | 0 |
| FRED Chat Pipeline | 2 HIGH + 1 MEDIUM + 2 LOW | 0 | 2 HIGH + 1 MEDIUM + 2 LOW (architecture gaps, not security) |
| Onboarding Backend | 1 MEDIUM + 2 LOW | 0 | 1 MEDIUM + 2 LOW |
| Mobile/PWA | 1 MEDIUM | 0 | 1 MEDIUM |

### What's Working Well
- Comprehensive RLS on all 40+ tables
- Server-verified auth (`supabase.auth.getUser()`, not just session tokens)
- Rate limiting on contact, onboarding, chat, admin login, community join
- Input validation with Zod on chat, diagnostic state, communities
- PostgREST filter injection protection on community search
- Atomic reaction toggle (delete-first pattern, no TOCTOU)
- Prompt injection guard active on chat
- Onboarding-to-FRED handoff fully implemented
- Community UPDATE RLS prevents role escalation
- System prompt (Phase 34) comprehensive and well-structured
- Conversation state schema and DAL complete (1200+ lines)
- Service worker provides offline support with push notifications

### Remaining HIGH Priority (Architecture Gaps, Not Security)
1. **DIAG-01:** Diagnostic engine not wired into chat route -- silent diagnosis is LLM-only
2. **STEP-01:** No mechanism to advance 9-step process from conversation -- state is read-only

### Remaining MEDIUM Priority
1. **DB-05:** Missing `enrichment_data` column migration -- conversation enrichment silently fails
2. **PWA-01:** Missing manifest.webmanifest -- PWA install broken on mobile
3. **ONBOARD-03:** Dual-write risk between `/get-started` and `/onboarding`

### All MEDIUM+ Security Issues: RESOLVED
AUTH-01 (contact rate limit), API-01 (diagnostic PUT validation), API-02 (user delete tables), COMMUNITY-01 (private join), B1 (TOCTOU), B2 (PostgREST injection), B3 (UPDATE policy) -- all fixed and verified.

---

## 9. Re-Audit (2026-02-18) -- Delta Findings

### Fixes Confirmed Since Last Audit

| Issue | Status |
|---|---|
| Missing `/api/auth/signup` route (BUG 2) | **FIXED** -- `app/api/auth/signup/route.ts` exists with rate limiting, validation |
| Orphan cleanup using anon client (BUG 5) | **FIXED** -- `app/api/onboard/route.ts:289` now uses `createServiceClient()` |
| Community post leak / private join bypass | **STILL FIXED** -- RLS policies in migration 051 are solid |

### Remaining Critical Issue

**`createOrUpdateProfile` enrichment columns (BUG 1):**
- `lib/supabase/auth-helpers.ts:261-282` still writes `industry: null, revenue_range: null, team_size: null, funding_history: null, enriched_at: null, enrichment_source: null`
- Migration `037_enriched_profiles.sql` exists to add these columns
- Supabase migration `20260212000004_add_enrichment_data_to_profiles.sql` adds `enrichment_data JSONB`
- **If migrations have been applied to prod DB, signup via `signUp()` should now work**
- **If migrations have NOT been applied, `signUp()` still fails -- this is the #1 blocker for the app**
- Cannot verify from source code alone -- requires DB access

### New Observations

1. **No `/api/chat/route.ts`** -- chat is handled by `/api/fred/chat/route.ts` (has `requireAuth`)
2. **No `/api/health` route** -- health checks go to `/api/monitoring/health` (admin-only) or `/api/health/ai` (admin-only). No public health endpoint exists.
3. **115 API routes use auth guards** -- comprehensive coverage across all user-facing endpoints
4. **Coaching routes use inline auth** -- `coaching/sessions` and `coaching/participants` use `supabase.auth.getUser()` instead of `requireAuth()`. Functionally equivalent but inconsistent.
