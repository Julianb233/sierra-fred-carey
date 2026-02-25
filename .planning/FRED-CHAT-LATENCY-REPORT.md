# FRED Chat Latency Debug Report

**Investigator:** Team Lead (Consolidated)
**Date:** 2026-02-25
**Scope:** FRED Chat endpoint latency — three parallel hypotheses
**Files Investigated:**
- `app/api/fred/chat/route.ts`
- `lib/fred/service.ts`
- `lib/fred/machine.ts`
- `lib/fred/actors/validate-input.ts`
- `lib/fred/actors/mental-models.ts`
- `lib/fred/actors/synthesize.ts`
- `lib/fred/actors/decide.ts`
- `lib/fred/actors/execute.ts`
- `lib/fred/actors/load-memory.ts`
- `lib/fred/context-builder.ts`
- `lib/db/fred-memory.ts`
- `lib/db/conversation-state.ts`
- `lib/fred/scoring/engine.ts`
- `next.config.mjs`
- `vercel.json`

---

## Executive Summary — Root Causes Ranked by Severity

| # | Severity | Issue | Estimated Latency Added |
|---|----------|-------|------------------------|
| 1 | CRITICAL | No `maxDuration` export — route defaults to Vercel's 10s hobby limit | Causes timeouts for all non-trivial messages |
| 2 | HIGH | `getGateRedirectCount` makes a sequential `getActiveMode` DB call AFTER the 5-call `Promise.all` (line 372) | +50–150ms per message with downstream request |
| 3 | HIGH | For `decision_request` intent with `OPENAI_API_KEY` set, `synthesize.ts` triggers a full GPT-4o AI call via `scoreDecision` — a hidden 5th AI round-trip | +800ms–3s |
| 4 | HIGH | `storeEpisode` for user message is `await`-ed BEFORE `processStream` starts (lines 656–665) — blocks streaming start by ~50–200ms per message (Pro+ only) | +50–200ms (Pro+ only) |
| 5 | MEDIUM | The `investor-readiness` mode path makes a dynamic `import("@/lib/fred/irs/db")` + sequential `getLatestIRS` DB call at line 435, outside the parallel `Promise.all` block | +50–200ms (investor-readiness users) |
| 6 | MEDIUM | `decideActor` calls `generateWithLLM` (GPT-4o, 1024 max tokens) for every substantive message, even non-decision questions — this is the primary LLM call and is not fast-pathed for `question` or `information` intents | +600ms–2.5s |
| 7 | MEDIUM | The `loadMemoryActor` runs an embedding generation call (`generateEmbedding`) in parallel but it is a full AI round-trip for Pro+ users for every message — this adds latency before `validateInput` even begins | +200–800ms (Pro+) |
| 8 | LOW | The `getAllUserFacts` query fetches ALL semantic memory rows for a user, ordered by category + updated_at, with no LIMIT clause | Grows with user history; no cap on data transfer |
| 9 | LOW | `processStream` has a 50ms polling safety fallback (`setTimeout(resolve, 50)`) that is reached when no state change fires within 50ms — creates jitter between states | +0–50ms per state transition |

---

## Hypothesis 1 — LLM Pipeline Latency

### Findings

#### 1.1 Machine State Sequence (Sequential)

The XState machine in `lib/fred/machine.ts` processes states sequentially. For a typical substantive message the chain is:

```
idle → loading_memory → intake (validateInput) → validation → mental_models → synthesis → decide → execute → complete
```

That is **5 actor invocations**, each blocking the next. For a greeting or feedback message, the machine fast-paths after `intake`:

```
idle → loading_memory → intake → validation → execute (fast-path: buildSimpleDecision) → complete
```

The fast-path works correctly. `machine.ts:473-494` — `isGreetingOrFeedback` guard fires and jumps directly to `execute` with a pre-built `DecisionResult` from `buildSimpleDecision`, skipping mental_models, synthesis, and decide entirely.

#### 1.2 AI Calls Per Message — Decision Request

For `intent === "decision_request"` with `OPENAI_API_KEY` set, there are **two sequential AI calls**:

**Call 1 — Scoring Engine (`lib/fred/actors/synthesize.ts:115-124`):**
```typescript
if (input.intent === "decision_request" && process.env.OPENAI_API_KEY) {
  const aiScores = await getAIFactorScores(input, memory);
```
This calls `scoreDecision` in `lib/fred/scoring/engine.ts`, which calls `openai.chat.completions.create` with model `gpt-4o` (`scoring/types.ts:403`), temperature 0.3, no max_tokens set (uses OpenAI default of 4096). The system prompt is "You are FRED, an expert startup advisor." — a very short prompt. The user prompt from `buildScoringPrompt` contains the decision text + context.

Estimated latency: **800ms–2s** (GPT-4o, no streaming, relatively short prompts).

**Call 2 — Main LLM Response (`lib/fred/actors/decide.ts:295-303`):**
```typescript
const result = await generate(input.originalMessage, {
  system: systemPrompt,
  temperature: 0.7,
  maxOutputTokens: 1024,
  ...(tools ? { tools, maxSteps: 3 } : {}),
});
```
This uses `lib/ai/fred-client.ts`'s `generate()` with the full FRED system prompt (which can be extremely large — up to 100K tokens of context from the route). Model is tier-dependent (GPT-4o-mini for Free, GPT-4o for Pro+). `maxOutputTokens: 1024`. When tools are passed (for userId cases), `maxSteps: 3` allows up to 3 additional tool-call round-trips.

Estimated latency: **600ms–2.5s** (without tools), **1.5s–5s** (with tools and multiple steps).

**Total LLM latency for a decision_request:** 1.4s–4.5s minimum, up to 7.5s with tools.

#### 1.3 AI Calls Per Message — Question Intent

For `intent === "question"`, scoring is skipped (heuristics only). The `decide.ts:349-357` path attempts LLM generation for any non-greeting/non-feedback intent:

```typescript
try {
  const llmResponse = await generateWithLLM(input, founderContext, userId);
```

So even `question` intent goes through the full GPT-4o / GPT-4o-mini call. There is no fast-path for simple questions. The `isSimpleQuestion` guard in `machine.ts:188-194` exists but only routes to `auto_execute` — which still calls `generateWithLLM` in `buildResponseContent`.

**Total LLM latency for a question:** ~600ms–2.5s (one LLM call).

#### 1.4 Mental Models — No AI Calls

All mental model implementations in `lib/fred/actors/mental-models.ts` are pure computation (regex + heuristics). They run in parallel via `Promise.all` (`mental-models.ts:29-33`). No AI calls here. Latency is sub-millisecond.

#### 1.5 Fast-Path Correctness

- **Greeting** (`intent === "greeting"`): correctly fast-pathed at `machine.ts:481-488` — no AI calls, uses template. Latency: <10ms for the machine itself.
- **Feedback** (`intent === "feedback"`): same fast-path. No AI calls.
- Both still go through `loading_memory` first.

#### 1.6 The Hidden 2nd AI Call Problem

The scoring engine AI call (`synthesize.ts:115`) is triggered silently for every `decision_request`. It is not logged prominently, and the system prompt comments only mention one LLM call (in `decide.ts`). Users asking "Should I hire a CTO now?" will get **two sequential AI calls** before receiving a response.

### Actionable Fixes — Hypothesis 1

**Fix 1A (Quick Win): Disable AI scoring by default**
In `lib/fred/scoring/types.ts`, the config has `DEFAULT_SCORING_CONFIG.aiModel = "gpt-4o"`. The `useAI` flag defaults to `DEFAULT_SCORING_CONFIG.useAIScoring`. Set `useAIScoring: false` as default so scoring uses heuristics unless explicitly enabled. The heuristic fallback already exists and works. This eliminates the hidden 2nd AI call.

```typescript
// lib/fred/scoring/types.ts
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  useAIScoring: false, // was: true — heuristics are sufficient for P50 quality
  aiModel: "gpt-4o",
  ...
};
```
**Estimated savings: 800ms–2s per decision_request.**

**Fix 1B (Medium): Cache `generateWithLLM` results for identical inputs**
Not applicable — each message is unique. However, consider adding a fast-path in `buildResponseContent` (`decide.ts:310`) that bypasses LLM entirely for `information` intent (currently LLM is called even for informational sharing).

**Fix 1C (Medium): Skip LLM for `information` intent**
In `decide.ts:310-323`, the `clarify` and `defer` actions already use templates. Add `information` to the template path — users sharing info ("Our MRR is $10K") don't need a full LLM response, just an acknowledgment.

---

## Hypothesis 2 — Database / Context Loading Waterfall

### Findings

#### 2.1 Pre-Machine Parallel Load (route.ts:313-344)

The main `Promise.all` at `route.ts:313` runs 5 calls in parallel:
1. `buildFounderContextWithFacts(userId, hasPersistentMemory)` — which itself has an inner `Promise.all` (see 2.2)
2. `getOrCreateConversationState(userId)`
3. `getRealityLensGate(userId)`
4. `getActiveMode(userId)`
5. Anonymous Supabase count query on `document_repository`

These are properly parallelized. **No issue here for most users.**

#### 2.2 Context Builder Inner Promise.all (context-builder.ts:407-411)

`buildFounderContextWithFacts` runs its own inner `Promise.all`:
```typescript
const [profile, facts, isFirstConversation, progressContext] = await Promise.all([
  loadFounderProfile(userId),         // Supabase: profiles table SELECT
  loadSemanticFacts(userId, ...),     // Supabase: fred_semantic_memory SELECT *
  checkIsFirstConversation(userId),   // Supabase: fred_conversation_state SELECT id
  loadProgressContext(userId),        // Supabase: fred_conversation_state SELECT (via buildProgressContext)
]);
```

**Issue:** `checkIsFirstConversation` and `loadProgressContext` both hit `fred_conversation_state` in parallel. This means 2 reads of the same table in the same request — `getOrCreateConversationState` from the outer `Promise.all` ALSO reads this table. So `fred_conversation_state` is queried **3 times** in total before the machine starts. Only one of them (`getOrCreateConversationState`) uses an upsert; the other two are read-only.

#### 2.3 Sequential `getGateRedirectCount` After Promise.all (CRITICAL PATH)

At `route.ts:372`:
```typescript
const redirectCount = await getGateRedirectCount(userId, downstreamRequest);
```

This is inside an `if (downstreamRequest)` block that runs AFTER the main `Promise.all`. Looking at `conversation-state.ts:906`:
```typescript
export async function getGateRedirectCount(userId, downstreamRequest) {
  const { modeContext } = await getActiveMode(userId); // <-- 4th DB call to this table
  ...
}
```

`getActiveMode` makes a DB query to `fred_conversation_state`. But `getActiveMode` was ALREADY called in the outer `Promise.all` (step 4 above) and its result stored in `persistedModeResult`. The `getGateRedirectCount` function ignores the cached result and makes a fresh DB call.

**This is a sequential DB call that happens after the parallel block completes**, adding 30–100ms for any user whose message triggers a downstream request detection.

**Fix:** Pass `persistedModeResult.modeContext` into `getGateRedirectCount` instead of re-querying.

#### 2.4 Investor-Readiness Path: Sequential Dynamic Import + DB (route.ts:433-463)

When `activeMode === "investor-readiness"`:
```typescript
const { getLatestIRS } = await import("@/lib/fred/irs/db");        // dynamic import
const supabaseService = createServiceClient();
const latestIRS = await getLatestIRS(supabaseService, userId);    // DB query
```

This block runs **after** the `Promise.all` completes, sequentially. The `getLatestIRS` query hits a separate `irs_scores` table. For investor-readiness users, this adds an extra round-trip before the machine can start.

**Fix:** Add `getLatestIRS` to the outer `Promise.all` for investor-readiness users, or restructure the block to overlap with other work.

#### 2.5 `getAllUserFacts` — No LIMIT Clause (fred-memory.ts:456-461)

```typescript
const { data, error } = await supabase
  .from("fred_semantic_memory")
  .select("*")
  .eq("user_id", userId)
  .order("category")
  .order("updated_at", { ascending: false });
```

No LIMIT is applied. As a user's fact history grows, this query returns more and more rows. The in-process cache (`factsCache`) has a 5s TTL, which helps within a single request but not across requests. For power users, this could fetch hundreds of rows.

**Fix:** Add `.limit(100)` or tier-appropriate limits (Free: 20, Pro: 50, Studio: 100).

#### 2.6 `fred_conversation_state` Triple-Read Pattern

As identified in 2.2:
- Outer `Promise.all`: `getOrCreateConversationState` (upsert + SELECT)
- Inner (via `buildFounderContextWithFacts`): `checkIsFirstConversation` (SELECT id only)
- Inner (via `buildFounderContextWithFacts`): `loadProgressContext` → `buildProgressContext` (SELECT fields)

Plus `getGateRedirectCount` if triggered = **4th read**.

**Fix:** Pass the already-loaded `conversationStateResult` into `buildFounderContextWithFacts` instead of re-querying. The `checkIsFirstConversation` could check if the result was null (meaning no state exists). The `loadProgressContext` could accept the pre-loaded state.

#### 2.7 `loadMemoryActor` — Deduplication Partially Works

The `preloadedFacts` optimization is correctly implemented: `route.ts:345-349` extracts facts from `buildFounderContextWithFacts` and passes them to `createFredService` → machine → `loadMemoryActor`. In `load-memory.ts:84-86`:
```typescript
preloadedFacts
  ? Promise.resolve(preloadedFacts)
  : getAllUserFacts(userId).then(...)
```

**This deduplication works correctly for facts.** However, `loadMemoryActor` still independently queries `retrieveRecentEpisodes` and `getRecentDecisions` — these are not in the pre-machine `Promise.all`, so they add latency inside the machine's `loading_memory` state.

#### 2.8 Total Pre-Machine DB Round-Trips

For a Pro+ user in investor-readiness mode with a downstream request:
1. `requireAuth()` — auth check
2. `getUserTier()` — profiles/subscription query
3. `checkRateLimitForUser()` — rate limit DB
4. Outer `Promise.all` (runs in parallel): 5 Supabase queries
5. `getGateRedirectCount` (sequential): 1 Supabase query
6. `getLatestIRS` (sequential): 1 Supabase query

**= 9+ DB round-trips before the XState machine starts**

Inside the machine (`loading_memory` state):
7. `retrieveRecentEpisodes` — 1 Supabase query
8. `getRecentDecisions` — 1 Supabase query
9. `generateEmbedding` — 1 AI call (Pro+ with embedding enabled)
10. `searchEpisodesByEmbedding` — 1 Supabase RPC (if embedding succeeds)
11. `searchFactsByEmbedding` — 1 Supabase RPC (if embedding succeeds)

**= 14+ operations (9 DB + 3 AI round-trips or DB RPCs) before validateInput runs**

---

## Hypothesis 3 — Streaming Path Blocking & Timeout Risk

### Findings

#### 3.1 No `maxDuration` Export — CRITICAL Timeout Risk

The chat route at `app/api/fred/chat/route.ts` has **no `export const maxDuration` segment config**. The file exports only:
```typescript
export const POST = withLogging(handlePost as ...);
```

Neither `vercel.json` nor `next.config.mjs` set a per-route `maxDuration`. Without this export, the route uses Vercel's platform default:
- **Hobby plan: 10 seconds** (hard limit, cannot be configured)
- **Pro plan: 60 seconds default** (configurable up to 900s with `maxDuration`)
- **Enterprise: configurable**

Given the analysis above (up to 14+ operations before a response streams), a Hobby plan user will consistently timeout. Even Pro plan users hitting the full pipeline (9+ DB round-trips + 2 AI calls) can approach 10–15 seconds total.

**Fix (immediate):**
```typescript
// app/api/fred/chat/route.ts (add after imports)
export const maxDuration = 60; // seconds — requires Pro/Enterprise Vercel plan
```

For Hobby plans, the architecture must be fundamentally rethought to fit within 10s.

#### 3.2 `storeEpisode` Awaited Before `processStream` Starts (Blocking)

In `route.ts:656-665` (streaming path):
```typescript
if (shouldPersistMemory) {
  try {
    await storeEpisode(userId, effectiveSessionId, "conversation", {  // <-- AWAITED
      role: "user",
      content: message,
      context,
    });
  } catch (error) {
    console.warn("[FRED Chat] Failed to store user message:", error);
  }
}
```

This `await storeEpisode` runs inside the background async IIFE but **before** `fredService.processStream()` is called. It blocks the machine from starting while the user message is written to `fred_episodic_memory`.

This is unnecessary because the streaming `connected` event was already sent to the client, so the user sees the connection. But the actual `state` events (showing FRED is processing) are delayed by this DB write.

**Fix:** Move this to fire-and-forget, or make it part of a post-response step.
```typescript
// Before processStream — fire and forget
if (shouldPersistMemory) {
  storeEpisode(userId, effectiveSessionId, "conversation", {
    role: "user", content: message, context,
  }).catch(err => console.warn("[FRED Chat] Failed to store user message:", err));
}
// Start processStream immediately
for await (const update of fredService.processStream({ message, ... })) {
```

**Estimated savings: 50–200ms per Pro+ message.**

#### 3.3 `processStream` Polling and 50ms Fallback

In `lib/fred/service.ts:229-235`, the `processStream` loop uses:
```typescript
await Promise.race([
  completionPromise,
  new Promise<void>((resolve) => { resolveStateChange = resolve; }),
  new Promise((resolve) => setTimeout(resolve, 50)), // safety fallback
]);
```

The design is event-driven first (state change subscription fires `resolveStateChange`). The 50ms timeout is a safety fallback for cases where no state change event fires. In practice, XState fires synchronous state changes, so the `resolveStateChange` callback should fire almost immediately for transitions. The 50ms fallback only matters for states that are awaiting async operations (e.g., between `loading_memory` start and the DB results).

**This is acceptable design** but means each actor invocation that takes >50ms will fire at least one polling tick. With 5 actors, the maximum polling overhead is ~250ms.

#### 3.4 IRS Dynamic Import in Streaming Path

At `route.ts:435-437` (which runs in the synchronous pre-machine setup):
```typescript
const { getLatestIRS } = await import("@/lib/fred/irs/db");
const supabaseService = createServiceClient();
const latestIRS = await getLatestIRS(supabaseService, userId);
```

This dynamic import runs BEFORE the streaming response starts (it's in the synchronous `handlePost` body, not inside the background IIFE). The dynamic `import()` itself is fast (module is cached after first use), but the `await getLatestIRS` is a blocking DB call that holds up the SSE stream from being returned to the client.

**Note:** For non-investor-readiness users this block is skipped entirely. But for investor-readiness users, this adds a sequential DB call before the SSE stream headers are even sent.

**Fix:** Move `getLatestIRS` into the outer `Promise.all`, guarded by mode check. Or make the entire investor-readiness block fire-and-forget after returning the stream.

#### 3.5 Streaming Start Time vs. SSE Return

The architecture correctly:
1. Creates `createSSEStream()` immediately
2. Returns the `Response(sseStream)` at line 827
3. Runs all machine processing in a background IIFE (line 646)

However, the **pre-machine setup** (everything before the streaming response is returned) includes all the sequential DB calls and dynamic imports identified above. The SSE response is not returned until `handlePost` reaches line 827 — which means the client sees no response until all pre-machine setup completes.

For investor-readiness users: client waits through 6+ sequential DB calls before receiving even the `connected` SSE event.

#### 3.6 60-Second Machine Timeout (service.ts:181)

```typescript
const streamTimeout = 60_000; // 60s safety net
```

This is the internal machine timeout. It is appropriate. However, if Vercel's function timeout is 10s (Hobby) or the route lacks `maxDuration`, this timeout is meaningless — Vercel will kill the function first.

#### 3.7 `processStream` as Async Generator vs. True Streaming

The SSE implementation streams **state events** (machine state names + partial context) but not **token-by-token LLM output**. The final response text is sent as a single `response` event after the machine completes. This means users see:
1. `connected` event (immediate, but delayed by pre-machine setup)
2. `state: loading_memory` event
3. `analysis` event (after validateInput completes)
4. `models` event (after mental_models completes)
5. `synthesis` event (after synthesis completes)
6. `response` event with full content (after decide+execute)

Users do **not** see the LLM tokens stream in real time. The full LLM response (1024 tokens max) is buffered before being sent. This exacerbates the perceived latency — users wait the full LLM generation time before seeing any text.

**Fix:** Switch `generateWithLLM` in `decide.ts` to use streaming generation from the AI SDK and pipe tokens through SSE `token` events. The `generate()` function from `lib/ai/fred-client.ts` would need to be replaced with `streamText()`.

---

## Recommended Fix Order (Quick Wins First)

### Immediate (< 1 day)

**FIX-1: Add `maxDuration` export to the chat route**
```typescript
// app/api/fred/chat/route.ts — add after imports
export const maxDuration = 60;
```
Prevents Vercel Hobby timeouts immediately. Zero risk.
**Impact: Eliminates timeout failures on Pro plan. Does not help Hobby plan.**

**FIX-2: Disable AI scoring by default**
```typescript
// lib/fred/scoring/types.ts
useAIScoring: false,  // was true
```
Eliminates the hidden second AI call for `decision_request` intents.
**Impact: -800ms to -2s per decision_request.**

**FIX-3: Make `storeEpisode` (user message) fire-and-forget in streaming path**
```typescript
// route.ts ~line 656 — change await to fire-and-forget
if (shouldPersistMemory) {
  storeEpisode(...).catch(err => console.warn(...));
}
// Then immediately start processStream
```
**Impact: -50ms to -200ms per Pro+ streaming message.**

### Short Term (1-3 days)

**FIX-4: Fix `getGateRedirectCount` to use cached `persistedModeResult`**

`getGateRedirectCount` calls `getActiveMode` internally. Add an overload or alternative that accepts a pre-loaded `modeContext`:
```typescript
// route.ts ~line 370-374
if (downstreamRequest) {
  const gateStatus = checkGateStatus(rlGateResult, downstreamRequest);
  if (!gateStatus.gateOpen) {
    // Use the already-loaded persistedModeResult instead of a fresh DB call
    const counts = persistedModeResult?.modeContext?.gateRedirectCounts ?? {};
    const redirectCount = counts[downstreamRequest] ?? 0;
    rlGateBlock = buildRealityLensGateBlock(..., redirectCount);
  }
}
```
**Impact: -30ms to -100ms per message with downstream request detection.**

**FIX-5: Add `getLatestIRS` to the outer `Promise.all` for investor-readiness users**

Move IRS loading into the parallel block:
```typescript
// route.ts — add to Promise.all or run pre-detection
const irsPromise = /* check mode first, then */ getLatestIRS(supabaseService, userId);
// Include in Promise.all or run in parallel with mode check
```
**Impact: -50ms to -200ms for investor-readiness users.**

**FIX-6: Add LIMIT to `getAllUserFacts` query**
```typescript
// lib/db/fred-memory.ts ~line 456
.select("*")
.eq("user_id", userId)
.order("category")
.order("updated_at", { ascending: false })
.limit(100)  // add this
```
**Impact: Prevents query growth for power users. Currently the 5s cache mitigates this within a session.**

### Medium Term (1-2 weeks)

**FIX-7: Reduce `fred_conversation_state` reads from 3-4 to 1**

Pass the `conversationStateResult` from the outer `Promise.all` into `buildFounderContextWithFacts`:
```typescript
// context-builder.ts: add parameter
export async function buildFounderContextWithFacts(
  userId: string,
  hasPersistentMemory: boolean,
  conversationState?: ConversationState | null  // add this
): Promise<{ context: string; facts: [] }>
```
Then skip `checkIsFirstConversation` (check if state is null instead) and pass the state to `loadProgressContext`.
**Impact: -2 DB round-trips per message (~60–200ms combined).**

**FIX-8: Stream LLM tokens through SSE**

Replace `generate()` in `decide.ts:296` with `streamText()` from the AI SDK. Pipe tokens through SSE `token` events in the streaming path:
```typescript
// route.ts streaming section
send("token", { text: tokenChunk });
```
This makes FRED's response feel instantaneous to users — they see text appearing token by token rather than waiting for the full response.
**Perceived latency impact: Major UX improvement. Does not reduce actual latency but makes it invisible.**

**FIX-9: Parallelize `retrieveRecentEpisodes` + `getRecentDecisions` with pre-machine setup**

Currently these run inside the machine's `loading_memory` state, after the pre-machine `Promise.all`. They could be pre-fetched in the outer `Promise.all` and passed as `preloadedEpisodes` + `preloadedDecisions` to the machine (similar to the existing `preloadedFacts` pattern).
**Impact: -50ms to -200ms (hides memory loading latency behind pre-machine setup).**

---

## Latency Budget Analysis

For a **Pro+ user**, **decision_request** intent, **investor-readiness** mode:

| Phase | Operations | Est. Latency |
|-------|-----------|--------------|
| Auth + rate limit | 2-3 DB calls (sequential) | 40–120ms |
| Outer Promise.all | 5 DB calls (parallel) | 50–200ms |
| getGateRedirectCount | 1 DB call (sequential) | 30–100ms |
| IRS block | dynamic import + 1 DB call (sequential) | 50–200ms |
| storeEpisode (user msg) | 1 DB call (sequential, BLOCKS stream) | 50–200ms |
| Machine: loading_memory | 2 DB + 1 AI embed + 2 DB RPC | 200–800ms |
| Machine: intake (validateInput) | pure computation | 1–5ms |
| Machine: mental_models | 4x pure computation in parallel | 1–5ms |
| Machine: synthesis | AI call (scoring, gpt-4o) | 800ms–2s |
| Machine: decide | AI call (main response, gpt-4o) | 600ms–2.5s |
| Machine: execute | fire-and-forget (non-blocking) | 0ms |
| **TOTAL** | | **1.8s–8.1s** |

For **Hobby plan users** this nearly always exceeds the 10s limit in worst case.

After applying FIX-1 through FIX-6:

| Phase | Savings | New Est. |
|-------|---------|----------|
| storeEpisode (fire-and-forget) | -100ms | 0ms (hidden) |
| getGateRedirectCount (cached) | -60ms | ~0ms |
| IRS block (parallelized) | -100ms | ~0ms |
| AI scoring disabled | -1.2s avg | 0ms |
| **New Total** | ~-1.5s | **0.3s–6.6s** |

The remaining latency is dominated by the main LLM call (decide actor) and embedding generation in loading_memory.

---

## Missing Configuration

- **No `export const maxDuration`** in `app/api/fred/chat/route.ts`
- **No `functions` key in `vercel.json`** — no per-route timeout configuration
- **No `maxDuration` in `next.config.mjs`** — only security headers and redirects configured
- The scoring engine uses `DEFAULT_SCORING_CONFIG.useAIScoring` which is set to `true` (value confirmed at `scoring/types.ts:395–403`)

---

## Code Location Reference

| Issue | File | Line(s) |
|-------|------|---------|
| No maxDuration export | `app/api/fred/chat/route.ts` | EOF (missing) |
| Main Promise.all | `app/api/fred/chat/route.ts` | 313–344 |
| Sequential getGateRedirectCount | `app/api/fred/chat/route.ts` | 372 |
| Sequential IRS block | `app/api/fred/chat/route.ts` | 433–463 |
| storeEpisode blocking stream | `app/api/fred/chat/route.ts` | 656–665 |
| Fast-path for greeting/feedback | `lib/fred/machine.ts` | 481–488 |
| 60s machine timeout | `lib/fred/service.ts` | 181 |
| 50ms polling fallback | `lib/fred/service.ts` | 229–235 |
| AI scoring triggered | `lib/fred/actors/synthesize.ts` | 115–124 |
| Main LLM call (decide) | `lib/fred/actors/decide.ts` | 295–303 |
| LLM called for question intent | `lib/fred/actors/decide.ts` | 349–357 |
| getAllUserFacts no LIMIT | `lib/db/fred-memory.ts` | 456–461 |
| getGateRedirectCount re-queries | `lib/db/conversation-state.ts` | 906 |
| Scoring AI model (gpt-4o) | `lib/fred/scoring/types.ts` | 403 |
| Embedding generation (Pro+) | `lib/fred/actors/load-memory.ts` | 65–76 |
| Triple fred_conversation_state reads | `lib/fred/context-builder.ts` | 407–411 |
