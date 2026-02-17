# DEBUG: Pre-Machine DB Waterfall in Chat Route

**File:** `app/api/fred/chat/route.ts` (function `handlePost`, lines 239-500)
**Investigator:** db-waterfall-investigator
**Date:** 2026-02-16

---

## Executive Summary

The chat route executes **12-17 sequential DB calls** before `fredService.process()` is ever invoked. These calls form a "waterfall" -- each awaits the previous one. None are parallelized at the route level, even though most are independent.

**Worst-case estimated pre-machine latency: 1,200-2,500ms** (before any AI/LLM work begins).

### Critical Finding: DUPLICATE `getActiveMode()` call

At **line 437**, `getActiveMode(userId)` is called a second time inside the `investor-readiness` branch. The first call happens at **line 365**. Each call triggers `getConversationState()` which is a full Supabase query. This is a pure waste of ~80-150ms.

### Critical Finding: `getRealityLensGate()` called TWICE

At **line 327**, `getRealityLensGate(userId)` is called. Then at **line 445**, it's called AGAIN inside the `investor-readiness` branch to check deck gate status. Each call runs `getConversationState()` underneath.

---

## Full Waterfall Trace (sequential order)

### Phase 1: Auth + Tier (lines 244-256)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 1 | `requireAuth()` | `auth-helpers.ts:227` -> `getUserId()` -> `getCurrentUser()` -> `supabase.auth.getUser()` + `getProfile()` (SELECT profiles) | **2 DB calls** (Supabase Auth + profiles SELECT) | 100-200ms | Independent |
| 2 | `getUserTier(userId)` | `tier-middleware.ts:42` -> `getUserSubscription()` -> raw SQL `SELECT * FROM user_subscriptions` | **1 DB call** | 50-100ms | Independent (needs userId from #1) |
| 3 | `checkRateLimitForUser()` | `rate-limit.ts:307` -> `checkRateLimit()` -> Upstash Redis (or in-memory) | **1 Redis call** | 20-50ms | Independent (needs userId from #1) |

**Subtotal: 4 calls, ~170-350ms**

Note: #2 and #3 could run in parallel (both only need userId), but they are awaited sequentially.

### Phase 2: Context Building (line 307)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 4 | `buildFounderContext(userId, hasPersistentMemory)` | `context-builder.ts:389` | **Composite** | 200-500ms | Independent of Phase 3+ |

**Inside `buildFounderContext`, there is a `Promise.all` with 4 sub-calls:**

| Sub | Call | Type | Est. Latency |
|-----|------|------|-------------|
| 4a | `loadFounderProfile(userId)` | SELECT profiles (9 columns) | 50-100ms |
| 4b | `loadSemanticFacts(userId, ...)` | SELECT fred_semantic_memory (all rows for user) | 50-150ms |
| 4c | `checkIsFirstConversation(userId)` | SELECT fred_conversation_state (id only) | 30-80ms |
| 4d | `loadProgressContext(userId)` -> `buildProgressContext(userId)` | **2 sub-calls via Promise.all**: `getOrCreateConversationState()` (SELECT fred_conversation_state) + `getAllEvidence()` (SELECT fred_step_evidence) | 80-200ms |

**Total DB calls inside buildFounderContext: 5 queries** (parallelized into 4 concurrent groups, but 4d itself has 2 parallel queries).

**Good:** `buildFounderContext` correctly uses `Promise.all` internally.

**Bad:** The `profiles` table is queried AGAIN inside `loadFounderProfile` even though `requireAuth()` already fetched a profile in `getProfile()`. That's a **redundant profiles SELECT**.

**Bad:** `checkIsFirstConversation` queries `fred_conversation_state` and `buildProgressContext` -> `getOrCreateConversationState` ALSO queries `fred_conversation_state`. Same table, same user, two queries (though they run in parallel within the Promise.all, so no serial latency added).

### Phase 3: Conversation State (lines 310-321)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 5 | `getOrCreateConversationState(userId)` | `conversation-state.ts:164` -> SELECT fred_conversation_state | **1 DB call** | 50-100ms | Could parallel with Phase 2 |

**REDUNDANT:** `buildFounderContext` (Phase 2, sub-call 4d) already calls `getOrCreateConversationState(userId)` inside `buildProgressContext`. The result from Phase 2 is not reused; Phase 3 fetches the same row again.

### Phase 4: Reality Lens Gate (lines 324-356)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 6 | `getRealityLensGate(userId)` | `conversation-state.ts:820` -> `getConversationState(userId)` -> SELECT fred_conversation_state | **1 DB call** | 50-100ms | Could parallel with Phase 2-3 |

**REDUNDANT:** This is the THIRD time `fred_conversation_state` is queried for the same user in this request. The data is already loaded by both Phase 2 (4c, 4d) and Phase 3 (#5).

If a downstream request is detected AND the gate is not open:

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 7 | `getGateRedirectCount(userId, ...)` | `conversation-state.ts:902` -> `getActiveMode(userId)` -> `getConversationState(userId)` -> SELECT fred_conversation_state | **1 DB call** | 50-100ms | N/A (conditional) |

**REDUNDANT:** FOURTH query to `fred_conversation_state`.

### Phase 5: Diagnostic Mode (lines 358-417)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 8 | `getActiveMode(userId)` | `conversation-state.ts:1137` -> `getConversationState(userId)` -> SELECT fred_conversation_state | **1 DB call** | 50-100ms | Could parallel with Phases 2-4 |

**REDUNDANT:** FIFTH query to `fred_conversation_state` (or 4th if the gate redirect branch wasn't taken).

### Phase 6: IRS + Deck Protocol (lines 419-462, conditional on `activeMode === "investor-readiness"`)

| # | Call | Implementation | Type | Est. Latency | Parallelizable? |
|---|------|---------------|------|-------------|-----------------|
| 9 | `getLatestIRS(supabaseService, userId)` | `irs/db.ts:67` -> SELECT investor_readiness_scores | **1 DB call** | 50-100ms | Parallelizable with #10, #11 |
| 10 | **`getActiveMode(userId)` (DUPLICATE!)** | Line 437. Same as #8. Fetches fred_conversation_state AGAIN. | **1 DB call** | 50-100ms | SHOULD NOT EXIST |
| 11 | `getRealityLensGate(userId)` **(DUPLICATE!)** | Line 445. Same as #6. Fetches fred_conversation_state AGAIN. | **1 DB call** | 50-100ms | SHOULD NOT EXIST |

**CRITICAL:** Lines 437 and 445 re-fetch data that was ALREADY loaded at lines 365 and 327 respectively. The `persisted` variable at line 437 shadows the one at line 365 but fetches identical data.

---

## Total DB Call Count

### Best case (non-investor-readiness mode, no downstream request detected):

| Source | Table | Count |
|--------|-------|-------|
| Supabase Auth | auth.users | 1 |
| requireAuth -> getProfile | profiles | 1 |
| getUserSubscription | user_subscriptions | 1 |
| checkRateLimit | Redis | 1 |
| loadFounderProfile | profiles | 1 (REDUNDANT with requireAuth) |
| loadSemanticFacts | fred_semantic_memory | 1 |
| checkIsFirstConversation | fred_conversation_state | 1 |
| buildProgressContext -> getOrCreate | fred_conversation_state | 1 |
| buildProgressContext -> getAllEvidence | fred_step_evidence | 1 |
| getOrCreateConversationState (Phase 3) | fred_conversation_state | 1 (REDUNDANT) |
| getRealityLensGate | fred_conversation_state | 1 (REDUNDANT) |
| getActiveMode | fred_conversation_state | 1 (REDUNDANT) |

**Total: 12 calls (4 are redundant)**

### Worst case (investor-readiness mode + downstream request detected):

Add to above:
| getGateRedirectCount | fred_conversation_state | 1 (REDUNDANT) |
| getLatestIRS | investor_readiness_scores | 1 |
| getActiveMode (DUPLICATE L437) | fred_conversation_state | 1 (REDUNDANT) |
| getRealityLensGate (DUPLICATE L445) | fred_conversation_state | 1 (REDUNDANT) |

**Total: 16 calls (7 are redundant)**

---

## fred_conversation_state Query Tally

The `fred_conversation_state` table is queried **up to 7 times** for the same user in a single request:

1. `checkIsFirstConversation` (context-builder.ts:119)
2. `getOrCreateConversationState` inside `buildProgressContext` (context-builder.ts:398 -> conversation-state.ts:626)
3. `getOrCreateConversationState` at route line 313
4. `getRealityLensGate` at route line 327 (via `getConversationState`)
5. `getGateRedirectCount` at route line 339 (via `getActiveMode` -> `getConversationState`) [conditional]
6. `getActiveMode` at route line 365 (via `getConversationState`)
7. `getActiveMode` at route line 437 (via `getConversationState`) [conditional, DUPLICATE]
8. `getRealityLensGate` at route line 445 (via `getConversationState`) [conditional, DUPLICATE]

---

## `buildFounderContext` DB Call Breakdown

The function at `lib/fred/context-builder.ts:389` makes **5 DB queries** via `Promise.all`:

1. `loadFounderProfile` -> SELECT profiles (line 48-56)
2. `loadSemanticFacts` -> SELECT fred_semantic_memory (line 92-109)
3. `checkIsFirstConversation` -> SELECT fred_conversation_state (line 119-133)
4. `loadProgressContext` -> `buildProgressContext` which internally does:
   - 4a. `getOrCreateConversationState` -> SELECT fred_conversation_state
   - 4b. `getAllEvidence` -> SELECT fred_step_evidence

These 5 queries are parallelized (good), but their results are NOT shared with the rest of the route (bad).

---

## Recommended Fixes

### Fix 1: Single conversation state load (HIGH IMPACT)

Load `fred_conversation_state` exactly ONCE at the top, then pass the result everywhere:

```typescript
const conversationState = await getOrCreateConversationState(userId);
// Pass to buildFounderContext, use for RL gate, use for active mode, etc.
```

**Saves: 4-6 redundant DB calls (200-600ms)**

### Fix 2: Remove duplicate getActiveMode at line 437

The `persisted` variable at line 437 is identical to the one obtained at line 365. Replace:
```typescript
// Line 437 -- DELETE THIS
const persisted = await getActiveMode(userId);
```
With:
```typescript
// Reuse the persisted data from line 365
const formalAssessments = persisted.modeContext.formalAssessments; // persisted already in scope
```

Wait -- `persisted` from line 365 is actually in scope but shadowed by the new `const persisted` at line 437. The fix is to just remove line 437 and reference the outer `persisted` variable (rename the inner one or reference modeContext directly).

**Saves: 1 DB call (~80-150ms)**

### Fix 3: Remove duplicate getRealityLensGate at line 445

The `rlGate` variable from line 327 is already in scope. Replace lines 443-452:
```typescript
let rlGateOpenForDeck = false;
try {
  const rlGate = await getRealityLensGate(userId); // REMOVE THIS
  ...
```
With:
```typescript
let rlGateOpenForDeck = false;
if (rlGate) {  // rlGate already in scope from line 327
  const deckGateStatus = checkGateStatus(rlGate, "pitch_deck");
  rlGateOpenForDeck = deckGateStatus.gateOpen;
}
```

Note: the outer variable is also called `rlGate` but it's the same data since `getRealityLensGate` calls `getConversationState` which returns the same row.

**Saves: 1 DB call (~80-150ms)**

### Fix 4: Remove redundant profiles query

`requireAuth()` already calls `getProfile()` which fetches `profiles.name, stage, challenges`. Then `buildFounderContext` -> `loadFounderProfile` fetches profiles again (with more columns). Options:
- Pass the profile data from auth to buildFounderContext
- Or make `requireAuth` return the full profile

**Saves: 1 DB call (~50-100ms)**

### Fix 5: Parallelize Phase 1 calls

After getting `userId` from `requireAuth()`, run `getUserTier()` and `checkRateLimitForUser()` in parallel:

```typescript
const [userTier, { response: rateLimitResponse }] = await Promise.all([
  getUserTier(userId),
  checkRateLimitForUser(req, userId, rateLimitKey), // needs tier, so this needs restructuring
]);
```

Note: There's a dependency -- `checkRateLimitForUser` needs `rateLimitKey` which depends on `userTier`. So `getUserTier` must complete first. However, `getUserTier` and `buildFounderContext` CAN run in parallel.

### Fix 6: Parallelize Phases 2-5

After auth + tier resolution, the following are all independent and can run in `Promise.all`:
- `buildFounderContext(userId, hasPersistentMemory)`
- `getOrCreateConversationState(userId)`
- `getRealityLensGate(userId)` (or better: derive from conversation state)
- `getActiveMode(userId)` (or better: derive from conversation state)

With Fix 1 (single conversation state load), this collapses to:
```typescript
const [founderContext, conversationState] = await Promise.all([
  buildFounderContext(userId, hasPersistentMemory),
  getOrCreateConversationState(userId),
]);
// Derive everything else from conversationState:
const rlGate = conversationState.realityLensGate;
const activeMode = conversationState.activeMode;
const modeContext = conversationState.modeContext;
```

**Estimated savings from all fixes: 400-1,000ms per request**

---

## Summary Table

| Issue | Location | Redundant Calls | Est. Waste |
|-------|----------|----------------|-----------|
| Duplicate `getActiveMode()` | L365 + L437 | 1 | 80-150ms |
| Duplicate `getRealityLensGate()` | L327 + L445 | 1 | 80-150ms |
| Repeated `fred_conversation_state` queries | L313, L327, L339, L365 (all redundant after context-builder loads it) | 3-4 | 150-400ms |
| Redundant `profiles` SELECT | requireAuth + loadFounderProfile | 1 | 50-100ms |
| No parallelization of Phase 2-5 | L307-L462 | N/A (serial) | 200-400ms |
| **TOTAL WASTE** | | **6-7 calls** | **560-1,200ms** |
