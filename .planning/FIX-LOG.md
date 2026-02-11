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

---
---

# Community Frontend Fix Log

**Date:** 2026-02-11
**Developer:** frontend-dev
**Source:** DEBUG-REPORT.md (Frontend Runtime Investigation, bugs F01-F10)

---

## Fixes Applied This Session

### Fix F01 + F05: handleReact corruption + optimistic UI (CRITICAL + HIGH)

**File:** `app/dashboard/communities/[slug]/page.tsx` (handleReact function)

**Problem (F01):** `json.data?.added` could be `undefined` on malformed API response. The ternary `added ? +1 : -1` treated `undefined` as falsy, incorrectly decrementing reactionCount. `userHasReacted` became `undefined` (not `false`), permanently desynchronizing state.

**Problem (F05):** Reaction toggle waited for full API round-trip before updating UI, causing perceptible 200-500ms delay.

**Fix:** Implemented optimistic UI with rollback:
- Toggle `userHasReacted` and `reactionCount` immediately before the API call
- Guard against `undefined` response: `if (added === undefined) return;`
- Reconcile with server truth if it disagrees with optimistic state
- Rollback on API error or network failure

---

### Fix F02: fetchMembers stale closure (CRITICAL)

**File:** `app/dashboard/communities/[slug]/page.tsx`

**Problem:** `fetchMembers` was a plain function (not memoized) missing from the useEffect dependency array. It captured a stale `community`/`slug` closure.

**Fix:** Wrapped `fetchMembers` in `useCallback` with `[community, slug]` deps and added it to the useEffect dependency array.

---

### Fix F09: postPage not reset on re-fetch (HIGH)

**File:** `app/dashboard/communities/[slug]/page.tsx`

**Problem:** When the useEffect called `fetchPosts(0)`, `postPage` was never reset to 0. The next "Load more" click would set `postPage` to `oldPage + 1` instead of `1`, skipping pages.

**Fix:** Added `setPostPage(0)` alongside `fetchPosts(0)` in the useEffect. (Implemented together with F02.)

---

### Fix F03: Leave button missing confirmation dialog (CRITICAL)

**Files:** `app/dashboard/communities/[slug]/page.tsx` and `app/dashboard/communities/page.tsx`

**Problem:** Both `handleLeave` functions (detail page and browse page) had no confirmation step. One accidental tap immediately sent a DELETE request.

**Fix:** Added `if (!window.confirm("Leave this community?")) return;` at the top of both `handleLeave` functions.

---

### Fix F04: ReplyThread not refreshing after submission (CRITICAL)

**File:** `components/communities/ReplyThread.tsx`

**Problem:** After calling `onReply`, the component cleared the text input but never re-fetched replies or appended the new reply. The reply was invisible until the thread was closed and reopened.

**Fix:** Extracted `fetchReplies()` from the useEffect into a standalone async function. After successful `onReply`, call `await fetchReplies()` to refresh the reply list.

---

### Fix F06: Post creation success toast on falsy data (HIGH)

**File:** `app/dashboard/communities/[slug]/page.tsx`

**Problem:** If the API returned 200 with `{ success: true, data: null }`, the success toast fired but the post never appeared. The form was already cleared.

**Fix:** Moved `toast.success("Post created!")` inside the `if (json.data)` branch. Added `toast.error("Failed to create post")` for the falsy-data case.

---

### Fix F07: Dead communityId prop on CreatePostForm (HIGH)

**File:** `components/communities/CreatePostForm.tsx` and `app/dashboard/communities/[slug]/page.tsx`

**Problem:** `communityId` prop was declared in the interface, destructured, but never used in either `CreatePostForm` or `CreatePostFormDesktop`.

**Fix:** Removed `communityId` from `CreatePostFormProps` interface, from the function destructuring, and from both call sites in the detail page.

---

### Fix F08: Browse page join/leave errors silently swallowed (HIGH)

**File:** `app/dashboard/communities/page.tsx`

**Problem:** If `handleJoin` or `handleLeave` API calls returned non-200 or threw, the user saw no feedback. The button just stopped spinning.

**Fix:** Added `else { toast.error(...) }` branches and `catch { toast.error(...) }` blocks to both handlers. Added `import { toast } from "sonner"`.

---

### Fix F10: Single joiningSlug race condition (HIGH)

**File:** `app/dashboard/communities/page.tsx`

**Problem:** `joiningSlug` was a single string. Rapid clicks on multiple community join buttons would overwrite each other, causing premature re-enable of buttons while requests were still in-flight.

**Fix:** Replaced `useState<string | null>(null)` with `useState<Set<string>>(new Set())`. Updated `handleJoin` and `handleLeave` to add/remove from the set. Updated `isJoining` prop to use `joiningSlugs.has(community.slug)`.
