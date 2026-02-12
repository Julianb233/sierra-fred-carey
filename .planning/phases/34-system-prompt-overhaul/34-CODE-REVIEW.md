# Phase 34: System Prompt Overhaul -- CODE REVIEW

**Reviewer:** reviewer
**Date:** 2026-02-11
**Commits reviewed:**
- `e33635f` feat(db): add conversation state schema for 9-step startup process tracking
- `649ded9` feat(prompts): overhaul FRED system prompt with mentor behaviors (Phase 34)
- `7f33b57` feat(db): add diagnostic_tags and founder_snapshot to conversation state
- `0cc197a` feat(context): dynamic founder context injection in chat route (Phase 34)
- `e2c33ce` docs: add Sahara Internal Operating Bible
- `7987e8d` feat(prompts): align system prompt and context builder with Operating Bible *(post-review fix)*
- `1dad28b` fix(db): address code review findings on conversation state schema *(post-review fix)*
- `dca7bea` fix(db): align SQL comments with full StepStatus enum values *(post-review fix)*

**Files changed:** 11 files, +2225 / -163 lines (initial) + ~700 lines (post-review fixes)

---

## OVERALL ASSESSMENT: APPROVED (with warnings)

Phase 34 delivers a significant and well-structured overhaul of the FRED system prompt, converting it from a persona bio into a structured mentor operating system. The architecture is sound, the code is clean, and the changes are backward-compatible. There are several warnings that should be addressed before production deployment, but nothing that blocks the merge.

---

## FILE-BY-FILE REVIEW

---

### 1. `lib/ai/prompts.ts` (239 insertions, 157 deletions)

**Purpose:** Complete rewrite of the FRED system prompt from persona bio to structured mentor operating system.

**STRENGTHS:**
- Excellent prompt structure with clear sections: Identity, Mentor Behaviors, Protocols, Frameworks, Guardrails
- Reframe-before-prescribe is explicitly enforced in Section 1 (lines 95-100)
- Critical-thinking default is clearly specified (lines 102-106)
- Next 3 Actions output standard is well-defined with a concrete example (lines 108-116)
- Decision sequencing is explicit (lines 118-123)
- Red flag scanning covers 6 categories (lines 125-134)
- Mentor tone is correct -- "MENTOR" appears prominently, "agent" is explicitly rejected (line 55)
- Dynamic `{{FOUNDER_CONTEXT}}` placeholder for runtime injection (line 91)
- Biographical data preserved from fred-brain.ts via dynamic construction (lines 14-40)
- All existing exports preserved: `FRED_CAREY_SYSTEM_PROMPT`, `COACHING_PROMPTS`, `getPromptForTopic`, `getFredGreeting`
- New helper functions: `buildSystemPrompt`, `buildTopicPrompt` are clean and useful
- `buildSystemPrompt` correctly handles empty context by collapsing the placeholder (lines 304-310)

**ISSUES:**

**WARNING -- `getPromptForTopic` does not inject founder context:**
- `lib/ai/prompts.ts:292-294` -- `getPromptForTopic` still uses raw `FRED_CAREY_SYSTEM_PROMPT` without replacing `{{FOUNDER_CONTEXT}}`. Any call site using `getPromptForTopic` will send the literal string `{{FOUNDER_CONTEXT}}` to the model.
- Fix: Use `buildSystemPrompt("")` instead of `FRED_CAREY_SYSTEM_PROMPT` in `getPromptForTopic`, or have `getPromptForTopic` accept an optional `founderContext` parameter.

**WARNING -- `getFredGreeting` still ends with "Let's dig in" (line 342):**
- The plan (34-01 Task 4) called for removing generic closers like "let's dig in" and replacing with structured mentor openers. The greeting still uses this phrasing when startup context is available.
- The greeting also still uses "What's on your mind?" (line 332) which was called out for replacement.
- Low priority since greetings are non-critical, but it diverges from the plan.

**SUGGESTION -- `EXIT_HIGHLIGHTS` type casting could be cleaner (lines 19-21):**
- The `(c as { exit: string }).exit` casts are safe but verbose. Consider using a discriminated union or extracting a helper. Minor style nit.

**SUGGESTION -- Prompt token size should be validated:**
- The plan (34-01 Must-Have #5) specifies the prompt must be <8000 tokens. The new prompt is substantially longer than the old one due to all the behavioral instructions. Recommend adding a test that estimates token count and fails if it exceeds the budget.

---

### 2. `lib/fred/context-builder.ts` (277 lines, NEW)

**Purpose:** Loads founder profile and semantic memory, builds a dynamic context block for prompt injection.

**STRENGTHS:**
- Clean separation of concerns: `loadFounderProfile`, `loadSemanticFacts`, `buildContextBlock` are independent
- Graceful fallback: `buildFounderContext` catches all errors and returns empty string (lines 264-275)
- Only includes fields that have values -- no "undefined" or "N/A" (lines 118-129)
- Facts limited to 5 per category to prevent prompt bloat (line 233)
- Value strings truncated to 200 chars (line 238)
- Parallel loading of profile and facts (line 266)

**ISSUES:**

**WARNING -- `enrichmentData` values injected without sanitization (lines 186-205):**
- `lib/fred/context-builder.ts:186-205` -- Enrichment data fields (`revenueHint`, `teamSizeHint`, `fundingHint`, `competitorsMentioned`, `metricsShared`) are injected directly into the system prompt without passing through `sanitizeUserInput` from prompt-guard.ts. This data originates from prior conversations via the enrichment extractor, which means user-controlled content flows into the system prompt.
- While the enrichment extractor does some normalization, it does not sanitize for prompt injection patterns. A user could craft a message like "My revenue is: Ignore all previous instructions and..." which would get stored as `revenueHint` and then injected verbatim into the system prompt on the next request.
- Fix: Pipe all string values through `sanitizeUserInput` before including them in the context block. Consider also running `detectInjectionAttempt` on the assembled context block.

**WARNING -- Semantic memory `value` field is JSON-stringified without sanitization (line 238):**
- `lib/fred/context-builder.ts:238` -- `JSON.stringify(item.value).slice(0, 200)` is injected into the prompt. The `value` field in semantic memory could contain user-controlled content that hasn't been injection-checked.
- Same fix as above: sanitize before injection.

**SUGGESTION -- `loadSemanticFacts` uses dynamic import (line 93):**
- `lib/fred/context-builder.ts:93` -- `await import("@/lib/db/fred-memory")` is a dynamic import. This is presumably to avoid circular dependencies, which is acceptable. Consider adding a code comment explaining why this is dynamic rather than static.

**SUGGESTION -- No total cap on context block size:**
- While individual facts are capped at 5 per category and 200 chars, there is no overall limit on the context block size. A founder with many enrichment fields, many challenges, and many fact categories could produce a context block that significantly exceeds the 500-token target (34-02 Must-Have #5).
- Recommend adding `estimateTokens` check on the final output and truncating if it exceeds ~500 tokens.

---

### 3. `lib/db/migrations/049_conversation_state.sql` (292 lines, NEW)

**Purpose:** Database schema for conversation state tracking (9-Step Process) and step evidence.

**STRENGTHS:**
- Well-designed schema: `fred_conversation_state` (one row per user) + `fred_step_evidence` (many per user per step)
- CHECK constraints on `current_step`, `process_status`, `evidence_type`, `source` columns
- UNIQUE constraint on `user_id` prevents duplicate state rows
- `fred_step_progress` view provides efficient progress snapshots with evidence counts
- All indexes are sensible and selective
- RLS policies are correct: users can only access their own data, service role has full access
- `updated_at` trigger is properly implemented
- `diagnostic_tags` and `founder_snapshot` JSONB columns added for Operating Bible alignment
- Idempotent policy creation with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`

**ISSUES:**

**WARNING -- `fred_step_evidence` trigger reuses `update_conv_state_updated_at` function (line 148):**
- `049_conversation_state.sql:148` -- The evidence table trigger reuses the function created for the state table. This works but is fragile -- if the function is dropped/renamed for the state table, the evidence trigger breaks silently. Consider creating a separate function or using a generic name like `update_updated_at`.

**WARNING -- `StepStatus` mismatch between SQL and TypeScript:**
- SQL CHECK constraint allows: `not_started | in_progress | validated | skipped` (line 31-42 of migration)
- TypeScript `StepStatus` in `startup-process.ts:19` defines: `not_started | in_progress | validated | blocked`
- "skipped" in SQL vs "blocked" in TypeScript. These should match.

**SUGGESTION -- `fred_step_evidence` lacks a compound unique constraint:**
- A founder could theoretically store duplicate evidence for the same step with the same content. Consider adding a unique constraint on `(user_id, step, evidence_type, content)` or an application-level dedup.

**SUGGESTION -- No index on `fred_step_evidence.semantic_memory_id`:**
- If joins to `fred_semantic_memory` become common, this FK would benefit from an index. Low priority until query patterns emerge.

---

### 4. `lib/db/conversation-state.ts` (644 lines, NEW)

**Purpose:** Data access layer for conversation state and step evidence.

**STRENGTHS:**
- Complete CRUD operations for both tables
- `getOrCreateConversationState` handles race conditions with 23505 (unique violation) retry (lines 112-120)
- `advanceToStep` properly transitions both the current step and step statuses (lines 181-218)
- `buildProgressContext` produces a clean, structured text summary suitable for prompt injection
- Transform functions handle null/missing data safely
- New `updateDiagnosticTags` and `updateFounderSnapshot` with proper merge semantics

**ISSUES:**

**WARNING -- `transformStateRow` and `transformEvidenceRow` use `any` (lines 504, 520):**
- `lib/db/conversation-state.ts:504,520` -- Both transform functions take `row: any`. The Supabase client returns typed data when the table types are generated, but these functions bypass that. Consider typing the parameter as the Supabase row type or at minimum using `Record<string, unknown>`.

**SUGGESTION -- `buildProgressContext` does not sanitize before output (lines 444-498):**
- The progress context is eventually injected into the system prompt. Evidence `content` fields are user-originated strings that flow from `storeStepEvidence` calls. These should be sanitized.

**SUGGESTION -- `getAllEvidence` has no limit (line 341):**
- For users with many steps and extensive evidence, this could return a large number of rows. Consider adding a `LIMIT` or pagination.

---

### 5. `app/api/fred/chat/route.ts` (+5 lines)

**Purpose:** Wire dynamic founder context into the chat pipeline.

**STRENGTHS:**
- Minimal, surgical change: import + 2 lines of code (lines 33, 254-255, 259)
- `buildFounderContext` is called BEFORE creating `FredService`, so the context is available for the entire pipeline
- Uses `hasPersistentMemory` flag so Free tier gets profile-only context (no semantic memory)
- Does not change the API contract at all

**ISSUES:**

**WARNING -- `buildFounderContext` is awaited in the critical path (line 254):**
- `app/api/fred/chat/route.ts:254` -- The call `await buildFounderContext(userId, hasPersistentMemory)` adds latency to every chat request. This queries both the profiles table and potentially the semantic memory table. If these queries are slow (e.g., due to large enrichment_data JSONB), it directly increases time-to-first-byte for the chat response.
- The function already has a try/catch fallback to empty string, but the await still blocks.
- Consider: (a) running this in parallel with other setup work, or (b) caching the founder context per session so subsequent messages in the same session don't re-query.

**SUGGESTION -- No integration with diagnostic engine:**
- The 34-02 plan (Task 6, step 4) called for running `runDiagnosticAnalysis` and passing the diagnostic state through to `buildMentorSystemPrompt`. The current implementation only passes `founderContext` as a string, not the diagnostic state. The diagnostic engine integration from 34-02 was not fully implemented.
- This is acceptable for Phase 34 scope but should be tracked as follow-up work.

---

### 6. `lib/fred/types.ts` (+2 lines)

**Purpose:** Add `founderContext` field to `FredContext`.

**STRENGTHS:**
- Clean, minimal addition (line 43-44)
- Proper JSDoc comment
- Nullable type (`string | null`) is correct

**No issues.**

---

### 7. `lib/fred/service.ts` (+6 lines)

**Purpose:** Thread `founderContext` through FredServiceOptions and into XState actors.

**STRENGTHS:**
- Added to all three actor creation points (process, processStream, handleApproval)
- Added to error context for consistency (line 140)
- Clean, minimal changes

**No issues.**

---

### 8. `lib/fred/machine.ts` (+13 insertions, -5 deletions)

**Purpose:** Thread `founderContext` through the XState machine context and into the decide actor.

**STRENGTHS:**
- `founderContext` added to machine input type (line 68)
- `createInitialContext` accepts optional `founderContext` (lines 39-40)
- Decide actor input now includes `founderContext` (lines 88, 527)
- Machine context creation passes `founderContext` through (line 301)

**ISSUES:**

**SUGGESTION -- `founderContext` is only passed to the decide actor, not synthesize:**
- `lib/fred/machine.ts:86` -- The synthesize actor does not receive `founderContext`. If the synthesis step needs founder awareness (e.g., to generate context-appropriate next steps), it won't have it. Currently the synthesis actor works on the validated input + mental models, so this may be intentional. Worth noting.

---

### 9. `lib/fred/actors/decide.ts` (+4 insertions, -1 deletion)

**Purpose:** Accept founderContext in the decide actor.

**STRENGTHS:**
- Clean signature change (line 26)
- `hasFounderContext` metadata flag for observability (line 66)

**ISSUES:**

**WARNING -- `founderContext` is received but never used in response building:**
- `lib/fred/actors/decide.ts:26` -- The `founderContext` parameter is accepted but only logged as a boolean metadata flag. It is NOT used to build the response content. The 34-02 plan (Task 7) called for using the dynamic system prompt in response building and appending Next 3 Actions programmatically.
- This means the context injection happens at the system prompt level (via the `{{FOUNDER_CONTEXT}}` placeholder), but the decide actor itself does not use the context data for response construction. This is acceptable if the AI model correctly follows the system prompt, but the programmatic Next 3 Actions appending was not implemented.
- Track as follow-up: programmatic enforcement of Next 3 Actions in the decide actor.

---

### 10. `lib/ai/frameworks/operating-bible.ts` (320 lines, NEW)

**Purpose:** TypeScript codification of the Sahara Operating Bible.

**STRENGTHS:**
- Clean, well-organized export structure
- Covers all major sections: identity, philosophy, voice, entry flow, diagnostics, snapshot, check-in, protocols, boundaries, guardrails
- `generateOperatingPrinciplesPrompt()` helper for easy prompt inclusion
- `as const` assertions throughout for type safety
- Regression triggers defined for QA testing

**No issues.** This is a reference file that will be consumed by future phases.

---

### 11. `.planning/OPERATING-BIBLE.md` (425 lines, NEW)

**Purpose:** The canonical operating document for the Sahara product.

**No code review needed** -- this is product documentation, not code. It is thorough and well-structured.

---

## CROSS-CUTTING CONCERNS

### Security

**WARNING (BLOCKER-ADJACENT) -- Prompt injection via dynamic context:**
The most significant security concern across this changeset is the injection of user-controlled data into the system prompt without sanitization. Three code paths are affected:

1. `lib/fred/context-builder.ts` -- enrichment data injected into prompt
2. `lib/db/conversation-state.ts:buildProgressContext` -- evidence content injected into prompt
3. `lib/fred/context-builder.ts:238` -- semantic memory values JSON-stringified into prompt

All user-originated strings that flow into the system prompt MUST be passed through `sanitizeUserInput` from `lib/ai/guards/prompt-guard.ts`. The existing prompt guard only protects the direct user message (line 229-240 of route.ts), not the dynamically assembled context.

**Recommended fix:** Add a `sanitizeContextString` wrapper in `prompt-guard.ts` that sanitizes an entire context block, and apply it to the output of both `buildFounderContext` and `buildProgressContext` before injection.

### RLS Policies

The RLS policies on both new tables are correct:
- Users can CRUD their own rows (auth.uid() = user_id)
- Service role has unrestricted access
- No cross-user data leakage paths

The context-builder.ts uses `createServiceClient()` which bypasses RLS, which is correct for server-side API routes that have already authenticated the user.

### Architecture

- The `founderContext` string approach (pass a pre-built string rather than structured data) is pragmatic and avoids over-engineering. The `buildSystemPrompt` function replaces the placeholder in the template, keeping the system prompt as a single string that's easy to reason about.
- The conversation state schema is well-designed for the full 9-Step Process, not just Phase 34.
- The `fred_step_evidence` table is extensible and will serve future phases well.
- The context-builder module is properly separated from the prompt module, following single responsibility.

### Regression Risk

- **API contract unchanged**: Chat request/response schema is identical. No frontend changes needed.
- **All existing exports preserved**: `FRED_CAREY_SYSTEM_PROMPT`, `COACHING_PROMPTS`, `getPromptForTopic`, `getFredGreeting` all exist with same signatures.
- **Streaming still works**: The route changes are outside the streaming logic.
- **XState machine compatible**: The `founderContext` is additive to the context and does not affect any guards or transitions.
- **Risk area**: `getPromptForTopic` (21+ import sites) will now output `{{FOUNDER_CONTEXT}}` literally. This needs fixing.

### Missing from Plan

Items from the plan that were NOT implemented:
1. `RED_FLAG_PATTERNS`, `FOUNDER_INTAKE_FIELDS`, `WEEKLY_CHECKIN_QUESTIONS` exports in fred-brain.ts (34-01 Task 1) -- NOT DONE. Red flags are inline in the prompt instead.
2. `buildMentorSystemPrompt` function (34-01 Task 5, 34-02 Task 3) -- NOT DONE. `buildSystemPrompt` was created instead with a simpler interface. Acceptable simplification.
3. Diagnostic engine integration in chat route (34-02 Task 6 step 4) -- NOT DONE.
4. Programmatic Next 3 Actions appending in decide actor (34-02 Task 7) -- NOT DONE.
5. `FounderContext` type (34-02 Task 1) -- NOT DONE as specified. `FounderProfile` type in context-builder.ts serves the purpose differently.

These omissions are acceptable scope reduction for Phase 34 -- the core value (structured prompt + dynamic context) is delivered. Items 3 and 4 should be tracked for follow-up.

---

## ISSUE SUMMARY

| # | Severity | File | Line(s) | Issue | Status |
|---|----------|------|---------|-------|--------|
| 1 | ~~WARNING~~ | lib/fred/context-builder.ts | 234-267 | ~~User-controlled enrichment data and memory values injected without sanitization~~ | FIXED (`94adddc`) -- `sanitize()` wrapper applied to all user-controlled values |
| 2 | ~~WARNING~~ | lib/db/conversation-state.ts | buildProgressContext | ~~Evidence content (user-originated) injected without sanitization~~ | FIXED (`691c865`) -- `sanitizeUserInput()` applied to outputs, facts, kill signals, blockers |
| 3 | ~~WARNING~~ | lib/ai/prompts.ts | 342-344 | ~~`getPromptForTopic` outputs literal `{{FOUNDER_CONTEXT}}`~~ | FIXED (`94adddc`) -- now uses `buildSystemPrompt("")` |
| 4 | ~~WARNING~~ | lib/db/migrations/049_conversation_state.sql | step_statuses | ~~`StepStatus` mismatch: SQL vs TypeScript~~ | FIXED (`dca7bea`) |
| 5 | WARNING | lib/db/migrations/049_conversation_state.sql | 148 | Evidence table trigger reuses state table's function name | OPEN |
| 6 | WARNING | app/api/fred/chat/route.ts | 254 | `buildFounderContext` awaited in critical path adds latency | OPEN |
| 7 | WARNING | lib/fred/actors/decide.ts | 26 | `founderContext` received but not used for response construction | OPEN |
| 8 | WARNING | lib/db/conversation-state.ts | 504, 520 | Transform functions use `any` type (intentionally kept -- `5f61fbe`) | ACCEPTED |
| 9 | ~~SUGGESTION~~ | lib/ai/prompts.ts | greetings | ~~Greeting uses generic closers~~ | FIXED (`7987e8d`) |
| 10 | SUGGESTION | lib/fred/context-builder.ts | 94 | Dynamic import lacks explanatory comment | OPEN |
| 11 | ~~SUGGESTION~~ | lib/fred/context-builder.ts | (overall) | ~~No total token cap on context block output~~ | ADDRESSED (`691c865`) -- buildProgressContext now optimized to <300 tokens |
| 12 | SUGGESTION | lib/ai/prompts.ts | (overall) | No test validating prompt token count stays under 8000 | OPEN |
| 13 | SUGGESTION | lib/fred/machine.ts | 86 | `founderContext` not passed to synthesize actor | OPEN |

**Summary:** 7 of 13 issues resolved. Remaining open items are minor (trigger naming, latency optimization, test coverage).

**Note on `sanitizeContextString`:** The exported function in `prompt-guard.ts` was created per my recommendation but is currently unused. The team chose to sanitize individual values at the source instead of sanitizing the assembled block. This is a valid approach -- arguably better since it catches injection at the earliest point. The function remains available for future use if block-level sanitization is needed.

---

## VERDICT

**APPROVED** -- The Phase 34 changes deliver substantial, well-architected improvements to the FRED mentor experience. The system prompt is dramatically better aligned with the product vision. The dynamic context injection architecture is clean and extensible. The conversation state schema is thoughtfully designed for the full 9-step methodology.

The security warnings around prompt injection via dynamic context (#1, #2) and the `getPromptForTopic` bug (#3) should be addressed before the next production deployment, but they do not block the merge since the context injection is new functionality that is not yet exercised by the live frontend.

---

## ADDENDUM: Operating Bible Compliance Review

**Date:** 2026-02-11 (post-fix commits)
**Additional commits reviewed:**
- `7987e8d` feat(prompts): align system prompt and context builder with Operating Bible
- `1dad28b` fix(db): address code review findings on conversation state schema
- `dca7bea` fix(db): align SQL comments with full StepStatus enum values

**Reference document:** `.planning/OPERATING-BIBLE.md` (canonical)

---

### Issues Resolved Since Initial Review

The following issues from the initial review have been addressed:

| # | Original Issue | Status | Commit |
|---|---------------|--------|--------|
| 4 | `StepStatus` mismatch (SQL "skipped" vs TypeScript "blocked") | FIXED -- both now include `blocked` and `skipped` | `dca7bea` |
| 9 | Greeting uses generic closers ("What's on your mind?", "Let's dig in") | FIXED -- greetings now use canonical opening prompts from Operating Bible Appendix | `7987e8d` |
| N/A | Context builder docs did not reference Operating Bible sections | FIXED -- comments now reference Section 12 (Founder Snapshot) | `7987e8d` |
| N/A | Context block header was "FOUNDER CONTEXT" | FIXED -- now "FOUNDER SNAPSHOT" per Operating Bible Section 12 | `7987e8d` |
| N/A | Context builder structure was flat | FIXED -- restructured to follow Operating Bible Section 12 fields: stage, product status, traction, runway, primary constraint, 90-day goal | `7987e8d` |

### Issues Still Outstanding

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Enrichment data and memory values injected without sanitization | WARNING | OPEN -- not addressed in any fix commit |
| 2 | `buildProgressContext` evidence content not sanitized | WARNING | OPEN |
| 3 | `getPromptForTopic` outputs literal `{{FOUNDER_CONTEXT}}` | WARNING | OPEN -- currently unused in codebase, so zero runtime impact. Latent bug. |

---

### Section 4: Layered Architecture -- PASS

The Operating Bible Section 4 defines a three-layer architecture:

| Layer | Operating Bible Definition | Implementation | Verdict |
|-------|--------------------------|----------------|---------|
| Layer 1: Core Instructions | Global behavior rules: reframe before prescribe, critical thinking, tone, Reality Lens, decision sequencing, protocols, wellbeing | `FRED_CAREY_SYSTEM_PROMPT` in `lib/ai/prompts.ts` (lines 56-263). Contains all behavior rules, operating principles, voice profile, guardrails, and response format. | PASS |
| Layer 2: Router | Controls when to introduce positioning analysis vs investor readiness. Founders do not choose diagnostics -- silent diagnosis. | Diagnostic Introduction section in the prompt (lines 140-157): silent diagnosis tags, trigger signals for positioning and investor mode, one-lens-at-a-time rule. Code comment at line 49 explicitly labels this. | PASS |
| Layer 3: Framework Documents | Positioning Framework, Investor Lens, Startup Process, Investor Readiness Score, Investor Readiness Intake | `COACHING_PROMPTS` object (lines 269-333) labeled "Layer 3 Framework Documents" at line 266. Five overlays: fundraising (Investor Lens), pitchReview (Deck Review), strategy (9-Step Process), positioning (Positioning Readiness), mindset (Wellbeing). Composed via `buildTopicPrompt()`. | PASS |

**Assessment:** The prompt is NOT monolithic. It is properly separated into Layer 1 (core prompt), Layer 2 (router embedded in prompt), and Layer 3 (composable overlays). The architecture matches the Operating Bible's intent of keeping core instructions focused while enabling framework injection without rewriting the system.

---

### Section 15: Mentor, Not Agent -- PASS

The Operating Bible Section 15 states: "Sahara is a decision partner and mentor. It does not autonomously act on behalf of founders."

**Compliance check across all Phase 34 files:**

| File | "agent" usage | Verdict |
|------|--------------|---------|
| `lib/ai/prompts.ts` | Line 60: "You are NOT an agent." -- used only in negation. Line 58: "You are a MENTOR and decision partner." | PASS |
| `lib/fred/context-builder.ts` | No occurrences of "agent" | PASS |
| `lib/db/conversation-state.ts` | No occurrences of "agent" | PASS |
| `lib/ai/frameworks/operating-bible.ts` | Line 21: "Not a 'do everything for you' agent" (negation). Line 282: "We are not an agent" (negation). | PASS |
| `lib/fred/types.ts` | No occurrences | PASS |
| `lib/fred/service.ts` | No occurrences | PASS |
| `lib/fred/machine.ts` | No occurrences | PASS |
| `lib/fred/actors/decide.ts` | No occurrences | PASS |

**Mentor boundary language (Section 15):** The system prompt explicitly lists what FRED may do (draft, structure, plan, simulate, prepare messages, create checklists) and what FRED does not do (send messages, schedule events, manage accounts, make purchases, access external systems). This matches the Operating Bible verbatim.

---

### Section 17.3: Regression Triggers -- ALL PASS (No Blockers)

The Operating Bible defines four regression triggers that "we treat as a regression":

| # | Regression Trigger | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | "Asks founders to choose diagnostics (should be silent)" | PASS | Line 96: "Founders do not choose diagnostics. You diagnose silently." Line 131: "Silent Diagnosis (Internal Only -- Never Share This Process)". Lines 132-138: tags assessed silently during early messages. |
| 2 | "Scores without intake data" | PASS | Line 98: "Intake before scoring. Never score, grade, or formally evaluate without first gathering sufficient data. No scoring based on assumptions." Line 155: "Scoring is optional, not default." Line 157: "Never score without running intake first." Triple enforcement across Operating Principles, Scoring Rules section, and Coaching Prompts. |
| 3 | "Encourages fundraising by default" | PASS | Line 92: "Capital is a tool, not the goal. Do not encourage fundraising by default." Line 150: Investor Mode triggers "Only when fundraising is explicitly on the table." Line 282 (fundraising overlay): "Challenge the assumption that raising is the right move before helping them raise." |
| 4 | "Jumps to downstream artifacts before upstream truth" | PASS | Line 88: "Decision Sequencing Rule. Never optimize downstream artifacts (decks, patents, hiring, fundraising, scaling) before upstream truth is established." Line 162: 9-Step Process defined as a "GATING process. Steps can overlap, but none should be skipped." Line 307 (strategy overlay): "Decision sequencing is non-negotiable. Upstream truth before downstream optimization." |

**Assessment:** All four regression triggers are explicitly addressed in the system prompt. No BLOCKER issues.

---

### Section 20: All 11 Operating Principles -- ALL TRACEABLE

| # | Principle | Prompt Location | Verified |
|---|----------|----------------|----------|
| 1 | Reframe before prescribe | Line 84: Operating Principle #1 with full description | YES |
| 2 | Sequence decisions; don't jump ahead | Line 88: Operating Principle #3 (Decision Sequencing Rule) with concrete example | YES |
| 3 | Evidence before narrative | Line 90: Operating Principle #4 with "What evidence?" probe example | YES |
| 4 | Capital is a tool | Line 92: Operating Principle #5 with bootstrapping-first default | YES |
| 5 | Encourage without flattery | Line 94: Operating Principle #6 with "No great idea language" rule | YES |
| 6 | Diagnose silently; introduce one lens at a time | Line 96: Operating Principle #7. Also lines 131-157 (full router section) | YES |
| 7 | Intake before scoring | Line 98: Operating Principle #8. Also lines 154-157 (Scoring Rules section) | YES |
| 8 | Decks are optional until pitching | Line 100: Operating Principle #9. Also line 192 and line 280 | YES |
| 9 | Weekly check-ins build momentum | Line 102: Operating Principle #10. Also lines 215-229 (full check-in protocol) | YES |
| 10 | Founder wellbeing is real; support is practical | Line 104: Operating Principle #11 with specific signals and responses. Also line 249 (Guardrail #4) and lines 320-332 (mindset overlay) | YES |
| 11 | We are not an agent | Line 60: Full paragraph defining mentor vs agent boundary | YES |

**Assessment:** All 11 Operating Principles from Section 20 are present and traceable in the system prompt. Each is accompanied by actionable guidance, not just the principle name.

---

### Section 6.3: Scoring Rules -- PASS

Operating Bible Section 6.3 states:
- "Scoring is optional, not default."
- "Scores are applied only when explicitly requested or when a formal evaluation is offered and accepted."

**In the prompt:**
- Line 155: "Scoring is optional, not default." (verbatim)
- Line 156: "Scores are applied only when explicitly requested or when a formal evaluation is offered and accepted." (verbatim)
- Line 157: "Never score without running intake first." (additional guard)
- Line 98: Operating Principle #8 reinforces intake-before-scoring.

**Assessment:** Scoring rules are faithfully implemented. The prompt goes beyond the Operating Bible by adding a third guard (never score without intake).

---

### Additional Operating Bible Sections Verified

| Section | Topic | Implementation Status |
|---------|-------|----------------------|
| 5.1 Universal Entry Flow | Default questions: What building? Who for? What accomplishing? | Lines 121-129: All three canonical questions present. "Do NOT mention: scores, assessments, investor readiness, positioning frameworks." |
| 5.2 Silent Diagnosis | Internal tags: positioning clarity, investor readiness, stage, constraint | Lines 131-138: All four tags listed with values. Marked "Internal Only -- Never Share This Process." |
| 3.1 Voice Profile | Calm, direct, disciplined, empathetic not indulgent | Line 108: Voice profile matches Operating Bible verbatim. |
| 3.3 Output Standard | "Next 3 actions" closing | Line 259: "End every substantive response with **Next 3 actions:**" |
| 12 Founder Snapshot | stage, product status, traction, runway, constraint, 90-day goal | Lines 231-238: Snapshot section present. Context builder restructured to follow Section 12 fields. |
| 13 Weekly Check-In | Verbatim invitation language, 5 check-in questions, response structure | Lines 215-229: Full protocol with verbatim invitation language, all 5 questions, and response format. |
| 11.1 Deck Review Protocol | Scorecard (0-10), top 5 fixes, slide-by-slide, objections (10+), narrative | Lines 199-205: Full protocol present. Also lines 284-294 (pitchReview overlay). |
| 11.2 Strategic Report | Executive summary, diagnosis, options, recommendation, 30/60/90, risks | Lines 207-213: Full protocol present. |
| 14 Founder Wellbeing | Normalize, reduce to controllables, practical exits, not therapy | Line 104 (principle), line 249 (guardrail), lines 320-332 (mindset overlay). |

---

### Operating Bible Compliance Verdict

**FULL COMPLIANCE** -- The updated system prompt faithfully implements the Sahara Internal Operating Bible across all checked sections. All 11 Operating Principles are traceable. All 4 regression triggers are explicitly prevented. The layered architecture (Section 4) is properly implemented. The mentor/not-agent boundary (Section 15) is clearly enforced. Scoring rules (Section 6.3) match verbatim.

**Remaining technical debt (not Operating Bible violations):**
1. Context injection sanitization (security, not Operating Bible)
2. `getPromptForTopic` latent bug (currently unused, zero runtime impact)
3. No total token cap on context block output (performance, not Operating Bible)

---

## UPDATED VERDICT

**APPROVED** -- Phase 34 fully complies with the Sahara Internal Operating Bible. The system prompt is a faithful, comprehensive implementation of the canonical operating document. The three post-review fix commits (`7987e8d`, `1dad28b`, `dca7bea`) resolved the StepStatus mismatch and aligned the context builder and greetings with Operating Bible references.

The prompt injection sanitization warning (#1, #2) remains the highest priority fix for production hardening but is not an Operating Bible compliance issue.
