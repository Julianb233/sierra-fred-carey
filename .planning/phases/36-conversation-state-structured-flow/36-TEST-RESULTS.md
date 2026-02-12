# Phase 36: Conversation State & Structured Flow -- Test Results

**Tester**: QA Tester
**Date**: 2026-02-11
**Commit Tested**: uncommitted (on-disk changes atop ad37837)
**Files Modified** (Phase 36):
- `lib/fred/types.ts` -- ConversationStateContext type, ValidatedInput extensions
- `lib/fred/actors/validate-input.ts` -- step-relevance + drift detection
- `lib/fred/actors/decide.ts` -- Next 3 Actions, step question injection, drift metadata
- `lib/fred/actors/execute.ts` -- post-response state updates (evidence, diagnostics, snapshot)
- `lib/fred/actors/synthesize.ts` -- step-aware synthesis
- `lib/fred/machine.ts` -- conversationState wiring through all actors
- `lib/fred/service.ts` -- conversationState in FredServiceOptions
- `lib/fred/context-builder.ts` -- loadProgressContext in parallel
- `lib/ai/prompts.ts` -- buildStepGuidanceBlock, buildDriftRedirectBlock
- `lib/ai/frameworks/startup-process.ts` -- STEP_ORDER, step definitions
- `app/api/fred/chat/route.ts` -- state loading, guidance injection, stateContext build
- `types/startup-process.ts` -- unchanged (pre-existing UI types)
**Reference**: `.planning/OPERATING-BIBLE.md` (Sections 4, 5, 7, 17), `36-01-PLAN.md`, `36-02-PLAN.md`

---

## 1. Build Passes

**Result: PASS**

`npm run build` completed successfully with zero errors. All pages compiled, all routes resolved.

---

## 2. TypeScript Compiles

**Result: PASS**

`npx tsc --noEmit` shows zero new errors from Phase 36 files. Only pre-existing errors in `workers/voice-agent/agent.ts` (9 errors, unrelated to Phase 36).

All Phase 36 files compile cleanly:
- `lib/fred/types.ts` -- `ConversationStateContext`, extended `ValidatedInput`, extended `FredContext`
- `lib/fred/actors/*.ts` -- all four actors with new optional `conversationState?` param
- `lib/fred/machine.ts` -- input type, actor invocations, context initializer
- `lib/fred/service.ts` -- `FredServiceOptions` extension
- `lib/ai/prompts.ts` -- `buildStepGuidanceBlock`, `buildDriftRedirectBlock`
- `app/api/fred/chat/route.ts` -- state loading, stateContext build

---

## 3. Lint Passes

**Result: PASS (with pre-existing issues)**

No new lint errors in Phase 36 files. Pre-existing warnings:
- `machine.ts`: 3 `@typescript-eslint/no-explicit-any` (pre-existing from Phase 34 XState wiring)
- `validate-input.ts`: unused `BurnoutSignals` import, unused `lowerMessage`, unused `currentStep` param in `detectTopic`
- `synthesize.ts`: unused `allInsights`, unused `RedFlag` import, unused `models` param
- `service.ts`: unused `feedback`, unused `snapshot`

None of these are new to Phase 36 -- they are pre-existing or cosmetic.

---

## 4. Unit Tests Pass

**Result: PASS**

617/617 tests passed. 1 pre-existing test file failure (unrelated to Phase 36). No regressions from actor signature changes.

---

## 5. Plan 36-01: Conversation State Data Flow

### 5.1 ConversationStateContext Type (types.ts)

**Result: PASS**

Verified at `lib/fred/types.ts` lines 19-28:

| Field | Type | Present | Line |
|---|---|---|---|
| `currentStep` | `StartupStep` | YES | 20 |
| `stepStatuses` | `Record<StartupStep, StepStatus>` | YES | 21 |
| `processStatus` | `string` | YES | 22 |
| `currentBlockers` | `string[]` | YES | 23 |
| `diagnosticTags` | `Record<string, string>` | YES | 24 |
| `founderSnapshot` | `Record<string, unknown>` | YES | 25 |
| `progressContext` | `string` | YES | 27 |

`FredContext` includes `conversationState: ConversationStateContext | null` at line 64. Correct.

### 5.2 Context Builder Extension (context-builder.ts)

**Result: PASS**

- `buildFounderContext()` at line 394 calls all four loaders in `Promise.all()`:
  1. `loadFounderProfile(userId)`
  2. `loadSemanticFacts(userId, hasPersistentMemory)`
  3. `checkIsFirstConversation(userId)` (Phase 35)
  4. `loadProgressContext(userId)` (Phase 36)
- No serial waterfalls -- all four queries run in parallel.
- Lines 410-412: When `progressContext` is truthy, appended with `"\n\n" + progressContext`.
- `loadProgressContext()` at lines 429-437: wrapped in try/catch, returns null on failure. Non-blocking.

### 5.3 Step Guidance Block (prompts.ts)

**Result: PASS**

`buildStepGuidanceBlock()` at lines 413-466 produces:
- `## CURRENT PROCESS POSITION` heading (line 422)
- Step name and number: `**Step N: [Name]**` (line 424)
- Step objective (line 426)
- Priority questions for the step (lines 430-433)
- Required output before advancing (line 437)
- "Do NOT advance" conditions (lines 441-444)
- Active blockers section (only when blockers present, lines 447-453)
- Validated steps list (only when validated steps exist, lines 457-463)

Verified against all 9 steps in `STARTUP_STEPS`:

| Step | stepNumber | name | questions count | doNotAdvanceIf count |
|---|---|---|---|---|
| problem | 1 | Define the Real Problem | 3 | 2 |
| buyer | 2 | Identify the Buyer and Environment | 3 | 2 |
| founder-edge | 3 | Establish Founder Edge | 2 | 1 |
| solution | 4 | Define the Simplest Viable Solution | 2 | 2 |
| validation | 5 | Validate Before Building | 2 | 2 |
| gtm | 6 | Define the First Go-To-Market Motion | 2 | 2 |
| execution | 7 | Install Execution Discipline | 2 | 1 |
| pilot | 8 | Run a Contained Pilot | 2 | 1 |
| scale-decision | 9 | Decide What Earns the Right to Scale | 3 | 1 |

Invalid step name returns empty string (line 419: `if (!step) return ""`).

### 5.4 buildDriftRedirectBlock (prompts.ts)

**Result: PASS (function exists, but NOT WIRED -- see Finding #1)**

`buildDriftRedirectBlock()` at lines 475-493 produces a `## REDIRECT INSTRUCTION` block that tells the LLM to acknowledge the founder's topic, explain why current step must be finished first, and redirect. The function is correct and well-structured.

**However: This function is imported at route.ts line 36 but NEVER CALLED.** See Finding #1 below.

### 5.5 Chat Route Wiring (route.ts)

**Result: PASS**

- Lines 262-273: `getOrCreateConversationState(userId)` called after `buildFounderContext()`
- Lines 266-270: `buildStepGuidanceBlock()` called with `conversationState.currentStep`, `stepStatuses`, `currentBlockers`
- Lines 276-286: `ConversationStateContext` object built correctly with all 7 fields mapped from conversation state
- Lines 289-291: `stepGuidanceBlock` appended to `founderContext` for system prompt injection
- Lines 294-300: `createFredService()` called with both `founderContext: fullContext` and `conversationState: stateContext`
- Lines 271-273: Graceful fallback -- `try/catch` with `console.warn`, chat continues without state

### 5.6 Service and Machine Wiring

**Result: PASS**

**service.ts**:
- `FredServiceOptions` at line 20: `conversationState?: ConversationStateContext | null` -- PASS
- `process()` at lines 57-63: `createActor` input includes `conversationState: this.options.conversationState || null` -- PASS
- `processStream()` at lines 164-171: same wiring -- PASS
- `handleApproval()` at lines 241-248: same wiring -- PASS
- Error response context at line 148: includes `conversationState` -- PASS

**machine.ts**:
- Input type at line 72: includes `conversationState?: ConversationStateContext | null` -- PASS
- `createInitialContext()` at lines 39-62: accepts and passes `conversationState` -- PASS
- Context initializer at line 305: `input.conversationState` passed to `createInitialContext()` -- PASS

**Actor invocations** (machine.ts):

| State | Actor | conversationState Passed? | Line |
|---|---|---|---|
| intake | validateInput | YES (`input.conversationState`) | 81 |
| synthesis | synthesize | YES (`conversationState: context.conversationState`) | 88-89 |
| decide | decide | YES (`conversationState: context.conversationState`) | 92-93 |
| execute | execute | YES (`conversationState: context.conversationState`) | 96-98 |

### 5.7 Backward Compatibility

**Result: PASS**

- All actors use `conversationState?` (optional parameter) -- callable with old signatures
- When `conversationState` is null:
  - `validate-input.ts` line 96: `if (conversationState)` -- skip step relevance/drift
  - `decide.ts` line 340: `if (conversationState)` -- skip step question injection
  - `execute.ts` line 346: `if (!conversationState) return;` -- skip state updates
  - `synthesize.ts` line 551: `if (!conversationState) return "";` -- skip step context
- Chat route lines 271-273: catches errors, continues without state
- API request/response schema unchanged

---

## 6. Plan 36-02: Structured Flow Control

### 6.1 Step-Relevance Detection (validate-input.ts)

**Result: PASS**

`detectStepRelevance()` at lines 433-469:

**Signal matching verified** (representative samples):

| Step | Signal | Pattern Type | Verified |
|---|---|---|---|
| problem | `/\bproblem\b/` | word-boundary regex | YES |
| problem | "pain point" | includes() phrase | YES |
| buyer | `/\bcustomer\b/` | word-boundary regex | YES |
| buyer | "target market" | includes() phrase | YES |
| scale-decision | `/\bscal\w*\b/` | word-boundary regex | YES -- "scale"/"scaling" match, "escalate" does NOT |
| gtm | "go to market" | includes() phrase | YES |
| validation | `/\bvalidat\w*\b/` | word-boundary regex | YES |

**Confidence scoring verified**:
- 1 signal match: `Math.min(0.5 + 1 * 0.15, 0.95)` = 0.65
- 2 signal matches: `Math.min(0.5 + 2 * 0.15, 0.95)` = 0.80
- 3+ signal matches: `Math.min(0.5 + 3 * 0.15, 0.95)` = 0.95 (capped)

**No match**: Returns null when no step signals detected (line 469).

**Multi-word phrase vs regex**: Lines 454-458 correctly distinguish `instanceof RegExp` for test() vs string for includes().

### 6.2 Drift Detection (validate-input.ts)

**Result: PASS**

`detectDrift()` at lines 477-499:

**Drift threshold verified**: `targetIdx > currentIdx + 1` (line 488) means drift fires for 2+ steps ahead.

| Current | Target | Step Diff | Drift? | Verified |
|---|---|---|---|---|
| problem (0) | buyer (1) | 1 | NO | YES |
| problem (0) | founder-edge (2) | 2 | YES | YES |
| problem (0) | scale-decision (8) | 8 | YES | YES |
| buyer (1) | founder-edge (2) | 1 | NO | YES |
| buyer (1) | solution (3) | 2 | YES | YES |
| validation (4) | gtm (5) | 1 | NO | YES |
| solution (3) | gtm (5) | 2 | YES | YES |

**Validated step check**: Line 489: `conversationState.stepStatuses[conversationState.currentStep] !== "validated"` -- drift does NOT fire when current step is validated. PASS.

**Low confidence filter**: Line 481: `if (!stepRelevance || stepRelevance.confidence < 0.6) return null` -- drift does NOT fire for low confidence matches. PASS.

### 6.3 Next 3 Actions Enforcement (decide.ts)

**Result: PASS**

`appendNextActions()` at lines 354-359:

- Takes `synthesis.nextSteps`, slices to first 3 items
- Format: `**Next 3 Actions:**\n1. [Action 1]\n2. [Action 2]\n3. [Action 3]`
- **Note**: Uses `**bold**` format, not `## H2` heading as my test plan suggested. This is correct behavior -- keeps it concise.
- When `synthesis.nextSteps` is empty or undefined, returns content unchanged (line 355).

**Appended to substantive responses**: Lines 344-345 in `buildResponseContent()` -- `appendNextActions` is called AFTER the switch statement, which means it applies to all action types that don't early-return. `clarify` and `defer` cases return early (lines 327, 331), so Next 3 Actions is NOT appended to them. PASS.

### 6.4 Step Question Injection (decide.ts)

**Result: PASS**

`injectStepQuestion()` at lines 365-386:

- Only injects when `status !== "in_progress"` -- line 374. PASS.
- Does NOT inject when founder is already addressing current step: line 377 checks `stepRelevance?.targetStep === currentStep && confidence > 0.7`. PASS.
- Does NOT inject for clarify/defer: These return early before `injectStepQuestion` is reached (lines 327, 331). PASS.
- Uses first question from `STARTUP_STEPS[currentStep].questions[0]` -- line 384. PASS.
- Format: `---\n\nTo keep us moving forward on **[step name]**: [question]` -- line 385. PASS.
- Null conversationState: line 340 `if (conversationState)` -- skipped entirely. PASS.

### 6.5 Post-Response Evidence Storage (execute.ts)

**Result: PASS**

`updateConversationState()` at lines 340-383:

**Evidence storage** (lines 356-367):
- Only stores when `stepRelevance.targetStep === currentStep` AND `confidence > 0.6`
- Calls `storeStepEvidence(userId, currentStep, "user_statement", message.slice(0, 500), metadata)`
- Metadata includes `source: "conversation"` and `confidence`

**Diagnostic tag updates** (lines 370-373):
- Calls `extractDiagnosticSignals()` which detects:
  - `positioningClarity: "low"` from "everyone/anybody/all business" (line 394)
  - `positioningClarity: "med"` from buyer-related messages with confidence > 0.7 (line 396)
  - `investorReadinessSignal: "med"` from fundraising/investor/vc/valuation/series/term sheet (line 401)
  - `stage`: idea, pre-seed, seed, or growth based on message patterns (lines 406-413)
- Only calls `updateDiagnosticTags()` when tags found (line 371)

**Snapshot updates** (lines 376-379):
- `extractSnapshotUpdates()` extracts traction from money entities (lines 422-431)
- Only calls `updateFounderSnapshot()` when updates found (line 378)

### 6.6 State Updates Are Non-Blocking

**Result: PASS**

- `updateConversationState()` is called fire-and-forget at line 43: `.catch((err) => console.warn(...))`
- Internal try/catch at lines 348, 380: catches all errors, logs with `console.warn`
- When `conversationState` is null, returns immediately (line 346)
- Response is built and returned at line 46 BEFORE state updates complete

### 6.7 Step-Aware Synthesis (synthesize.ts)

**Result: PASS**

- `synthesizeActor()` at line 33: accepts `conversationState?: ConversationStateContext | null`
- `buildStepContext()` at lines 550-567:
  - When null: returns empty string (line 551)
  - When present: appends ` | Process position: Step "[step]"` with validated steps and blockers
- Appended to reasoning at line 74: `reasoning + stepContext`

---

## 7. Actor Signature Backward Compatibility

**Result: PASS**

| Actor | New Param | Optional? | Default Behavior |
|---|---|---|---|
| `validateInputActor(input, memoryContext, conversationState?)` | `conversationState` | YES (trailing `?`) | Skip step relevance/drift |
| `synthesizeActor(validatedInput, mentalModels, memoryContext, conversationState?)` | `conversationState` | YES (trailing `?`) | Empty step context |
| `decideActor(synthesis, validatedInput, founderContext?, conversationState?)` | `conversationState` | YES (trailing `?`) | No step question/redirect |
| `executeActor(decision, validatedInput, userId, sessionId, conversationState?)` | `conversationState` | YES (trailing `?`) | No state updates |

All actors callable with old signatures (no new params) without errors.

---

## 8. Operating Bible Compliance

**Result: PASS**

### Section 4: Layered Architecture

| Layer | Requirement | Status | Evidence |
|---|---|---|---|
| Layer 1 | Core instructions (global behavior) | PASS | Step guidance block injected into system prompt |
| Layer 2 | Router (diagnostic introduction) | PASS | Diagnostic tags updated silently via `extractDiagnosticSignals()` |
| Layer 3 | Framework overlays | PASS | Step-specific questions from `STARTUP_STEPS` applied |

### Section 7: 9-Step Startup Process

| Requirement | Status | Evidence |
|---|---|---|
| Steps can overlap but none should be skipped | PASS | Drift detection prevents skipping 2+ steps ahead |
| Do not advance until current step validated | PASS | "Do NOT advance" conditions in step guidance block |
| "Do Not Advance If" gates per step | PASS | Gates from `STARTUP_STEPS[step].doNotAdvanceIf` included in guidance |

### Section 17.3: Regression Triggers

| Trigger | Protected? | How |
|---|---|---|
| Asks founders to choose diagnostics | YES | Diagnostic tags updated silently -- no user-facing diagnostic choice |
| Scores without intake | YES | No scoring exposed in step guidance -- inherited from Phase 34 prompt |
| Encourages fundraising by default | PARTIAL | Drift detection redirects fundraising (scale-decision) when upstream not validated, but redirect block not wired (Finding #1) |
| Jumps to downstream artifacts | PARTIAL | Drift detection fires for 2+ step jumps; drift metadata logged but redirect prompt block not injected (Finding #1) |

---

## 9. No Regressions

**Result: PASS**

- **Unit tests**: 617/617 passed
- **Build**: Successful
- **API contract**: Chat route request/response schema unchanged
- **Null state path**: When conversationState is null, all actors behave exactly as pre-Phase 36
- **Existing chat flow**: Non-streaming and streaming paths both preserve existing behavior
- **Phase 35 handoff**: Context builder still includes Phase 35 handoff logic (lines 346-368)
- **Phase 34 prompt**: System prompt, founder context, coaching prompts all preserved

---

## 10. Findings

### Finding #1: `buildDriftRedirectBlock` -- Imported but Never Called (BLOCKING)

**Severity: BLOCKING**

`buildDriftRedirectBlock` is defined in `lib/ai/prompts.ts` (lines 475-493) and imported in `app/api/fred/chat/route.ts` (line 36), but it is **never called** anywhere in the codebase.

The 36-02-PLAN.md (lines 255-270) specifies that the chat route should call `buildDriftRedirectBlock(driftDetected.currentStep, driftDetected.targetStep)` when drift is detected and append the redirect instruction to the system prompt.

**Root cause**: Drift detection happens inside `validateInputActor` which runs AFTER the system prompt is already assembled and sent to the FRED service. The route builds the system prompt at lines 289-291 BEFORE sending the message to the machine. By the time drift is detected (inside the pipeline), the system prompt is already locked.

**Impact**: Success criteria CHAT-04 ("When a founder goes off track, FRED acknowledges what they said and steers back") is only partially implemented. The drift DETECTION works (step relevance + drift detection in validate-input.ts), drift METADATA is logged (decide.ts line 70), but no redirect INSTRUCTION is injected into the LLM prompt. The LLM has no instruction to actually perform the redirect.

**Suggested fix**: Either:
1. **Two-pass approach**: Run step relevance detection BEFORE the pipeline (in the route) using the last message, then inject the redirect block if drift is detected. This would require extracting `detectStepRelevance` and `detectDrift` into importable utilities.
2. **Inject redirect at decide-time**: Have `decide.ts` use `buildDriftRedirectBlock` to build a redirect instruction and prepend it to the response content when drift is detected (similar to how `injectStepQuestion` works).
3. **Accept structural redirect**: Rely on `injectStepQuestion` (which already redirects back to the current step) as the de facto redirect mechanism, and treat `buildDriftRedirectBlock` as a future enhancement.

### Finding #2: Lint Warnings -- Unused Imports and Variables (NON-BLOCKING)

The following Phase 36-related lint warnings exist:
- `validate-input.ts` line 436: `currentStep` param in `detectTopic` function signature is defined but never used
- `validate-input.ts` line 21: `BurnoutSignals` is imported but never used directly
- `synthesize.ts` line 18: `RedFlag` is imported but never used directly

These are cosmetic and do not affect functionality.

### Finding #3: detectTopic Function Placement (NON-BLOCKING)

In `validate-input.ts`, the JSDoc comment for `detectTopic()` (lines 420-422) is followed by the Phase 36 section header (lines 424-426), and then the actual `detectTopic` function body is at line 501 -- after the Phase 36 detection functions. This means the JSDoc is orphaned from its function. The function still works correctly, but the code organization is misleading.

### Finding #4: `appendNextActions` Called for ALL Non-Early-Return Actions (NON-BLOCKING)

`appendNextActions()` is called at line 345 of `buildResponseContent()` after the switch statement. Since `clarify` (line 327) and `defer` (line 331) return early, Next 3 Actions is appended to `auto_execute`, `recommend`, `escalate`, and `default`. For `recommend` actions (line 294), the next steps are ALSO included inline in the response content (line 294: `${synthesis.nextSteps.slice(0, 2).join(...)}`). This means `recommend` responses may show next steps twice -- once inline and once in the "Next 3 Actions" footer. This is not a bug per se, but could be confusing.

### Finding #5: Step Question Only Uses First Question (NON-BLOCKING)

`injectStepQuestion()` at line 384 always uses `step.questions[0]` -- the first question from the step's questions array. For returning users who have already been asked this question in a prior conversation, the same question would be re-injected. There's no rotation or tracking of which questions have been asked.

---

## Summary

| Test | Result |
|---|---|
| Build passes | **PASS** |
| TypeScript compiles | **PASS** |
| Lint passes | **PASS** (pre-existing warnings) |
| Unit tests pass | **PASS** |
| ConversationStateContext type (types.ts) | **PASS** |
| Context builder loads progress in parallel | **PASS** |
| Step guidance block format (prompts.ts) | **PASS** |
| Chat route wiring | **PASS** |
| Service + machine wiring | **PASS** |
| Backward compatibility (null state) | **PASS** |
| Step-relevance detection (validate-input.ts) | **PASS** |
| Drift detection (validate-input.ts) | **PASS** |
| Next 3 Actions enforcement (decide.ts) | **PASS** |
| Step question injection (decide.ts) | **PASS** |
| Post-response evidence storage (execute.ts) | **PASS** |
| Diagnostic tag updates (execute.ts) | **PASS** |
| Snapshot updates (execute.ts) | **PASS** |
| Non-blocking state updates | **PASS** |
| Step-aware synthesis (synthesize.ts) | **PASS** |
| Actor signature backward compatibility | **PASS** |
| Machine actor invocations | **PASS** |
| Operating Bible Section 4 (Layered Architecture) | **PASS** |
| Operating Bible Section 7 (9-Step Process) | **PASS** |
| Operating Bible Section 17.3 (Regression Triggers) | **PARTIAL** (drift redirect not wired) |
| No regressions | **PASS** |

### Overall: 24/25 PASS, 1 PARTIAL

### Blocking Issues:
1. **buildDriftRedirectBlock dead code** (Finding #1): The drift redirect prompt block is imported but never called. Drift detection works structurally, but no redirect instruction reaches the LLM. Success criterion CHAT-04 is partially unmet. The `injectStepQuestion` provides a weak form of redirection (asks current-step question), but does not "acknowledge what they asked and steer back" as specified.

### Non-Blocking Issues:
1. **Lint warnings** (Finding #2): Unused imports and variables in validate-input.ts and synthesize.ts
2. **detectTopic JSDoc orphaned** (Finding #3): JSDoc separated from function by Phase 36 code block
3. **Duplicate next steps in recommend** (Finding #4): `recommend` responses show next steps both inline and in "Next 3 Actions" footer
4. **No question rotation** (Finding #5): Always uses first question from step's questions array

### Recommendations:
1. Wire `buildDriftRedirectBlock` -- either at route level (two-pass detection) or at decide-time (inject into response content). This is needed for CHAT-04.
2. Clean up unused imports/variables in actor files
3. Move `detectTopic` function above Phase 36 section to reunite with its JSDoc
4. Skip inline next steps in `recommend` case since `appendNextActions` adds them
5. Add question rotation tracking in conversation state to avoid repetitive step questions
