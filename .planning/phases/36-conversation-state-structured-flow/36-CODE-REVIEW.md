# Phase 36: Conversation State & Structured Flow -- CODE REVIEW

**Reviewer:** reviewer (agent2)
**Date:** 2026-02-11
**Status:** Uncommitted working-tree changes (Tasks #20, #22 completed; commit pending)

**Files changed:** 10 files across two sub-phases

| Sub-phase | File | Change Summary |
|-----------|------|----------------|
| 36-01 | `lib/fred/types.ts` | +`ConversationStateContext` type, extend `FredContext` and `ValidatedInput` |
| 36-01 | `lib/ai/prompts.ts` | +`buildStepGuidanceBlock()`, +`buildDriftRedirectBlock()` |
| 36-01 | `lib/fred/context-builder.ts` | +`loadProgressContext()`, append to `buildFounderContext` |
| 36-01 | `app/api/fred/chat/route.ts` | Load conversation state, build guidance, wire to service |
| 36-01 | `lib/fred/service.ts` | Thread `conversationState` through 3 actor creation paths |
| 36-01 | `lib/fred/machine.ts` | Extend types, actors, context init, all 4 invoke blocks |
| 36-02 | `lib/fred/actors/validate-input.ts` | +`detectStepRelevance()`, +`detectDrift()` |
| 36-02 | `lib/fred/actors/decide.ts` | +`appendNextActions()`, +`injectStepQuestion()`, refactored `buildResponseContent()` |
| 36-02 | `lib/fred/actors/execute.ts` | +`updateConversationState()`, +`extractDiagnosticSignals()`, +`extractSnapshotUpdates()` |
| 36-02 | `lib/fred/actors/synthesize.ts` | +`buildStepContext()` appended to reasoning chain |

**Also included in working tree:** Task #25 sanitization fix (6 fields in `context-builder.ts`)

---

## OVERALL ASSESSMENT: APPROVED (with 1 WARNING, 4 NOTEs)

Phase 36 delivers a solid end-to-end integration of conversation state into the FRED pipeline. The data flow is clean: state loads in the chat route, threads through the XState machine to all 4 actors (validate, synthesize, decide, execute), and writes back post-response. The behavioral layer (step relevance, drift detection, step questions, Next 3 Actions) follows the Operating Bible requirements. TypeScript compiles clean (no Phase 36 type errors).

---

## REVIEW CRITERIA (from team-lead)

### 1. Conversation state integrates cleanly with XState machine?

**PASS** -- `ConversationStateContext` is threaded through every layer:

1. **Chat route** (line 261-300): Loads `getOrCreateConversationState`, builds `ConversationStateContext`, passes to `createFredService`
2. **Service** (`service.ts`): Propagates to machine input in all 3 actor creation paths (process, getInsight, createActor)
3. **Machine** (`machine.ts`): `createInitialContext` accepts and stores it; all 4 invoke blocks pass `context.conversationState`
4. **Actors**: All 4 actor signatures extended with optional `ConversationStateContext` parameter

The entire chain is null-safe: `conversationState` is `ConversationStateContext | null` everywhere, and every consumer handles the null case gracefully. The chat route wraps loading in try/catch with `console.warn` fallback, so a DB failure does not break the chat.

### 2. Gentle redirect in prompt (not code)?

**PARTIAL PASS (WARNING -- see Issue #1)** -- The redirect approach is correctly designed as prompt-driven. `buildDriftRedirectBlock()` in `prompts.ts` generates an LLM instruction ("Acknowledge what they asked about... Explain why you need to finish the current step first... Redirect to a specific question"). Detection is structural in `validate-input.ts`. This matches the Operating Bible's layered architecture.

However, **the redirect block is never wired**. `buildDriftRedirectBlock` is imported but never called. See Issue #1 for details.

### 3. 9-Step Process drives FRED's questions logically?

**PASS** -- Three mechanisms work together:

1. **Step Guidance Block** (`buildStepGuidanceBlock` in `prompts.ts`): Injected into system prompt with the current step's objective, priority questions, required output, do-not-advance conditions, and active blockers. This is the primary driver.

2. **Step Question Injection** (`injectStepQuestion` in `decide.ts`): Appends a follow-up question for the current step to every substantive response -- but only when the step is `in_progress` and the founder isn't already answering a step question (confidence > 0.7 check). Smart skip logic.

3. **Next 3 Actions** (`appendNextActions` in `decide.ts`): Appended to every non-clarify/non-defer response. Operating Bible Section 3.3 compliance.

---

## ISSUES

### Issue #1 -- WARNING: `buildDriftRedirectBlock` imported but never called

**Severity:** WARNING (functional gap)
**File:** `app/api/fred/chat/route.ts:36`

```typescript
import { buildStepGuidanceBlock, buildDriftRedirectBlock } from "@/lib/ai/prompts";
```

`buildDriftRedirectBlock` is imported but never invoked. The 36-02 plan (line 258-270) specifies it should be called in the chat route when drift is detected. The problem is **timing**: drift detection runs inside the machine's `validateInput` actor, but the system prompt is assembled BEFORE the machine runs. The chat route cannot know about drift at the point it builds the prompt.

**Resolution options:**
- **Option A (chat route):** Run `detectDrift` separately in the chat route before the machine runs, then inject the redirect block into the system prompt. Duplicates detection logic.
- **Option B (decide actor -- recommended):** When `validatedInput.driftDetected?.isDrift` is true in the `decide` actor, prepend the drift redirect to the response content. The decide actor already has access to `conversationState` and `validatedInput`.

**Impact:** Without this wiring, drift detection populates `validatedInput.driftDetected` but nothing acts on it -- the founder gets no redirect. The metadata records `driftDetected: true` but the response is unchanged. The `buildDriftRedirectBlock` function is dead code.

**Verdict:** Non-blocking for Phase 36 delivery (the step guidance block still anchors FRED to the current step). But this should be wired before Phase 37, which depends on step gating being enforced.

### Issue #2 -- NOTE: Broad step-relevance signals will produce false positives

**Severity:** NOTE (design tradeoff, acceptable for v1)
**File:** `lib/fred/actors/validate-input.ts` (step signals in `detectStepRelevance`)

Several signals are too broad for reliable step mapping:
- `/\buser\b/` matches "buyer" step -- but "user experience" is about product, not buyer definition
- `/\bbuild\b/` matches "solution" step -- but "build a team" is about execution
- `/\btest\b/` matches "validation" step -- but "test the waters" could be anything
- `/\bfocus\b/` matches "execution" step -- but "focus on the problem" is step 1

A sentence like "I'm thinking about testing our build process for users who focus on..." would match 4 different steps. The highest match count wins via `Math.min(0.5 + matchCount * 0.15, 0.95)`, which could be wrong.

**Impact:** Low for now -- step relevance feeds drift detection (2+ step threshold helps filter), evidence storage (0.6 confidence floor), and step question injection (0.7 confidence skip). The downstream consumers have enough guardrails. But signal quality should improve in Phase 37+.

### Issue #3 -- NOTE: Diagnostic signal heuristics have false positive vectors

**Severity:** NOTE (acceptable for v1 silent diagnosis)
**File:** `lib/fred/actors/execute.ts` (`extractDiagnosticSignals`)

- `/thinking about/i` triggers `stage: "idea"` -- but "I'm thinking about hiring" has nothing to do with idea stage
- `/concept/i` triggers `stage: "idea"` -- but "proof of concept" is pre-seed, not idea
- `/series|scale|expand|growing/i` triggers `stage: "growth"` -- but "series of problems" is unrelated
- Money entities stored as `traction` regardless of context ("I need $50K in funding" is not traction)

**Impact:** Diagnostic tags are advisory only (Operating Bible Section 5.2: silent diagnosis during early messages). They don't gate behavior or modify step progression. Wrong tags are correctable in future conversations. The money-to-traction mapping is the most concerning but also low-impact since snapshot updates merge incrementally.

### Issue #4 -- NOTE: Dead import unused in route

**Severity:** NOTE (cleanup)
**File:** `app/api/fred/chat/route.ts:36`

The `buildDriftRedirectBlock` import is unused. TypeScript won't flag this as an error (named imports of types/functions are only flagged by `noUnusedLocals` which is typically off in Next.js projects), but it should be cleaned up. Either wire the function (Issue #1) or remove the import.

### Issue #5 -- NOTE: `recommend` case duplicates Next Steps

**Severity:** NOTE (cosmetic)
**File:** `lib/fred/actors/decide.ts` (`buildResponseContent`, `recommend` case)

The `recommend` case builds its own "Next Steps" section with 2 items:
```typescript
const nextStepsText = synthesis.nextSteps.slice(0, 2).join("\n- ");
content = `...Next Steps:\n- ${nextStepsText}...`;
```

Then `appendNextActions` appends "Next 3 Actions" with 3 items at the end:
```typescript
content += `\n\n**Next 3 Actions:**\n${actions.map(...)}`;
```

This means `recommend` responses show both "Next Steps" (2 items) AND "Next 3 Actions" (3 items) -- likely with overlapping content since both use `synthesis.nextSteps`. Consider removing the inline Next Steps from the `recommend` case.

---

## ARCHITECTURE ANALYSIS

### Data Flow (Phase 36-01)

```
chat/route.ts
  |-- getOrCreateConversationState(userId)    // DB load (race-safe with 23505 retry)
  |-- buildStepGuidanceBlock(step, statuses)  // Prompt fragment
  |-- Construct ConversationStateContext       // Lightweight projection
  |-- Append guidance to founderContext        // System prompt injection
  |-- createFredService({ conversationState }) // Pass to service
       |
       v
service.ts -> machine.ts (input.conversationState)
       |
       v
createInitialContext -> context.conversationState
       |
       +-- intake: validateInput(input, memory, conversationState)
       +-- synthesis: synthesize(input, models, memory, conversationState)
       +-- decide: decide(synthesis, input, founder, conversationState)
       +-- execute: execute(decision, input, userId, session, conversationState)
```

Clean, linear, null-safe throughout. No circular dependencies.

### Behavioral Flow (Phase 36-02)

```
validateInput
  |-- detectStepRelevance(message, keywords, currentStep)
  |-- detectDrift(stepRelevance, conversationState)
  |-- Attach to ValidatedInput: { stepRelevance, driftDetected }
       |
       v
synthesize
  |-- buildStepContext(conversationState) -> appended to reasoning chain
       |
       v
decide
  |-- buildResponseContent(action, synthesis, input, conversationState)
  |     |-- injectStepQuestion(content, state, input)  // if in_progress
  |     |-- appendNextActions(content, synthesis)        // always
  |-- metadata: { driftDetected, currentStep }
       |
       v
execute
  |-- updateConversationState(userId, input, decision, state)  // fire-and-forget
       |-- storeStepEvidence (if step relevance matches current step)
       |-- updateDiagnosticTags (from heuristic signals)
       |-- updateFounderSnapshot (from money entities)
```

### Operating Bible Compliance

| Section | Requirement | Status |
|---------|-------------|--------|
| 3.3 | Every response ends with "Next 3 Actions" | PASS -- `appendNextActions` in decide.ts |
| 4.0 | Layered architecture | PASS -- guidance in prompts.ts (L2), detection in actors (structural) |
| 5.2 | Silent diagnosis during early messages | PASS -- `extractDiagnosticSignals` updates tags without user visibility |
| 7.0 | 9-Step Process drives FRED's questions | PASS -- `buildStepGuidanceBlock` + `injectStepQuestion` |
| 7.0 | Do-not-advance conditions | PASS -- included in step guidance block |
| 7.0 | Gentle redirect on skip attempts | PARTIAL -- detection works, but redirect block not wired (Issue #1) |
| 12.0 | Founder Snapshot updates from conversation | PASS -- `extractSnapshotUpdates` in execute.ts |

### TypeScript Compilation

**PASS** -- `npx tsc --noEmit` produces 0 errors related to Phase 36 changes. The only errors are pre-existing in `workers/voice-agent/agent.ts` (LiveKit SDK type incompatibility).

### Sanitization (Task #25)

**PASS** -- The Phase 35 sanitization gap is fixed in this working tree. All 6 user-controlled profile fields now use `sanitize()`:
- `profile.name` (line 202)
- `stageLabel` (line 206)
- `profile.industry` (line 210)
- `profile.revenueRange` (line 228)
- `profile.fundingHistory` (line 236)
- Challenge labels (line 268)

---

## SUMMARY

Phase 36 is well-implemented. The conversation state integration is architecturally sound -- it threads through every layer without breaking existing behavior, degrades gracefully on failure, and follows the established patterns from Phases 34-35. The behavioral features (step questions, Next 3 Actions, diagnostic signals) match Operating Bible requirements.

The one actionable item is wiring `buildDriftRedirectBlock` (Issue #1). Without it, drift detection is inert -- it records metadata but produces no user-facing change. This should be addressed before Phase 37, which depends on step gating enforcement.

The signal quality issues (Issues #2, #3) are acceptable for v1 and documented for future tuning.

---

*Review complete. No blocking issues found.*
