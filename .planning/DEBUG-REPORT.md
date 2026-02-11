# API Security Investigation -- Founder Communities

**Investigator:** api-investigator
**Date:** 2026-02-11
**Scope:** All 8 API route files under `app/api/communities/` + data access layer `lib/db/communities.ts`

---

## Executive Summary

The production audit (41-PRODUCTION-AUDIT.md) flagged warnings API-W01 through API-W06. After reading every line of all 8 route files and the data access layer, I can confirm that **API-W01, API-W02, and API-W03 have been FIXED** -- all GET endpoints now include membership checks. However, I found **3 new security issues** that were NOT in the original audit, plus confirmed API-W06 (race condition) still exists.

### Verdict: 3 New Findings + 1 Confirmed Open Issue

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| NEW-01 | **HIGH** | Community detail GET leaks 5 recent posts to non-members | OPEN |
| NEW-02 | **MEDIUM** | `deletePost()` and `deleteReply()` accept `userId` param but IGNORE it | OPEN |
| NEW-03 | **LOW** | `updatePost()` in data layer does not scope by `author_id` | OPEN |
| API-W06 | **MEDIUM** | `toggleReaction` race condition with partial mitigation | CONFIRMED OPEN |
| API-W01 | Fixed | GET posts now checks membership | RESOLVED |
| API-W02 | Fixed | GET replies now checks membership | RESOLVED |
| API-W03 | Fixed | GET members now checks membership | RESOLVED |

---

## Finding 1: API-W01 (GET Posts) -- RESOLVED

**File:** `app/api/communities/[slug]/posts/route.ts:38-91`

The GET handler now correctly checks membership:

```typescript
// Line 46: Auth check
const userId = await requireAuth();

// Line 58-64: Membership check
const membership = await getMembership(community.id, userId);
if (!membership) {
  return NextResponse.json(
    { success: false, error: "You must be a member to view posts" },
    { status: 403 }
  );
}
```

**Verdict:** FIXED. Non-members receive a 403 response.

---

## Finding 2: API-W02 (GET Replies) -- RESOLVED

**File:** `app/api/communities/[slug]/posts/[postId]/replies/route.ts:36-97`

The GET handler now correctly checks membership:

```typescript
// Line 44: Auth check
const userId = await requireAuth();

// Line 56-62: Membership check
const membership = await getMembership(community.id, userId);
if (!membership) {
  return NextResponse.json(
    { success: false, error: "You must be a member to view replies" },
    { status: 403 }
  );
}
```

**Verdict:** FIXED. Non-members receive a 403 response.

---

## Finding 3: API-W03 (GET Members) -- RESOLVED

**File:** `app/api/communities/[slug]/members/route.ts:28-81`

The GET handler now correctly checks membership:

```typescript
// Line 36: Auth check
const userId = await requireAuth();

// Lines 55-61: Membership check
const viewerMembership = await getMembership(community.id, userId);
if (!viewerMembership) {
  return NextResponse.json(
    { success: false, error: "You must be a member to view the member list" },
    { status: 403 }
  );
}
```

**Verdict:** FIXED. Non-members receive a 403 response.

---

## Finding 4: NEW-01 -- Community Detail GET Leaks Posts to Non-Members (HIGH)

**File:** `app/api/communities/[slug]/route.ts:38-89`

**The problem:** The community detail endpoint returns 5 recent posts to ANY authenticated user, regardless of membership. While the dedicated posts endpoint (`/api/communities/[slug]/posts`) now correctly gates on membership, the detail endpoint bypasses this by including posts inline.

**Exact code path:**

```typescript
// Line 46: Auth check -- only requires authentication, not membership
const userId = await requireAuth();

// Line 56: Gets community by slug
const community = await getCommunityBySlug(slug);

// Line 65: Gets membership (used only for UI display, NOT for gating)
const membership = await getMembership(community.id, userId);

// Line 68: FETCHES POSTS UNCONDITIONALLY -- no membership check before this
const { posts: recentPosts } = await getPosts(community.id, { limit: 5 });

// Line 70-79: Returns EVERYTHING to the caller
return NextResponse.json({
  success: true,
  data: {
    community,           // Community metadata (name, description, etc.)
    membership: ...,     // User's membership status (null if not member)
    recentPosts,         // *** 5 MOST RECENT POSTS LEAKED ***
  },
});
```

**What leaks:** For any community whose slug is known:
- Post titles, full content (up to 5000 chars), author IDs, timestamps
- Reaction counts, reply counts, pinned status
- Post types (post/question/update)

**Attack vector:** Any authenticated user can call `GET /api/communities/{slug}` to read the 5 most recent posts of ANY community, including private communities (`is_private: true`), without being a member. Since the `listCommunities()` function filters out private communities, this is the only way to access private community posts -- but it works.

**Severity:** HIGH -- This undermines the membership checks added to the dedicated posts endpoint.

**Recommended fix:** Add a membership gate before fetching posts:

```typescript
const membership = await getMembership(community.id, userId);
// Only fetch posts if user is a member
const recentPosts = membership
  ? (await getPosts(community.id, { limit: 5 })).posts
  : [];
```

---

## Finding 5: NEW-02 -- `deletePost()` and `deleteReply()` Accept `userId` but Ignore It (MEDIUM)

**File:** `lib/db/communities.ts:746-760` and `lib/db/communities.ts:934-948`

**The problem:** Both functions accept a `userId` parameter that suggests author-scoped deletion, but the actual query deletes by ID alone. The `userId` parameter creates a false sense of security -- callers might believe the data layer enforces ownership, but it does not.

**`deletePost()` at line 746:**

```typescript
export async function deletePost(
  postId: string,
  userId: string     // <-- ACCEPTED but NEVER USED in the query
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);  // <-- Only filters by postId, NOT by userId/author_id
}
```

**`deleteReply()` at line 934:**

```typescript
export async function deleteReply(
  replyId: string,
  userId: string     // <-- ACCEPTED but NEVER USED in the query
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("community_post_replies")
    .delete()
    .eq("id", replyId);  // <-- Only filters by replyId, NOT by userId/author_id
}
```

**Current mitigation:** The API route handlers DO check authorization before calling these functions:
- `app/api/communities/[slug]/posts/[postId]/route.ts:196-234` checks `isAuthor || isModerator` before calling `deletePost()`
- `app/api/communities/[slug]/posts/[postId]/replies/[replyId]/route.ts:167-232` checks `isAuthor || isModerator` before calling `deleteReply()`

**Why it matters:** The data layer uses `createServiceClient()` which bypasses ALL RLS policies. If any future code path calls `deletePost(someId, anyUserId)`, it will succeed regardless of who `userId` is. The unused parameter creates a dangerous illusion of defense-in-depth.

**Severity:** MEDIUM -- Currently safe because API routes check authorization, but the misleading API signature is a latent risk.

**Recommended fix:** Either:
1. Add `.eq("author_id", userId)` to the query (but this would break moderator deletion), OR
2. Remove the `userId` parameter entirely to make the function signature honest, and document that callers are responsible for authorization

---

## Finding 6: NEW-03 -- `updatePost()` Does Not Scope by Author (LOW)

**File:** `lib/db/communities.ts:717-741`

**The problem:** Similar to the delete functions, `updatePost()` accepts `userId` but does NOT use it to scope the UPDATE query:

```typescript
export async function updatePost(
  postId: string,
  userId: string,     // <-- Not used in the query
  updates: Partial<Pick<CommunityPost, "title" | "content" | "isPinned">>
): Promise<CommunityPost> {
  const supabase = createServiceClient();
  // ...
  const { data, error } = await supabase
    .from("community_posts")
    .update(payload)
    .eq("id", postId)   // <-- Only postId, no author_id filter
    .select()
    .single();
}
```

**Current mitigation:** The PATCH route handler at `app/api/communities/[slug]/posts/[postId]/route.ts:101-190` correctly checks `isAuthor || isModerator` before calling `updatePost()`. The call at line 178 passes `post.authorId` as the userId, but the data layer ignores it.

**Severity:** LOW -- Same latent risk pattern as NEW-02, but lower impact since update is less destructive than delete.

---

## Finding 7: API-W06 -- `toggleReaction` Race Condition (MEDIUM, CONFIRMED OPEN)

**File:** `lib/db/communities.ts:771-814`

**The problem:** Classic check-then-act (TOCTOU) race condition. The function performs two separate queries with no transaction wrapping:

```typescript
export async function toggleReaction(...): Promise<{ added: boolean }> {
  const supabase = createServiceClient();

  // STEP 1: Check if reaction exists
  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .single();

  // *** RACE WINDOW: Between Step 1 and Step 2, another request can execute ***

  if (existing) {
    // STEP 2a: Delete existing reaction
    await supabase
      .from("community_post_reactions")
      .delete()
      .eq("id", existing.id);
    return { added: false };
  }

  // STEP 2b: Insert new reaction
  const { error } = await supabase.from("community_post_reactions").insert({
    post_id: postId,
    user_id: userId,
    reaction_type: reactionType,
  });

  // STEP 3: Handle duplicate insert (UNIQUE constraint violation)
  if (error) {
    if (error.code === "23505") {
      return { added: true };  // <-- Silently treats as success
    }
    throw new Error(`Failed to toggle reaction: ${error.message}`);
  }
  return { added: true };
}
```

**Race scenarios:**

**Scenario A: Double-add (two concurrent "add" requests)**
1. Request A: Step 1 finds no existing reaction
2. Request B: Step 1 finds no existing reaction
3. Request A: Step 2b inserts reaction -- SUCCESS
4. Request B: Step 2b tries to insert -- UNIQUE violation caught (code 23505), returns `{ added: true }`
5. **Result:** One reaction in DB, both requests return `{ added: true }`. **Correct behavior.** The UNIQUE constraint saves us here.

**Scenario B: Double-toggle (two concurrent "toggle" requests, reaction exists)**
1. Request A: Step 1 finds existing reaction with ID "abc"
2. Request B: Step 1 finds existing reaction with ID "abc"
3. Request A: Step 2a deletes reaction "abc" -- SUCCESS, returns `{ added: false }`
4. Request B: Step 2a tries to delete reaction "abc" -- **Already deleted, but Supabase DELETE does not error on "not found" (it returns 0 rows affected without error)**
5. Request B returns `{ added: false }`
6. **Result:** Reaction deleted, but the `reaction_count` trigger fires only once. Both requests report removal. **Functionally correct but misleading UI response.**

**Scenario C: Add-then-toggle overlap**
1. Request A (add): Step 1 finds no existing reaction
2. Request B (toggle): Step 1 finds no existing reaction
3. Request A: Step 2b inserts reaction -- SUCCESS, returns `{ added: true }`
4. Request B: Step 2b tries to insert -- UNIQUE violation (23505), returns `{ added: true }`
5. **Result:** User thinks they reacted, but wanted to toggle (unreact). **Minor UX inconsistency.**

**Severity:** MEDIUM -- The UNIQUE constraint prevents data corruption (no duplicate reactions). The main risk is incorrect return values causing UI state to diverge from DB state. The user would need to refresh to see the correct state.

**Current mitigation (partial):** The UNIQUE constraint catch at line 807 prevents duplicate inserts. But there is no catch for the "delete already-deleted" scenario.

**Recommended fix:** Use a single upsert/conflict approach, or wrap in a Postgres function:

```sql
-- Atomic toggle in a single statement
INSERT INTO community_post_reactions (post_id, user_id, reaction_type)
VALUES ($1, $2, $3)
ON CONFLICT (post_id, user_id, reaction_type)
DO DELETE
RETURNING id;
-- If a row was returned, it was inserted. If nothing returned, it was deleted.
```

Alternatively, use Supabase RPC to call a Postgres function that handles the toggle atomically.

---

## Additional Observations

### RLS Provides No Safety Net

As noted in the production audit debate (lines 157-161), ALL data access functions in `lib/db/communities.ts` use `createServiceClient()` (line 10), which connects with the Postgres `service_role` key. This bypasses ALL Row Level Security policies.

The entire authorization model depends on the API route handlers performing correct checks. There is zero defense-in-depth from the database layer. If a route handler has a bug (like NEW-01 above), data leaks freely.

**Affected functions and their RLS bypass:**
- `getCommunity()` (line 277) -- service client
- `listCommunities()` (line 321) -- service client
- `getCommunityMembers()` (line 459) -- service client
- `listPosts()` / `getPosts()` (line 674, 1000) -- service client
- `listReplies()` / `getReplies()` (line 880, 1040) -- service client
- `getPostReactions()` (line 819) -- service client
- `toggleReaction()` (line 771) -- service client

### `createServiceClient()` Used Directly in Route File

**File:** `app/api/communities/[slug]/posts/[postId]/replies/[replyId]/route.ts:18,34`

This route file imports `createServiceClient` directly and uses it in a local `getReply()` helper function (lines 33-53). This is inconsistent with the pattern of using the data layer (`lib/db/communities.ts`) for all DB access. It means security-relevant DB queries exist in two locations, making auditing harder.

### Search Wildcard Injection (API-W05) -- Already Fixed

**File:** `app/api/communities/route.ts:131-135`

The GET communities handler now escapes SQL LIKE wildcards:

```typescript
const search = rawSearch
  ? rawSearch.replace(/[%_\\]/g, (c) => `\\${c}`)
  : undefined;
```

This was flagged as API-W05 in the audit. It appears to be resolved.

---

## Summary of Required Actions

| Priority | Finding | File | Action |
|----------|---------|------|--------|
| **P1** | NEW-01: Detail endpoint leaks posts | `app/api/communities/[slug]/route.ts:68` | Gate `getPosts()` call behind membership check |
| **P2** | API-W06: Race condition | `lib/db/communities.ts:771-814` | Replace check-then-act with atomic DB operation |
| **P2** | NEW-02: Misleading `userId` param | `lib/db/communities.ts:746,934` | Either use the param or remove it |
| **P3** | NEW-03: Same pattern in updatePost | `lib/db/communities.ts:717` | Same as NEW-02 |

---
---

## Database Integrity Investigation

**Investigator:** db-investigator
**Date:** 2026-02-11
**Files analyzed:**
- `lib/db/migrations/051_founder_communities.sql` (555 lines)
- `lib/db/communities.ts` (1071 lines)
- `lib/supabase/server.ts` (48 lines)
- `app/api/communities/route.ts` (193 lines)
- `app/api/communities/[slug]/members/route.ts` (235 lines)
- `app/api/communities/[slug]/posts/route.ts` (178 lines)
- `app/api/communities/[slug]/posts/[postId]/route.ts` (252 lines)
- `app/api/communities/[slug]/posts/[postId]/reactions/route.ts` (181 lines)

---

### 1. RLS Policy Map (Complete Inventory)

#### Table: `communities` (migration line 207)
| Policy Name | Operation | Scoping | Status |
|---|---|---|---|
| "Authenticated users can read communities" | SELECT | `auth.uid() IS NOT NULL AND is_archived = false AND (is_private = false OR member check)` | OK |
| "Authenticated users can create communities" | INSERT | `auth.uid() = creator_id` | OK |
| "Owner can update community" | UPDATE | `auth.uid() = creator_id` | OK |
| "Owner can delete community" | DELETE | `auth.uid() = creator_id` | OK |
| "Service role manages communities" | ALL | `auth.jwt() ->> 'role' = 'service_role'` | See finding DB-04 |

#### Table: `community_members` (migration line 259)
| Policy Name | Operation | Scoping | Status |
|---|---|---|---|
| "Members can read community member lists" | SELECT | Member of same community | OK |
| "Users can join communities" | INSERT | `auth.uid() = user_id AND community is public` | OK |
| "Users can leave or be removed by moderators" | DELETE | Self or owner/moderator | OK |
| "Service role manages community members" | ALL | service_role | See finding DB-04 |
| **MISSING** | **UPDATE** | N/A | **GAP (SCHEMA-W02)** |

#### Table: `community_posts` (migration line 320)
| Policy Name | Operation | Scoping | Status |
|---|---|---|---|
| "Community members can read posts" | SELECT | Member check via `community_members` | OK |
| "Community members can create posts" | INSERT | `auth.uid() = author_id` + member check | OK |
| "Authors and moderators can update posts" | UPDATE | Author or owner/moderator | OK - but see DB-03 |
| "Authors and moderators can delete posts" | DELETE | Author or owner/moderator | OK |
| "Service role manages community posts" | ALL | service_role | See finding DB-04 |

#### Table: `community_post_reactions` (migration line 391)
| Policy Name | Operation | Scoping | Status |
|---|---|---|---|
| "Community members can read reactions" | SELECT | JOIN through `community_posts` to `community_members` | **FIXED** (was SCHEMA-W01) |
| "Members can add reactions" | INSERT | `auth.uid() = user_id` + member-via-post check | OK |
| "Users can remove own reactions" | DELETE | `auth.uid() = user_id` | OK |
| "Service role manages community post reactions" | ALL | service_role | See finding DB-04 |

#### Table: `community_post_replies` (migration line 440)
| Policy Name | Operation | Scoping | Status |
|---|---|---|---|
| "Community members can read replies" | SELECT | Member check via post->community | OK |
| "Community members can create replies" | INSERT | `auth.uid() = author_id` + member check | OK |
| "Authors can update own replies" | UPDATE | `auth.uid() = author_id` | OK |
| "Authors and moderators can delete replies" | DELETE | Author or owner/moderator | OK |
| "Service role manages community post replies" | ALL | service_role | See finding DB-04 |

---

### 2. RLS Gap Findings

#### Finding DB-01: Missing UPDATE Policy on `community_members` (SCHEMA-W02) -- CONFIRMED

**Location:** Migration lines 258-317 (community_members RLS section)
**Severity:** Medium
**Current state:** There is no UPDATE policy defined for `community_members`. The table has SELECT, INSERT, DELETE, and service_role ALL policies, but no user-scoped UPDATE.

**Impact:** The `updateMemberRole()` function in `communities.ts:576-592` uses `createServiceClient()` which bypasses RLS, so this works today. However:
- If any future code path uses an anon/user client to update a member role, it will be silently blocked by RLS
- The defense-in-depth principle says there should be a policy even if current code bypasses it

**Recommended fix:**
```sql
CREATE POLICY "Owner can update member roles"
  ON community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members owner_check
      WHERE owner_check.community_id = community_members.community_id
        AND owner_check.user_id = auth.uid()
        AND owner_check.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    -- Prevent escalating to owner role (only original creator should be owner)
    role IN ('moderator', 'member')
  );
```

#### Finding DB-02: Reaction SELECT Was Too Permissive (SCHEMA-W01) -- NOW FIXED

**Location:** Migration lines 394-406
**Status:** The current migration has the reaction SELECT policy properly scoped via a JOIN:
```sql
USING (
  EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN community_members cm ON cm.community_id = cp.community_id
    WHERE cp.id = community_post_reactions.post_id
      AND cm.user_id = auth.uid()
  )
);
```
This correctly scopes visibility to community members only. SCHEMA-W01 has been fixed.

#### Finding DB-03: Posts UPDATE Policy Missing WITH CHECK Clause

**Location:** Migration lines 352-365
**Severity:** Low
**Current state:** The "Authors and moderators can update posts" policy has a `USING` clause but no `WITH CHECK` clause:
```sql
USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM community_members cm ...)
)
```
Without a `WITH CHECK`, a moderator could theoretically change the `author_id` column during an update (reassigning authorship), or change the `community_id` to move a post to a different community. In practice, the service_role bypass makes this less exploitable via the normal API path, but it violates defense-in-depth.

**Recommended fix:** Add a WITH CHECK clause that prevents changing `author_id` and `community_id`.

---

### 3. Service Role Bypass Analysis (Critical Architectural Finding)

#### Finding DB-04: All Data Access Uses `createServiceClient()` -- RLS Is Effectively Decorative

**Location:** `lib/db/communities.ts` -- every function (29 usages of `createServiceClient()`)
**Location:** `lib/supabase/server.ts:41-46` confirms the service client uses `SUPABASE_SERVICE_ROLE_KEY`
**Severity:** High (architectural concern)

**Analysis:** Every single function in `communities.ts` calls `createServiceClient()`, which creates a Supabase client with the service role key. The service role key **bypasses all RLS policies entirely**. This means:

1. All 20+ RLS policies defined in the migration are **never evaluated** during normal application operation
2. Authorization is enforced **only at the API route layer** (e.g., `getMembership()` checks in route handlers)
3. If any route handler has a missing or incorrect auth check, the service client will happily execute the query with no DB-level guardrails

**Current route-layer mitigation:** The API route handlers do perform auth checks:
- `app/api/communities/[slug]/members/route.ts:55-61` -- checks membership before listing
- `app/api/communities/[slug]/posts/route.ts:58-64` -- checks membership before listing posts
- `app/api/communities/[slug]/posts/[postId]/route.ts:129-139` -- checks author/moderator for updates
- `app/api/communities/[slug]/posts/[postId]/reactions/route.ts:68-74` -- checks membership before reacting

**Corroborating evidence from API investigator (NEW-01):** The api-investigator found that `app/api/communities/[slug]/route.ts` leaks 5 recent posts to non-members precisely because the service_role client has no RLS guardrail. This is exactly the class of bug that defense-in-depth RLS would catch.

**Specific risk in data layer:** The `deletePost()` function (`communities.ts:746-760`) does NOT filter by `author_id`:
```typescript
const { error } = await supabase
  .from("community_posts")
  .delete()
  .eq("id", postId);
```
Same for `deleteReply()` (`communities.ts:934-948`). These are service_role calls with no scoping -- any caller can delete any entity.

**Recommendation:** Either (a) switch read-only operations to user-scoped Supabase client where possible so RLS provides actual protection, or (b) add explicit userId/community_id checks in the DB functions themselves as a second layer.

---

### 4. Trigger Logic Analysis

#### Finding DB-05: Counter Triggers Use GREATEST() -- Negative Counts Protected

**Location:** Migration lines 143-200
**Status:** OK -- All three counter triggers use `GREATEST(count - 1, 0)` for decrements:
- `sync_community_member_count()` line 150: `GREATEST(member_count - 1, 0)`
- `sync_post_reaction_count()` line 170: `GREATEST(reaction_count - 1, 0)`
- `sync_post_reply_count()` line 190: `GREATEST(reply_count - 1, 0)`

This prevents negative counts even if the counter somehow gets out of sync.

#### Finding DB-06: Counter Drift Under Concurrent and Cascade Operations

**Severity:** Low-Medium
**Analysis:** The counter triggers use `UPDATE ... SET member_count = member_count + 1`, which is an atomic read-modify-write at the row level in Postgres. Under default `READ COMMITTED` isolation, concurrent inserts will serialize on the row lock for the `communities` / `community_posts` row being updated. This is safe and correct.

**Cascade scenario (community deletion):**
- `community_members` rows are cascade-deleted via FK (`ON DELETE CASCADE` at migration line 57)
- Each cascade-delete fires `trg_sync_member_count` which tries to `UPDATE communities SET member_count = ...`
- But the `communities` row is already being deleted, so these updates are no-ops
- This is harmless (community is being destroyed anyway)

**Cascade scenario (post deletion):**
- Deleting a post cascade-deletes its reactions and replies (FK `ON DELETE CASCADE` at lines 104, 120)
- The cascade-deleted reactions/replies fire triggers that try to `UPDATE community_posts SET reaction_count/reply_count = ...`
- The post being deleted means those updates are no-ops
- Also harmless

**Verdict:** Safe. Postgres row locks handle concurrency correctly, and cascades only cause harmless no-op trigger updates.

#### Finding DB-07: Trigger Functions Use `CREATE OR REPLACE` Without Schema Qualification (SCHEMA-W03) -- CONFIRMED

**Location:** Migration lines 143, 163, 183
**Severity:** Low
**Current state:**
```sql
CREATE OR REPLACE FUNCTION sync_community_member_count()
```
These functions are created in the `public` schema by default. The `CREATE OR REPLACE` means a subsequent migration or manual SQL could silently replace the function body without error. If a bad actor had write access to the `public` schema, they could replace the trigger function with malicious logic.

**Recommended fix:** Use schema-qualified names and restrict search_path:
```sql
CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### 5. toggleReaction Race Condition (Check-Then-Act)

#### Finding DB-08: toggleReaction Has a TOCTOU Race Condition -- CONFIRMED

**Location:** `lib/db/communities.ts:771-814`
**Severity:** Medium

The function performs a classic check-then-act pattern across two separate non-transactional queries:

```typescript
// Step 1: Check for existing reaction (line 779-785)
const { data: existing } = await supabase
  .from("community_post_reactions")
  .select("id")
  .eq("post_id", postId)
  .eq("user_id", userId)
  .eq("reaction_type", reactionType)
  .single();

// -- RACE WINDOW --

if (existing) {
  // Step 2a: Delete it (line 789-792)
  await supabase.from("community_post_reactions").delete().eq("id", existing.id);
  return { added: false };
}

// Step 2b: Insert new reaction (line 798-802)
const { error } = await supabase.from("community_post_reactions").insert({...});
```

**Race scenario analysis:**

| Scenario | Request A | Request B | DB Result | Return Values | Correct? |
|---|---|---|---|---|---|
| Double-add | SELECT -> no row | SELECT -> no row | A inserts, B hits UNIQUE 23505 | Both `{added:true}` | Data OK, response misleading |
| Double-remove | SELECT -> row X | SELECT -> row X | A deletes X, B deletes nothing | Both `{added:false}` | Data OK, response OK |
| Add/remove interleave | SELECT -> no row | SELECT -> row from A's insert | A inserts, B deletes | No reaction left | Data OK but user confused |

The UNIQUE constraint at line 108 (`UNIQUE(post_id, user_id, reaction_type)`) prevents duplicate reactions. The 23505 error handling at line 807 catches this case. The main risk is misleading return values causing UI state divergence.

**Recommended fix:** Atomic toggle via a Postgres function:
```sql
CREATE FUNCTION toggle_reaction(p_post_id UUID, p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  deleted BOOLEAN;
BEGIN
  DELETE FROM community_post_reactions
  WHERE post_id = p_post_id AND user_id = p_user_id AND reaction_type = p_type;

  IF FOUND THEN
    RETURN false; -- removed
  END IF;

  INSERT INTO community_post_reactions (post_id, user_id, reaction_type)
  VALUES (p_post_id, p_user_id, p_type);
  RETURN true; -- added
END;
$$ LANGUAGE plpgsql;
```
This runs in a single transaction with proper isolation.

---

### 6. Missing Constraints and Indexes

#### Finding DB-09: Content Length Constraints (SCHEMA-W04) -- FIXED

**Location:** Migration lines 536-550
**Status:** Fixed. The migration includes:
- `chk_post_content_length`: `char_length(content) <= 10000` on `community_posts` (line 540)
- `chk_reply_content_length`: `char_length(content) <= 5000` on `community_post_replies` (line 548)

**Note on API/DB mismatch:** The API route validation at `app/api/communities/[slug]/posts/route.ts:31` limits post content to **5000** chars via Zod, but the DB constraint allows **10000**. The API is more restrictive, which prevents user-facing issues, but a direct service_role insert could store up to 10000 chars.

#### Finding DB-10: Missing `member_count` Index (SCHEMA-W05) -- FIXED

**Location:** Migration lines 553-554
**Status:** Fixed. Index `idx_communities_member_count` on `communities(member_count DESC)` is defined.

#### Finding DB-11: Missing `description` Length Constraint

**Severity:** Low
The `communities.description` column is `TEXT NOT NULL DEFAULT ''` (migration line 29) with no length constraint. The API limits it to 500 chars via Zod (`app/api/communities/route.ts:31`), but a service_role insert could store unlimited text.

**Recommended fix:**
```sql
ALTER TABLE communities
  ADD CONSTRAINT chk_community_description_length
  CHECK (char_length(description) <= 1000);
```

#### Finding DB-12: Missing `name` and `title` Length Constraints

**Severity:** Low
- `communities.name` (migration line 27): No DB-level length check. API limits to 100 chars.
- `community_posts.title` (migration line 76): No DB-level length check. API limits to 200 chars.

**Recommended fix:**
```sql
ALTER TABLE communities ADD CONSTRAINT chk_community_name_length CHECK (char_length(name) <= 200);
ALTER TABLE community_posts ADD CONSTRAINT chk_post_title_length CHECK (char_length(title) <= 500);
```

---

### 7. Search/ILIKE Injection Analysis

#### Finding DB-13: PostgREST Filter Syntax Risk in `.or()` String Interpolation

**Location:** `app/api/communities/route.ts:131-135` and `lib/db/communities.ts:340-342`
**Severity:** Medium (partially mitigated)

The route handler escapes SQL LIKE wildcards:
```typescript
const search = rawSearch
  ? rawSearch.replace(/[%_\\]/g, (c) => `\\${c}`)
  : undefined;
```

This is passed to `listCommunities()` which uses Supabase's `.or()` with string interpolation:
```typescript
query = query.or(
  `name.ilike.%${opts.search}%,description.ilike.%${opts.search}%`
);
```

**Risk:** The escaping handles LIKE wildcards but does NOT handle PostgREST filter syntax characters. If the search input contains commas, periods, or parentheses, it could break the filter string or inject additional filter conditions.

**Example:** A search value of `foo,id.eq.` followed by a known UUID could inject an additional filter condition into the `.or()` clause, potentially leaking data about whether a community with that ID exists.

**Recommended fix:** Either sanitize the search string to only allow safe characters (alphanumeric, spaces, hyphens), or use separate `.ilike()` calls combined with `.or`:
```typescript
query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
// Better: use PostgREST's proper filter encoding or switch to RPC
```

---

### 8. Additional Findings

#### Finding DB-14: `createCommunity` Non-Atomic Two-Step Insert

**Location:** `lib/db/communities.ts:211-272`
**Severity:** Low

The function inserts the community (line 231-244), then inserts the owner membership (line 251-257) as two separate operations. If the membership insert fails, it manually rolls back by deleting the community (line 260). This is NOT wrapped in a database transaction.

**Failure modes:**
1. If the delete-rollback at line 260 fails (network error), an orphan community exists with `member_count=0` and no owner
2. There is a brief window (between lines 244 and 257) where the community exists without an owner member, and could be seen by `listCommunities()`

**Recommended fix:** Use a Supabase RPC call to a Postgres function that performs both inserts in a single transaction.

#### Finding DB-15: `member_count` Initialization Inconsistency

**Location:** `lib/db/communities.ts:240` vs migration line 33
**Severity:** Low

The column default is `DEFAULT 1` (migration line 33), but the code explicitly passes `member_count: 0` (communities.ts line 240), relying on the trigger to increment it to 1 when the owner is inserted. If the owner insert fails and the rollback also fails (see DB-14), the community is left with `member_count: 0` despite the column's DEFAULT 1 intent.

#### Finding DB-16: `deletePost` and `deleteReply` Ignore `userId` Parameter

**Location:** `lib/db/communities.ts:746-760` and `lib/db/communities.ts:934-948`
**Severity:** Medium (corroborates api-investigator's NEW-02)

Both functions accept a `userId` parameter but do NOT include it in the query:
```typescript
// deletePost (line 752-755)
const { error } = await supabase
  .from("community_posts")
  .delete()
  .eq("id", postId);
// userId is accepted but never used!
```

Combined with the service_role bypass (DB-04), this means any code path that calls `deletePost(someId, anyUserId)` will succeed. The route handlers currently check authorization, but the data layer provides no safety net.

---

### 9. Summary Table

| ID | Finding | Severity | Status |
|---|---|---|---|
| DB-01 | Missing UPDATE policy on `community_members` (SCHEMA-W02) | Medium | Open - needs fix |
| DB-02 | Reaction SELECT was too permissive (SCHEMA-W01) | -- | Fixed |
| DB-03 | Posts UPDATE policy missing WITH CHECK clause | Low | Open |
| DB-04 | All data access uses service_role, RLS is decorative | High | Architectural concern |
| DB-05 | Counter triggers protected by GREATEST() | -- | OK |
| DB-06 | Counter drift under concurrent/cascade ops | Low | OK (safe with Postgres row locks) |
| DB-07 | Trigger functions lack schema qualification (SCHEMA-W03) | Low | Open |
| DB-08 | toggleReaction TOCTOU race condition (API-W06) | Medium | Open (confirmed) |
| DB-09 | Content length constraints (SCHEMA-W04) | -- | Fixed |
| DB-10 | Missing member_count index (SCHEMA-W05) | -- | Fixed |
| DB-11 | Missing description length constraint on `communities` | Low | Open |
| DB-12 | Missing name/title length constraints | Low | Open |
| DB-13 | PostgREST filter syntax injection risk in `.or()` | Medium | Partially mitigated |
| DB-14 | createCommunity non-atomic two-step insert | Low | Open |
| DB-15 | member_count initialization inconsistency | Low | Open |
| DB-16 | deletePost/deleteReply ignore userId parameter | Medium | Open (corroborates NEW-02) |

### Cross-References with API Investigation

| DB Finding | API Finding | Agreement |
|---|---|---|
| DB-04 (service_role bypass) | API "RLS Provides No Safety Net" | Full agreement -- both investigations identify this as the core architectural risk |
| DB-08 (toggleReaction race) | API-W06 | Full agreement -- both confirm TOCTOU with partial UNIQUE constraint mitigation |
| DB-16 (unused userId param) | NEW-02 | Full agreement -- both flag the misleading function signature |
| DB-13 (ILIKE injection) | API-W05 "Already Fixed" | Partial disagreement -- LIKE wildcards are escaped, but PostgREST filter syntax injection is not addressed |

---
---

## Frontend Runtime Investigation

**Investigator:** frontend-investigator
**Date:** 2026-02-11
**Scope:** All 14 UI files + 4 API route contracts in the Founder Communities feature

### Methodology

Every UI file was read in full. Each user journey step (browse, join, post, react, reply, moderate, leave) was traced end-to-end through component code and API route handlers. Findings are organized by severity.

---

### CRITICAL BUGS (will cause visible runtime failures)

#### BUG-F01: `handleReact` treats `undefined` as falsy, silently corrupts reaction state

**File:** `app/dashboard/communities/[slug]/page.tsx:162-185`
**Code:**
```ts
const added = json.data?.added;  // line 170
setPosts((prev) =>
  prev.map((p) =>
    p.id === postId
      ? {
            ...p,
            userHasReacted: added,        // could be undefined
            reactionCount: added           // ternary on undefined
              ? p.reactionCount + 1
              : p.reactionCount - 1,
          }
      : p
  )
);
```
**Problem:** If the API returns a malformed response (e.g. `{ success: true }` without `data`), `added` becomes `undefined`. The ternary `added ? +1 : -1` falls to the else branch, decrementing `reactionCount` below the true value. `userHasReacted` becomes `undefined`, which is falsy but not `false` -- React will still render the non-reacted state but the next toggle will be out of sync.

**Impact:** One malformed API response permanently desynchronizes the like count for that post until page reload.

**Reproduction:** Toggle like on a post while the API returns 500 or any non-`{ data: { added: boolean } }` shape.

**Fix:** Guard with `if (added === undefined) return;` or better yet, add optimistic UI with rollback.

---

#### BUG-F02: `fetchMembers()` missing from useEffect dependency array -- stale closure

**File:** `app/dashboard/communities/[slug]/page.tsx:84-93`
**Code:**
```ts
useEffect(() => {
  if (community) {
    if (isMember) {
      fetchPosts(0);
    } else {
      setPostsLoading(false);
    }
    fetchMembers();  // <-- this function is NOT in the dependency array
  }
}, [community, isMember, fetchPosts]);
```
**Problem:** `fetchMembers` is a plain function (not wrapped in `useCallback`), so it captures a stale `community` closure. React's exhaustive-deps lint rule would flag this.

In practice this currently works because `fetchMembers` checks `if (!community) return` and `community` is set before the effect runs. However, if `community` changes (e.g., after an update), the stale `fetchMembers` would use the old `slug` value captured at definition time.

**Impact:** After any community data refresh, the member list could show stale data from a previous community slug.

**Fix:** Wrap `fetchMembers` in `useCallback` with `[community, slug]` deps and add it to the useEffect dependency array.

---

#### BUG-F03: Leave button has NO confirmation dialog -- accidental data loss

**File:** `app/dashboard/communities/[slug]/page.tsx:125-142`
**Code:**
```ts
async function handleLeave() {
  if (!community) return;
  try {
    const res = await fetch(`/api/communities/${slug}/members`, { method: "DELETE" });
    // ...
  }
}
```
And in the browse page at `app/dashboard/communities/page.tsx:69-85`:
```ts
async function handleLeave(communitySlug: string) {
  setJoiningSlug(communitySlug);
  try {
    const res = await fetch(`/api/communities/${communitySlug}/members`, { method: "DELETE" });
    // ...
  }
}
```
**Problem:** Neither `handleLeave` on the detail page NOR on the browse page has a `window.confirm()` or any confirmation step. One accidental tap on "Leave" or "Joined" immediately sends a DELETE request. Compare with `handleRemovePost` (line 217) and `handleRemove` in members page (line 67) which both have `window.confirm()`.

**Impact:** Users accidentally leave communities with no way to undo. Especially problematic on mobile where the "Joined" button (which triggers leave) is easily mistapped.

**Fix:** Add `if (!window.confirm("Leave this community?")) return;` or implement a proper confirmation dialog component.

---

#### BUG-F04: ReplyThread does not refresh after submitting a reply -- new reply invisible

**File:** `components/communities/ReplyThread.tsx:41-49`
**Code:**
```ts
const handleSubmitReply = async () => {
  if (!replyText.trim() || !onReply) return;
  setSubmitting(true);
  try {
    await onReply(postId, replyText.trim());
    setReplyText("");
    // <-- replies state is NEVER updated after submission
  } finally {
    setSubmitting(false);
  }
};
```
**Problem:** After calling `onReply` (which POSTs to the API), the component clears the text input but never re-fetches replies or appends the new reply to the local `replies` state. The parent's `handleReply` (page.tsx:187-198) only increments `replyCount` on the post -- it does not pass back the created reply data.

**Impact:** User submits a reply, the text box clears, but the reply is invisible until they close and reopen the thread (which triggers a fresh `fetchReplies`). This will feel broken to every user.

**Fix:** Either (a) re-fetch replies after successful submission, or (b) have `onReply` return the created reply object and append it to `replies` optimistically.

---

### HIGH SEVERITY BUGS (degraded UX, data inconsistencies)

#### BUG-F05: No optimistic UI on reactions -- perceptible delay

**File:** `app/dashboard/communities/[slug]/page.tsx:162-185`
**Problem:** The reaction toggle waits for the full API round-trip before updating the heart icon and count. On slow connections this creates a noticeable 200-500ms delay where the user taps and nothing visually changes.

**Impact:** The UI feels sluggish. Users may double-tap thinking the first tap didn't register, causing rapid toggle back-and-forth.

**Fix:** Optimistically toggle `userHasReacted` and `reactionCount` immediately, then rollback on API failure.

---

#### BUG-F06: No optimistic UI on post creation -- form clears but post may not appear

**File:** `app/dashboard/communities/[slug]/page.tsx:144-160`
**Code:**
```ts
if (res.ok) {
  const json = await res.json();
  if (json.data) {
    setPosts((prev) => [json.data, ...prev]);
  }
  toast.success("Post created!");
} else {
  toast.error("Failed to create post");
}
```
**Problem:** If the API returns 200 but `json.data` is falsy (e.g., `{ success: true, data: null }`), the success toast fires but the post never appears in the feed. The form has already been cleared by the `CreatePostForm` component's `finally` block.

**Impact:** User sees "Post created!" toast but the post is missing from the feed. They have lost their content.

**Fix:** Check `json.data` before showing success toast, or always re-fetch posts after creation.

---

#### BUG-F07: `CreatePostForm` accepts `communityId` prop but never uses it (dead prop)

**File:** `components/communities/CreatePostForm.tsx:12-13, 16`
**Code:**
```ts
interface CreatePostFormProps {
  communityId: string;  // declared
  onSubmit: (data: { title: string; content: string; postType: PostType }) => Promise<void>;
}

export function CreatePostForm({ communityId, onSubmit }: CreatePostFormProps) {
  // communityId is destructured but NEVER referenced in the function body
```
Same issue in `CreatePostFormDesktop` at line 129 -- `props.communityId` is never used.

**Problem:** The prop is passed from the detail page (line 337: `communityId={community.id}`) but serves no purpose. Confusing for maintainers and may indicate a missing feature (e.g., sending `communityId` in the POST body).

---

#### BUG-F08: Browse page join/leave error handling is silent

**File:** `app/dashboard/communities/page.tsx:51-85`
**Code:**
```ts
async function handleJoin(communitySlug: string) {
  setJoiningSlug(communitySlug);
  try {
    const res = await fetch(`/api/communities/${communitySlug}/members`, { method: "POST" });
    if (res.ok) {
      // update state
    }
    // NO else branch -- failure is silently swallowed
  } finally {
    setJoiningSlug(null);
  }
}
```
**Problem:** If the API returns 409 (already a member), 403, or 500, the user sees no error feedback. The button just stops spinning. Compare with the detail page's `handleJoin` (line 108-122) which has `toast.error("Failed to join")`.

**Impact:** User clicks "Join", the button spins briefly and returns to "Join" state. No indication of what went wrong.

**Fix:** Add error handling: `else { toast.error("Failed to join"); }` or a catch block with toast.

---

#### BUG-F09: Pagination state (`postPage`) resets incorrectly on community/membership change

**File:** `app/dashboard/communities/[slug]/page.tsx:35, 84-93, 348-352`
**Code:**
```ts
const [postPage, setPostPage] = useState(0);   // line 35

useEffect(() => {
  if (community) {
    if (isMember) {
      fetchPosts(0);  // resets to page 0
    }
  }
}, [community, isMember, fetchPosts]);           // line 93

// Load more handler:
onLoadMore={() => {
  const nextPage = postPage + 1;
  setPostPage(nextPage);
  fetchPosts(nextPage);
}}
```
**Problem:** When the effect calls `fetchPosts(0)`, `postPage` is never reset to 0. So the next "Load more" click will set `postPage` to `oldPage + 1` instead of `1`, potentially skipping pages.

**Impact:** After any re-render of the community effect, "Load more" could skip an entire page of posts.

**Fix:** Add `setPostPage(0)` alongside `fetchPosts(0)` in the effect.

---

#### BUG-F10: Concurrent join/leave race condition on browse page

**File:** `app/dashboard/communities/page.tsx:27, 51-85`
**Code:**
```ts
const [joiningSlug, setJoiningSlug] = useState<string | null>(null);
```
**Problem:** `joiningSlug` is a single string. If the user rapidly clicks "Join" on community A and then "Join" on community B, the first `setJoiningSlug` is overwritten. When A's request resolves and sets `setJoiningSlug(null)`, B's button is re-enabled even though B's request is still in-flight.

**Impact:** Multiple concurrent join requests for the same community, leading to 409 errors.

**Fix:** Use a `Set<string>` instead of a single slug, or debounce/disable at the card level.

---

### MEDIUM SEVERITY (design gaps, missing features, scaling concerns)

#### BUG-F11: Reply thread is completely flat -- no nested/threaded replies

**File:** `components/communities/ReplyThread.tsx`
**Problem:** The `PostReply` type in `lib/communities/types.ts` has no `parentReplyId` field, and the component renders all replies in a single flat list. The database schema reportedly supports `parent_reply_id`, but the API and frontend both ignore it.

**Impact:** Users cannot reply to specific replies, which is a core social feature expectation.

---

#### BUG-F12: Client-side filtering on browse page will not scale

**File:** `app/dashboard/communities/page.tsx:88-96`
**Problem:** All communities are fetched at once (no pagination or query params), then filtered client-side. With 100+ communities, this means a large initial payload and no server-side search indexing.

---

#### BUG-F13: Error recovery on detail page silently redirects to browse

**File:** `app/dashboard/communities/[slug]/page.tsx:38-55`
**Problem:** Whether the community does not exist (404), the user is unauthorized (401/403), or the network is down, the user is silently redirected to the browse page with no explanation. Same pattern in `[slug]/members/page.tsx:24-53`.

**Impact:** Users navigating during a transient network blip will be bounced with no idea why.

**Fix:** Differentiate error types: show "not found" for 404, retry for network errors.

---

#### BUG-F14: `fetchPosts` silently swallows errors

**File:** `app/dashboard/communities/[slug]/page.tsx:61-82`
**Problem:** If the posts API fails, the user sees empty feed with no error indication. Same in `fetchMembers` (line 95-106) and `ReplyThread.fetchReplies` (line 23-37).

**Impact:** User sees "No posts yet" when there are actually posts they cannot load. Misleading empty state.

---

#### BUG-F15: `handlePin` and `handleRemovePost` have no loading/disabled state

**File:** `app/dashboard/communities/[slug]/page.tsx:200-225`
**Problem:** Pin/remove buttons have no disabled state during API calls. Rapid clicks send multiple conflicting requests.

---

#### BUG-F16: CreateCommunityDialog and CreateCommunityPage have inconsistent validation rules

**File comparison:**
- `CreateCommunityDialog` (line 53-54): name min 2 chars, max 100 chars
- `create/page.tsx` (line 33-34): name min 3 chars, max 60 chars

**Problem:** Two UI paths for creating a community have different validation thresholds.

---

### LOW SEVERITY (polish, accessibility, maintainability)

#### BUG-F17: Missing aria-label on heart/reply buttons

**File:** `components/communities/PostCard.tsx:79-101`
**Problem:** Heart and reply buttons have no `aria-label`. Screen readers announce "button" with no context.

**Fix:** Add `aria-label={post.userHasReacted ? "Unlike post" : "Like post"}` and `aria-label="Show replies"`.

---

#### BUG-F18: Missing keyboard handling for reply submission

**File:** `components/communities/ReplyThread.tsx:98-115`
**Problem:** No keyboard shortcut (Cmd+Enter / Ctrl+Enter) for reply submission. Same gap in `CreatePostForm`.

---

#### BUG-F19: No loading state on Leave button in detail page

**File:** `app/dashboard/communities/[slug]/page.tsx:289-292`
**Problem:** No `disabled` prop or spinner during the leave API call. User can click multiple times.

---

#### BUG-F20: `getTimeAgo` does not handle future dates or invalid date strings

**File:** `components/communities/PostCard.tsx:139-151`
**Problem:** If `post.createdAt` is invalid, `new Date(dateStr).getTime()` returns `NaN`, causing the function to display "Invalid Date".

---

#### BUG-F21: Cover image rendered with `<img>` instead of `<Image>` from next/image

**File:** `components/communities/CommunityCard.tsx:33-37` and `app/dashboard/communities/[slug]/page.tsx:266`
**Problem:** Raw `<img>` tags bypass Next.js image optimization, causing layout shift.

---

#### BUG-F22: Icon upload is a non-functional placeholder

**File:** `app/dashboard/communities/create/page.tsx:136-143`
**Problem:** The div has `cursor-pointer` and hover styling but no `onClick` handler, no file input, and no upload logic.

**Fix:** Either implement file upload or remove the interactive styling and add "(Coming soon)" label.

---

#### BUG-F23: Dark mode has inconsistent owner badge styling

**File:** `app/dashboard/communities/[slug]/page.tsx:392-394` vs `components/communities/ModerationTools.tsx:52`
**Problem:** Inline badge styling in the detail page's member tab does not match the `RoleBadge` component used in the members page.

---

### FRONTEND SUMMARY TABLE

| ID | Severity | File | Description |
|---|---|---|---|
| F01 | CRITICAL | [slug]/page.tsx:170 | handleReact reads undefined as falsy, corrupts reaction state |
| F02 | CRITICAL | [slug]/page.tsx:84-93 | fetchMembers missing from useEffect deps, stale closure risk |
| F03 | CRITICAL | [slug]/page.tsx:125 + page.tsx:69 | Leave button has no confirmation dialog |
| F04 | CRITICAL | ReplyThread.tsx:41-49 | New reply not visible after submission |
| F05 | HIGH | [slug]/page.tsx:162 | No optimistic UI on reactions |
| F06 | HIGH | [slug]/page.tsx:144 | Post creation: success toast but post may not appear |
| F07 | HIGH | CreatePostForm.tsx:12 | communityId prop accepted but never used |
| F08 | HIGH | page.tsx:51-85 | Browse page join/leave errors silently swallowed |
| F09 | HIGH | [slug]/page.tsx:35,84 | postPage not reset when posts re-fetched from page 0 |
| F10 | HIGH | page.tsx:27,51-85 | Single joiningSlug causes race condition with concurrent actions |
| F11 | MEDIUM | ReplyThread.tsx | Flat reply thread, no nesting support |
| F12 | MEDIUM | page.tsx:88-96 | Client-side filtering will not scale past ~100 communities |
| F13 | MEDIUM | [slug]/page.tsx:38-55 | Silent redirect on any error (404, network, auth) |
| F14 | MEDIUM | [slug]/page.tsx:76 | fetchPosts silently swallows errors |
| F15 | MEDIUM | [slug]/page.tsx:200-225 | Pin/remove have no loading state, allows rapid double-clicks |
| F16 | MEDIUM | Dialog vs create/page.tsx | Inconsistent validation rules for community creation |
| F17 | LOW | PostCard.tsx:79-101 | Missing aria-labels on interactive buttons |
| F18 | LOW | ReplyThread.tsx:98-115 | No keyboard shortcut for reply submission |
| F19 | LOW | [slug]/page.tsx:289 | Leave button has no loading/disabled state |
| F20 | LOW | PostCard.tsx:139-151 | getTimeAgo does not handle invalid dates |
| F21 | LOW | CommunityCard.tsx:33 | Raw img tag instead of next/image |
| F22 | LOW | create/page.tsx:136-143 | Non-functional icon upload placeholder looks interactive |
| F23 | LOW | [slug]/page.tsx:392 | Dark mode badge styling inconsistency |

**Total: 23 bugs found (4 critical, 6 high, 6 medium, 7 low)**

### Cross-References with API and DB Investigations

| Frontend Finding | API/DB Finding | Agreement |
|---|---|---|
| F01 (reaction state corruption) | API-W06 / DB-08 (toggleReaction race) | Compound risk -- backend race + frontend undefined handling makes reaction UX doubly fragile |
| F05 (no optimistic UI on reactions) | API-W06 (race condition) | Both contribute to inconsistent reaction state; optimistic UI would actually mask the race but not fix it |
| F04 (reply not visible after submit) | -- | Pure frontend issue, no backend counterpart |
| F03 (no leave confirmation) | -- | Pure frontend issue; the backend correctly blocks owner from leaving |
| F13 (silent redirect) | NEW-01 (detail leaks posts) | The frontend silently redirects on ANY non-200, while the API may return 404 with useful error context that the UI ignores |
