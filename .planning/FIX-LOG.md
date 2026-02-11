# Community Backend Fix Log

**Date:** 2026-02-11
**Developer:** backend-dev
**Source:** DEBUG-REPORT.md (API + DB investigation)

---

## Pre-existing Fixes (already resolved before this session)

These issues from the debug report were already fixed in the current codebase:

| ID | Issue | Status |
|----|-------|--------|
| NEW-01 | Community detail GET leaked posts to non-members | **Already fixed** -- `app/api/communities/[slug]/route.ts:67-70` gates `getPosts()` behind membership check |
| NEW-02 / DB-16 | `deletePost()` and `deleteReply()` accepted unused `userId` param | **Already fixed** -- parameter removed from both functions |
| NEW-03 | `updatePost()` accepted unused `userId` param | **Already fixed** -- parameter removed, function signature is now honest |

---

## Fixes Applied This Session

### Fix 1: API-W06 / DB-08 -- toggleReaction Race Condition (MEDIUM)

**File:** `lib/db/communities.ts` (toggleReaction function)

**Problem:** Classic TOCTOU race condition. The function performed a SELECT to check for an existing reaction, then a separate DELETE or INSERT. Between these two non-transactional steps, another concurrent request could execute, leading to inconsistent return values and potential UI state divergence.

**Fix:** Replaced the check-then-act pattern with an atomic delete-first approach:
1. Attempt to DELETE the reaction with a `.select("id")` to see if anything was removed
2. If rows were deleted, return `{ added: false }`
3. If nothing was deleted, INSERT a new reaction
4. UNIQUE constraint violation (23505) still handled as a safety net for any remaining race edge case

This eliminates the race window between the check and the action. The DELETE+INSERT pattern is safe because both operations target the same `(post_id, user_id, reaction_type)` tuple protected by the UNIQUE constraint.

---

### Fix 2: DB-13 -- PostgREST Filter Syntax Injection in Search (MEDIUM)

**File:** `app/api/communities/route.ts` (GET handler, search param sanitization)

**Problem:** The search input was escaped for SQL LIKE wildcards (`%`, `_`, `\`) but NOT for PostgREST filter-syntax characters. Since the search string is interpolated into a `.or()` filter string (`name.ilike.%${search}%,description.ilike.%${search}%`), special characters like commas, periods, and parentheses could inject additional filter conditions or break the filter syntax.

**Fix:** Added `.replace(/[,.()"']/g, "")` after the LIKE wildcard escaping to strip all PostgREST-special characters. This prevents filter injection while preserving normal alphanumeric search functionality.

---

### Fix 3: DB-01 -- Missing UPDATE Policy on community_members (MEDIUM)

**File:** `lib/db/migrations/053_community_member_update_policy.sql` (NEW)

**Problem:** The `community_members` table had SELECT, INSERT, DELETE, and service_role ALL policies, but no user-scoped UPDATE policy. While current code uses `createServiceClient()` (bypassing RLS), this violates defense-in-depth -- any future code using a user-scoped client would silently fail to update member roles.

**Fix:** Created migration 053 with an UPDATE policy that:
- USING clause: Allows updates only by users who are owner or moderator of the same community
- WITH CHECK clause: Restricts the target role to 'moderator' or 'member' only -- prevents escalation to 'owner' role
- Wrapped in `DO $$ ... EXCEPTION WHEN duplicate_object` for idempotency

---

## Not Fixed (out of scope or already resolved)

| ID | Severity | Reason |
|----|----------|--------|
| DB-03 | Low | Posts UPDATE policy missing WITH CHECK -- low severity, deferred |
| DB-04 | High (arch) | Service role bypass is architectural -- requires larger refactor |
| DB-07 | Low | Trigger functions lack schema qualification -- low severity, deferred |
| DB-09, DB-10 | -- | Already fixed in migration 051 |
| DB-11, DB-12 | Low | Missing length constraints -- low severity, deferred |
| DB-14, DB-15 | Low | createCommunity non-atomic insert -- low severity, deferred |
