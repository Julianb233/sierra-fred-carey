# Phase 36: Conversation State & Structured Flow -- Test Plan

**Tester**: QA Tester
**Date Created**: 2026-02-11
**Reference**: `.planning/OPERATING-BIBLE.md` (Sections 4, 5, 7, 17), `.planning/ROADMAP.md` (Phase 36)
**Plan Files**: `36-01-PLAN.md` (data flow), `36-02-PLAN.md` (behavioral changes)

---

## Phase 36 Success Criteria (from ROADMAP.md)

1. FRED drives the conversation by asking specific questions and guiding to next steps rather than passively waiting for input -- the founder answers, FRED leads (CHAT-01)
2. FRED applies reframe-before-prescribe in every response: identifies the real underlying goal before answering the literal question (CHAT-02)
3. FRED surfaces critical-thinking elements (assumptions, bottlenecks, tests, decision criteria) in every substantive response (CHAT-03)
4. When a founder goes off track, FRED acknowledges what they said and steers back: "I hear you -- but before we go there, let's finish establishing X" (CHAT-04)
5. FRED tracks conversation state -- knows what has been established (problem, buyer, economics) and what still needs validation -- and uses this to determine next questions (CHAT-05)

---

## 1. Build, TypeScript, Lint (Standard Gates)

### 1.1 Build Passes
- `npm run build` completes with zero errors
- All pages compile, all routes resolve

### 1.2 TypeScript Compiles
- `npx tsc --noEmit` -- zero new errors from Phase 36 files
- Check specifically: `lib/fred/types.ts`, `lib/fred/actors/*.ts`, `lib/fred/machine.ts`, `lib/fred/service.ts`, `lib/fred/context-builder.ts`, `lib/ai/prompts.ts`, `app/api/fred/chat/route.ts`
- Pre-existing errors in `workers/voice-agent/agent.ts` acceptable (9 errors)

### 1.3 Lint Passes
- `npm run lint` -- no new lint errors in Phase 36 files

### 1.4 Unit Tests Pass
- `npm test` -- all existing tests pass (currently 617/617)
- No test regressions from actor signature changes

---

## 2. Plan 36-01: Conversation State Data Flow

### 2.1 ConversationStateContext Type (types.ts)

Verify new type added to `lib/fred/types.ts`:

| Field | Type | Required |
|---|---|---|
| `currentStep` | `StartupStep` | Yes |
| `stepStatuses` | `Record<StartupStep, StepStatus>` | Yes |
| `processStatus` | `string` | Yes |
| `currentBlockers` | `string[]` | Yes |
| `diagnosticTags` | `Record<string, string>` | Yes |
| `founderSnapshot` | `Record<string, unknown>` | Yes |
| `progressContext` | `string` | Yes |

Verify `FredContext` interface includes:
```typescript
conversationState: ConversationStateContext | null;
```

### 2.2 Context Builder Extension (context-builder.ts)

**Test: Step progress loading in parallel**
- `buildFounderContext()` must call `loadProgressContext(userId)` in parallel with `loadFounderProfile()` and `loadSemanticFacts()`
- All three calls must be in a `Promise.all()` -- no serial waterfalls
- Verify by checking the function signature and Promise.all array

**Test: Progress context appended**
- When `loadProgressContext()` returns data, it is appended to the context block after the founder snapshot
- When `loadProgressContext()` returns null, context block is unchanged

**Test: Graceful failure**
- If `loadProgressContext()` throws, `buildFounderContext()` still returns the profile+facts context (non-blocking)
- The `try/catch` in `loadProgressContext` swallows errors and returns null

### 2.3 Step Guidance Block (prompts.ts)

**Test: `buildStepGuidanceBlock()` output format**
Verify function produces:
- `## CURRENT PROCESS POSITION` heading
- Current step name and number (e.g., "Step 1: Define the Real Problem")
- Step objective
- Priority questions for the step
- Required output before advancing
- "Do NOT advance" conditions
- Active blockers (if any)
- Validated steps list (if any have status "validated")

**Test: Step guidance for each of the 9 steps**
Call `buildStepGuidanceBlock()` for each step and verify:
- problem: questions about pain point, who suffers, alternatives
- buyer: questions about ICP, who pays, decision maker
- founder-edge: questions about unfair advantage, credibility
- solution: questions about simplest viable solution
- validation: questions about customer evidence
- gtm: questions about distribution channels
- execution: questions about priorities, cadence
- pilot: questions about beta/trial plan
- scale-decision: questions about what earns the right to scale

**Test: Empty/null handling**
- Invalid step name returns empty string
- Empty blockers array produces no blockers section
- No validated steps produces no validated section

### 2.4 Chat Route Wiring (route.ts)

**Test: Conversation state loading**
- Chat route calls `getOrCreateConversationState(userId)` after `buildFounderContext()`
- Result is used to build `stepGuidanceBlock` via `buildStepGuidanceBlock()`
- `stepGuidanceBlock` is appended to the system prompt

**Test: New founder auto-creation**
- For a new user with no `fred_conversation_state` row, `getOrCreateConversationState()` creates one automatically
- Default state: `currentStep: "problem"`, all step statuses `"not_started"`, empty blockers

**Test: Graceful fallback**
- If `getOrCreateConversationState()` throws, chat route catches the error and continues without step guidance
- Response is still delivered -- conversation state loading is non-blocking

**Test: ConversationStateContext built correctly**
Verify the chat route builds the lightweight context object with:
- `currentStep` from conversation state
- `stepStatuses` from conversation state
- `processStatus` from conversation state
- `currentBlockers` from conversation state
- `diagnosticTags` from conversation state (cast to `Record<string, string>`)
- `founderSnapshot` from conversation state (cast to `Record<string, unknown>`)
- `progressContext` from the step guidance block string

### 2.5 Service and Machine Wiring

**Test: FredServiceOptions extended**
- `FredServiceOptions` in `service.ts` accepts optional `conversationState?: ConversationStateContext | null`

**Test: Machine input extended**
- `machine.ts` input type includes `conversationState?: ConversationStateContext | null`
- `createInitialContext()` includes `conversationState` parameter
- `FredContext` receives `conversationState` in context initializer

**Test: Conversation state accessible to actors**
- All actors can read `context.conversationState` from the machine context
- Verify via machine state invoke input maps passing `conversationState`

### 2.6 Backward Compatibility

**Test: No conversation state table**
- If migration 049 has not been run (table doesn't exist), `getOrCreateConversationState()` should throw
- Chat route catches the error and continues without state
- Response is still generated normally

**Test: Null conversation state**
- When `conversationState` is null, all actors function exactly as before Phase 36
- No `TypeError` or null reference errors when accessing `conversationState?.field`

**Test: API contract unchanged**
- Chat route request schema is the same (message, sessionId, context, topic, stream)
- Chat route response schema is the same (content, metadata)
- No new required fields in request or response

---

## 3. Plan 36-02: Structured Flow Control

### 3.1 Step-Relevance Detection (validate-input.ts)

**Test: `detectStepRelevance()` signal matching**
Verify keyword/phrase detection for each step:

| Step | Test Input | Should Match? |
|---|---|---|
| problem | "My biggest pain point is..." | Yes |
| problem | "I'm frustrated with how..." | Yes |
| buyer | "My target market is everyone" | Yes |
| buyer | "Who buys this? Enterprise CTOs" | Yes |
| founder-edge | "I have 10 years of experience in..." | Yes |
| solution | "I want to build an MVP that..." | Yes |
| validation | "I've talked to 20 customers and..." | Yes |
| gtm | "How do I reach my first customers?" | Yes |
| execution | "What should I prioritize this week?" | Yes |
| pilot | "We're doing a beta test with..." | Yes |
| scale-decision | "Should I raise a Series A?" | Yes |

**Test: Confidence scoring**
- 1 signal match: confidence 0.65
- 2 signal matches: confidence 0.80
- 3+ signal matches: confidence 0.95 (capped)

**Test: Multi-word phrase matching**
- "pain point" matched with `includes()`, not word boundary
- "go to market" matched with `includes()`
- "target market" matched with `includes()`

**Test: Word-boundary regex matching**
- "scale" matches `/\bscal\w*\b/` (finds "scale", "scaling", "scalable")
- "escalate" does NOT match `/\bscal\w*\b/` (word boundary prevents false positive)
- "problem" matches `/\bproblem\b/` but "problematic" handled by the regex pattern

**Test: No match**
- "How's the weather?" returns null (no step signals)
- "Tell me about yourself" returns null

### 3.2 Drift Detection (validate-input.ts)

**Test: Drift fires for downstream jump**
- Current step: `problem` (index 0), message about `scale-decision` (index 8) -> drift detected
- Current step: `buyer` (index 1), message about `gtm` (index 5) -> drift detected (4 steps ahead)

**Test: Drift does NOT fire for adjacent step**
- Current step: `problem` (index 0), message about `buyer` (index 1) -> NO drift (adjacent, natural progression)
- Current step: `validation` (index 4), message about `gtm` (index 5) -> NO drift (next step)

**Test: Drift does NOT fire when current step is validated**
- Current step: `problem`, status: `validated`, message about `gtm` -> NO drift (current is validated)

**Test: Drift does NOT fire for low confidence**
- Step relevance confidence < 0.6 -> NO drift regardless of step distance

**Test: Drift threshold is 2+ steps ahead**
- Current: index 0, target: index 1 (1 step) -> NO drift
- Current: index 0, target: index 2 (2 steps) -> drift
- Current: index 3, target: index 5 (2 steps) -> drift

### 3.3 Gentle Redirect (decide.ts)

**Test: Redirect message format**
When drift is detected, response must be prefixed with:
- Acknowledges the founder's topic: "I hear you on [target step name]"
- Steers back: "let's make sure we've nailed [current step name]"
- Explains why: "If we skip ahead, everything downstream gets built on shaky ground"

**Test: Redirect preserves original content**
- The founder's actual question is still answered after the redirect prefix
- Redirect is a PREFIX, not a replacement -- the actual content follows

**Test: No redirect when no drift**
- When `driftDetected` is null or `isDrift: false`, no redirect prefix is added

**Test: Operating Bible compliance**
- Redirect follows the pattern from Section 7 and success criterion CHAT-04
- Language matches: "I hear you -- but before we go there..."

### 3.4 Next 3 Actions Enforcement (decide.ts)

**Test: Appended to substantive responses**
- When action is `auto_execute` -> Next 3 Actions appended
- When action is `recommend` -> Next 3 Actions appended
- When action is `escalate` -> Next 3 Actions appended

**Test: NOT appended to non-substantive responses**
- When action is `clarify` -> NO Next 3 Actions
- When action is `defer` -> NO Next 3 Actions

**Test: Output format**
```
## Next 3 Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]
```
- Max 3 actions (sliced from `synthesis.nextSteps`)
- Numbered list format
- Section heading "## Next 3 Actions"

**Test: No actions available**
- When `synthesis.nextSteps` is empty or undefined, no Next 3 Actions block is appended
- No crash or empty section

### 3.5 Step Question Injection (decide.ts)

**Test: Question injected when step is in_progress**
- Current step status is `in_progress` -> question from `STARTUP_STEPS[currentStep].questions[0]` appended
- Format: "To keep us moving forward on **[step name]**: [question]"

**Test: Question NOT injected when step is validated**
- Current step status is `validated` -> no question appended

**Test: Question NOT injected when founder is already addressing current step**
- `stepRelevance.targetStep === currentStep` AND `confidence > 0.7` -> no question
- This prevents FRED from asking a question the founder is already answering

**Test: Question NOT injected for clarify/defer actions**
- Only injected for substantive responses

**Test: Null conversation state**
- When `conversationState` is null, no question injected (backward compatible)

### 3.6 Post-Response Evidence Storage (execute.ts)

**Test: User statement evidence stored**
- When `stepRelevance.targetStep === currentStep`, evidence is stored via `storeStepEvidence()`
- Evidence type: `"user_statement"`
- Content: first 500 chars of `validatedInput.originalMessage`
- Metadata includes: `source: "conversation"`, `confidence`

**Test: Evidence NOT stored for low relevance**
- When step relevance target does not match current step, no evidence stored

**Test: Evidence storage in `fred_step_evidence` table**
- Verify row inserted with correct: user_id, step, evidence_type, content, metadata, confidence, source

### 3.7 Diagnostic Tag Updates (execute.ts)

**Test: Positioning clarity detection**
- Message with "everyone" -> `positioningClarity: "low"`
- Message about buyer with confidence > 0.7 -> `positioningClarity: "med"`

**Test: Investor readiness detection**
- Message with "fundraising" -> `investorReadinessSignal: "med"`
- Message with "Series A" -> `investorReadinessSignal: "med"`
- Message with "term sheet" -> `investorReadinessSignal: "med"`

**Test: Stage detection**
- "I have an idea" -> `stage: "idea"`
- "We're building an MVP" -> `stage: "pre-seed"`
- "We have paying customers" -> `stage: "seed"`
- "We're expanding to new markets" -> `stage: "growth"`

**Test: Tags stored in `fred_conversation_state.diagnostic_tags`**
- Verify `updateDiagnosticTags(userId, tags)` updates the JSONB column
- Existing tags not overwritten (merged)

### 3.8 Founder Snapshot Updates (execute.ts)

**Test: Traction from money entities**
- When `validatedInput.entities` contains money type entities, traction is extracted
- Stored via `updateFounderSnapshot(userId, { traction: "..." })`

**Test: No entities, no update**
- When no money entities detected, no snapshot update attempted

### 3.9 State Updates Are Non-Blocking

**CRITICAL TEST: State update failures do not break responses**
- If `storeStepEvidence()` throws, the response is still delivered
- If `updateDiagnosticTags()` throws, the response is still delivered
- If `updateFounderSnapshot()` throws, the response is still delivered
- All state updates are wrapped in try/catch with `console.warn`
- The `updateConversationState()` call is fire-and-forget (`.catch()` handler)

### 3.10 Step-Aware Synthesis (synthesize.ts)

**Test: Synthesis includes step context**
- `synthesizeActor()` accepts `conversationState` parameter
- `buildStepContext()` produces context string with current step, validated steps, blockers
- This context is factored into synthesis recommendations

**Test: Null conversation state**
- When `conversationState` is null, `buildStepContext()` returns empty string
- Synthesis works exactly as before Phase 36

---

## 4. Actor Signature Backward Compatibility

All actor signature changes must be backward-compatible (new params optional):

| Actor | Original Signature | New Param | Default |
|---|---|---|---|
| `validateInputActor` | `(input, memoryContext)` | `conversationState?` | `null` or `undefined` |
| `synthesizeActor` | `(validatedInput, mentalModels, memoryContext)` | `conversationState?` | `null` or `undefined` |
| `decideActor` | `(synthesis, validatedInput, founderContext?)` | `conversationState?` | `null` or `undefined` |
| `executeActor` | `(decision, validatedInput, userId, sessionId)` | `conversationState?` | `null` or `undefined` |

**Test: All actors callable with old signature (no new params) without errors.**

---

## 5. Machine Wiring

### 5.1 Actor Invocations

For each actor, verify the machine's `invoke` block passes `conversationState`:

| State | Actor | Input Must Include |
|---|---|---|
| intake | `validateInput` | `conversationState: context.conversationState` |
| synthesis | `synthesize` | `conversationState: context.conversationState` |
| decide | `decide` | `conversationState: context.conversationState` |
| execute | `execute` | `conversationState: context.conversationState` |

### 5.2 Context Initialization

- `createInitialContext()` accepts `conversationState` parameter
- Machine context initializer passes `input.conversationState` to `createInitialContext()`

---

## 6. Operating Bible Compliance

### 6.1 Section 4: System Architecture
| Requirement | Test |
|---|---|
| Layer 1: Core instructions (global behavior) | Step guidance injected into prompt -- Layer 1 extended |
| Layer 2: Router (diagnostic introduction) | Silent diagnosis tags updated via post-response evidence |
| Layer 3: Framework documents (injected via overlays) | Step-specific questions from STARTUP_STEPS -- framework applied |

### 6.2 Section 7: 9-Step Startup Process
| Requirement | Test |
|---|---|
| Steps can overlap but none should be skipped | Drift detection prevents skipping 2+ steps |
| Do not advance until current step validated | "Do NOT advance" conditions in step guidance block |
| "Do Not Advance If" gates | Gates from STARTUP_STEPS included in guidance block |

### 6.3 Section 17: Regression Triggers
| Trigger | Protected? | How |
|---|---|---|
| Asks founders to choose diagnostics | YES | Diagnostic tags updated silently in execute.ts |
| Scores without intake | YES | No scoring in step guidance -- inherited from Phase 34 prompt |
| Encourages fundraising by default | YES | Drift detection redirects fundraising questions when upstream not validated |
| Jumps to downstream artifacts | YES | Drift detection fires for 2+ step jumps, gentle redirect applied |

---

## 7. Integration Test Scenarios

### Scenario A: New founder, first message about fundraising (drift)
1. No `fred_conversation_state` row exists
2. `getOrCreateConversationState()` creates row with `currentStep: "problem"`
3. Message: "How do I raise a seed round?"
4. `detectStepRelevance()` returns `{ targetStep: "scale-decision", confidence: 0.8 }`
5. `detectDrift()` returns `{ isDrift: true, targetStep: "scale-decision", currentStep: "problem" }`
6. Response prefixed with gentle redirect
7. Post-response: evidence stored, diagnostic tags updated (`investorReadinessSignal: "med"`)

### Scenario B: Founder at step 3, answering step 3 question
1. `fred_conversation_state` has `currentStep: "founder-edge"`
2. Message: "I have 15 years in healthcare and three prior exits"
3. `detectStepRelevance()` returns `{ targetStep: "founder-edge", confidence: 0.8 }`
4. No drift detected (answering current step)
5. No step question injection (already addressing current step)
6. Evidence stored for "founder-edge" step
7. Diagnostic tags: `stage: "seed"` (if "prior exits" triggers it)

### Scenario C: Returning founder, conversation state loaded
1. `fred_conversation_state` row exists with `currentStep: "validation"`, problem/buyer/founder-edge validated
2. Step guidance block shows "Step 5: Validate Before Building" with relevant questions
3. Validated steps listed: problem, buyer, founder-edge
4. FRED asks about customer evidence, willingness to pay

### Scenario D: State loading fails gracefully
1. Database connection fails on `getOrCreateConversationState()`
2. Chat route catches error, logs warning
3. `conversationState` is null
4. All actors receive null, skip state-related behavior
5. Response is delivered normally (same as pre-Phase 36 behavior)

### Scenario E: Adjacent step transition (not drift)
1. `currentStep: "buyer"` (index 1)
2. Message: "I think my unfair advantage is..."
3. `detectStepRelevance()` returns `{ targetStep: "founder-edge", confidence: 0.75 }`
4. `detectDrift()`: target index 2, current index 1, difference = 1 -> NO drift
5. No redirect applied -- natural progression

---

## 8. Performance Considerations

### 8.1 No Serial Waterfalls
- `buildFounderContext()` must load profile, facts, and progress in parallel (`Promise.all`)
- Conversation state loading in chat route should not add significant latency
- Fire-and-forget state updates after response do not block the response stream

### 8.2 Step Guidance Token Budget
- Step guidance block should be concise -- target <300 tokens (per 36-01 must-have #3)
- Measure output of `buildStepGuidanceBlock()` for each step -- verify no step exceeds 300 tokens

---

## Summary Checklist

| # | Test Category | Test | Pass Criteria |
|---|---|---|---|
| 1.1 | Gates | Build passes | `npm run build` zero errors |
| 1.2 | Gates | TypeScript compiles | `npx tsc --noEmit` zero new errors |
| 1.3 | Gates | Lint passes | No new lint errors |
| 1.4 | Gates | Unit tests pass | All tests green |
| 2.1 | Data Flow | ConversationStateContext type | Correctly typed in types.ts |
| 2.2 | Data Flow | Context builder loads progress | Parallel loading, appended to context |
| 2.3 | Data Flow | Step guidance block format | Correct headings, questions, gates |
| 2.4 | Data Flow | Chat route wiring | State loaded, guidance injected |
| 2.5 | Data Flow | Service + machine wiring | conversationState flows through |
| 2.6 | Data Flow | Backward compatibility | Null state = pre-Phase 36 behavior |
| 3.1 | Behavior | Step-relevance detection | Correct signals, confidence scoring |
| 3.2 | Behavior | Drift detection | 2+ step jump = drift, adjacent = no |
| 3.3 | Behavior | Gentle redirect | Correct format, preserves content |
| 3.4 | Behavior | Next 3 Actions | Appended to substantive responses |
| 3.5 | Behavior | Step question injection | Asked when in_progress, not when addressing step |
| 3.6 | Behavior | Evidence storage | User statements stored in fred_step_evidence |
| 3.7 | Behavior | Diagnostic tag updates | Silent tags updated from signals |
| 3.8 | Behavior | Snapshot updates | Traction from money entities |
| 3.9 | Behavior | Non-blocking state updates | Failures do not break responses |
| 3.10 | Behavior | Step-aware synthesis | Synthesis factors in position |
| 4 | Compat | Actor signatures | All backward-compatible |
| 5 | Machine | Actor invocations | conversationState passed through |
| 6 | Bible | Operating Bible compliance | All 4 regression triggers protected |
| 7 | Integration | 5 end-to-end scenarios | All pass |
| 8 | Perf | No serial waterfalls | Parallel loading, <300 token budget |
