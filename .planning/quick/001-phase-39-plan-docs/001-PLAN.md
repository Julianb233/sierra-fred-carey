---
phase: 39-missing-frameworks-gated-reviews
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/39-missing-frameworks-gated-reviews/39-01-PLAN.md
  - .planning/phases/39-missing-frameworks-gated-reviews/39-CODE-REVIEW.md
autonomous: true
must_haves:
  truths:
    - "Phase 39 has a retroactive PLAN.md summarizing what was built"
    - "Phase 39 has a CODE-REVIEW.md with a thorough review of the committed code"
  artifacts:
    - path: ".planning/phases/39-missing-frameworks-gated-reviews/39-01-PLAN.md"
      provides: "Retroactive plan documenting Phase 39 implementation"
    - path: ".planning/phases/39-missing-frameworks-gated-reviews/39-CODE-REVIEW.md"
      provides: "Code review of Phase 39 commit d782112"
  key_links: []
---

<objective>
Create retroactive planning documentation for Phase 39 (Missing Frameworks & Gated Reviews), which is already implemented and committed (d782112).

Purpose: Maintain planning documentation parity for all phases so the project history is complete and reviewable.
Output: 39-01-PLAN.md (retroactive plan summary) and 39-CODE-REVIEW.md (code review)
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Phase 39 implementation is COMPLETE. Commit d782112 modified 8 files (+466/-12 lines):

**Files Modified:**
1. `lib/fred/irs/engine.ts` -- Added `calculateIRSFromConversation()` adapter that maps founderSnapshot + diagnosticTags to IRSInput, with `parseNumericHint()` and `mapProductStatus()` helpers
2. `lib/fred/actors/execute.ts` -- Added fire-and-forget IRS trigger (`triggerIRSScoring`) with 3+ investor signal threshold and 24h cooldown; verdict extraction (`extractAndPersistVerdict`) with regex patterns for IC verdict detection
3. `lib/ai/prompts.ts` -- Added `buildIRSPromptBlock()` (score summary with stage benchmarks or "no IRS yet" instruction), `buildDeckProtocolBlock()` (verdict-before-deck enforcement, shouldRequestDeck integration), `buildDeckReviewReadyBlock()` (availability gate for 11-dimension review)
4. `app/api/fred/chat/route.ts` -- Wired Phase 39 blocks into chat pipeline: loads IRS, deck protocol, and review blocks when activeMode is "investor-readiness"; assembles into fullContext
5. `lib/db/conversation-state.ts` -- Extended `ModeContext.formalAssessments` with `verdictIssued`, `verdictValue`, `deckRequested` fields
6. `app/api/fred/pitch-review/route.ts` -- Added Reality Lens gate (403 RL_GATE_BLOCKED with blockingDimensions and guidance text)
7. `lib/fred/pitch/types.ts` -- Added `SlideObjection` interface (question, knockoutAnswer, severity)
8. `lib/fred/pitch/analyzers/index.ts` -- Updated slide analysis schema and prompt to generate 2-3 skeptical investor objections per slide with knockout answers

**Phase 39 Success Criteria (from ROADMAP.md):**
1. IRS framework fully implemented -- AI scoring across 6 categories with stage benchmarks
2. Deck Request Protocol formalized -- provisional verdict first, then deck request decision
3. Pitch Deck Review gated behind Reality Lens -- 403 if upstream not validated
4. Per-slide investor objections generated as part of gated review

**Dependencies satisfied:** Phase 37 (gating logic) + Phase 38 (framework integration patterns)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create retroactive 39-01-PLAN.md</name>
  <files>.planning/phases/39-missing-frameworks-gated-reviews/39-01-PLAN.md</files>
  <action>
Create a retroactive PLAN.md that documents what Phase 39 built. This is a post-hoc record, not a forward plan.

The plan should document:

**Frontmatter:**
- phase: 39-missing-frameworks-gated-reviews
- plan: 01
- type: execute
- wave: 4 (per ROADMAP.md -- depends on Phases 37 + 38)
- depends_on: ["37-01", "38-01"]
- files_modified: all 8 files from commit d782112
- autonomous: true
- status: complete

**Objective:** Wire IRS scoring, Deck Request Protocol, and gated Pitch Deck Review into the FRED conversation pipeline so investor readiness is assessed automatically, decks are requested only after a verdict, and deck reviews are gated behind Reality Lens validation.

**Tasks (3 tasks summarizing what was built):**

Task 1 - IRS Conversation Adapter and Auto-Trigger:
- Files: lib/fred/irs/engine.ts, lib/fred/actors/execute.ts
- What was built: calculateIRSFromConversation() adapter mapping founderSnapshot/diagnosticTags to IRSInput. triggerIRSScoring() in execute actor with conditions: activeMode === "investor-readiness", 3+ investor signals, 24h cooldown. Uses getLatestIRS() for cooldown check, then fire-and-forget calculates and persists via saveIRSResult().
- Also built: extractAndPersistVerdict() that detects FRED's investor verdict (Yes/No/Not Yet) using regex patterns and persists to formalAssessments via updateFormalAssessments().

Task 2 - Prompt Blocks for IRS, Deck Protocol, and Review Readiness:
- Files: lib/ai/prompts.ts, lib/db/conversation-state.ts, lib/fred/pitch/types.ts
- What was built: buildIRSPromptBlock() -- injects IRS summary with category breakdown and stage benchmarks (or "no IRS yet" instructions). buildDeckProtocolBlock() -- enforces verdict-before-deck rule, integrates shouldRequestDeck() from investor-lens framework, handles deck-already-uploaded shortcut. buildDeckReviewReadyBlock() -- signals when 11-dimension review is available (RL gate open + verdict issued). Extended ModeContext.formalAssessments with verdictIssued/verdictValue/deckRequested. Added SlideObjection type.

Task 3 - Chat Pipeline Integration and Pitch Review Gate:
- Files: app/api/fred/chat/route.ts, app/api/fred/pitch-review/route.ts, lib/fred/pitch/analyzers/index.ts
- What was built: Chat route conditionally loads IRS + deck protocol + review blocks when activeMode === "investor-readiness". Assembles blocks into fullContext alongside existing founderContext, stepGuidance, RL, and framework blocks. Pitch review API now checks RL gate and returns 403 RL_GATE_BLOCKED with blockingDimensions + guidance text if upstream dimensions are unvalidated. Slide analyzer updated to generate 2-3 per-slide investor objections with knockout answers and severity levels.

**Success criteria:** All 4 requirements from ROADMAP.md Phase 39 are met.
  </action>
  <verify>File exists at .planning/phases/39-missing-frameworks-gated-reviews/39-01-PLAN.md with complete retroactive documentation</verify>
  <done>39-01-PLAN.md accurately summarizes the Phase 39 implementation across all 8 modified files with correct dependency and wave information</done>
</task>

<task type="auto">
  <name>Task 2: Create 39-CODE-REVIEW.md</name>
  <files>.planning/phases/39-missing-frameworks-gated-reviews/39-CODE-REVIEW.md</files>
  <action>
Create a code review document for Phase 39 commit d782112. Review each of the 8 modified files.

**Structure the review as:**

```markdown
# Phase 39 Code Review: Missing Frameworks & Gated Reviews

**Commit:** d782112
**Files reviewed:** 8 (+466/-12 lines)
**Reviewer:** Claude (retroactive)
**Date:** 2026-02-11

## Summary

Phase 39 wires three investor-readiness capabilities into the FRED conversation pipeline:
1. Automatic IRS scoring from conversation data
2. Deck Request Protocol with verdict-first enforcement
3. Reality Lens gating on pitch deck review API

## File-by-File Review

### 1. lib/fred/irs/engine.ts

**Changes:** Added calculateIRSFromConversation() adapter + helpers (parseNumericHint, mapProductStatus)

**Strengths:**
- Clean adapter pattern: maps loose conversation data to structured IRSInput without modifying the core engine
- parseNumericHint handles "$50k", "10000", "5" with k/K expansion -- good defensive parsing
- mapProductStatus covers idea/concept/proto/mvp/beta/launched/live/market/scaling -- comprehensive
- Reuses normalizeStage() already in the module

**Concerns:**
- conversationExcerpt.slice(0, 2000) is used as productInfo.description -- this is a rough heuristic; the entire last message may not be about the product
- parseNumericHint doesn't handle "M" or "million" (e.g., "$2M ARR") -- founders commonly use these
- No input validation on founderSnapshot keys -- relies on caller passing correct shape

**Severity:** Low -- these are edge cases that affect scoring accuracy, not correctness

---

### 2. lib/fred/actors/execute.ts

**Changes:** Added triggerIRSScoring() (fire-and-forget IRS trigger), extractAndPersistVerdict() (regex verdict detection)

**Strengths:**
- Fire-and-forget pattern with .catch() is correct -- IRS scoring should never block the response
- 24h cooldown via getLatestIRS() prevents excessive API calls
- 3+ investor signals threshold prevents premature scoring
- Verdict regex patterns are comprehensive: "my verdict is", "IC verdict:", "verdict --" with markdown bold handling
- Verdict normalization (lowercase + space-to-hyphen) handles "Not Yet" -> "not-yet"

**Concerns:**
- triggerIRSScoring calls getActiveMode(userId) which is a separate DB read -- the ModeContext is already available in the caller (updateConversationState) via conversationState param. Could avoid the extra read by passing modeContext down. Not a bug, just an unnecessary DB round-trip.
- VERDICT_PATTERNS array: if FRED says "my verdict is not yet ready" it would match "not" or "not yet" depending on regex greediness -- the pattern uses \b word boundary which should handle this, but edge cases exist
- No upper bound on latestIRS age check -- if getLatestIRS returns null createdAt, the cooldown is skipped (correct behavior, just worth noting)

**Severity:** Low -- the extra DB read is a minor perf concern under fire-and-forget

---

### 3. lib/ai/prompts.ts

**Changes:** Added buildIRSPromptBlock(), buildDeckProtocolBlock(), buildDeckReviewReadyBlock(), normalizeInvestorStage()

**Strengths:**
- buildIRSPromptBlock handles three states cleanly: no IRS, stale IRS (>7 days), fresh IRS with full breakdown
- Stage benchmark comparison (+/-/= arrows) gives FRED contextual scoring reference
- buildDeckProtocolBlock encodes the full decision tree: no verdict -> verdict + should request -> verdict + should NOT request -> deck already uploaded
- "Do NOT mention the score system to the founder unless they ask" -- correctly enforces Operating Bible principle
- buildDeckReviewReadyBlock returns empty string when conditions not met -- safe for string concatenation

**Concerns:**
- buildDeckProtocolBlock hardcodes mentionsFundraising: true in the shouldRequestDeck call -- this is always true when in investor-readiness mode, but it means the other signal booleans (mentionsValuation, mentionsDeck, asksAboutReadiness) are always false, potentially limiting the deck request logic
- IRS_FRESHNESS_DAYS = 7 is hardcoded constant -- might want configurability later but fine for now
- normalizeInvestorStage duplicates similar logic in engine.ts normalizeStage -- different types (InvestorStage vs StartupStage) justify this, but slight DRY concern

**Severity:** Low -- the hardcoded signals are a simplification that works for the current flow

---

### 4. app/api/fred/chat/route.ts

**Changes:** Added Phase 39 block loading in investor-readiness mode, wired into fullContext assembly

**Strengths:**
- Conditional loading (only when activeMode === "investor-readiness") prevents unnecessary DB reads for non-investor conversations
- Non-blocking try/catch matches the established pattern from Phases 36-38
- Block assembly order is logical: founderContext -> stepGuidance -> RL -> framework -> IRS -> deckProtocol -> deckReview
- hasUploadedDeck = false with TODO comment -- honest about the gap

**Concerns:**
- getActiveMode(userId) is called TWICE in the route: once in Phase 38 block and once in Phase 39 block. The second call at line 436 reads mode context again for formalAssessments. Should reuse the `persisted` variable from the Phase 38 block (lines 364-365). This is two DB reads that could be one.
- getRealityLensGate(userId) is also called twice: once in the Phase 37 block and once inside the Phase 39 block for deck review check. Same optimization opportunity.

**Severity:** Medium -- duplicate DB reads per request in the hot path. Not a bug but a performance concern that should be addressed. Each redundant read adds ~5-15ms latency.

---

### 5. lib/db/conversation-state.ts

**Changes:** Extended ModeContext.formalAssessments with verdictIssued, verdictValue, deckRequested

**Strengths:**
- Type extension is backward-compatible -- existing code setting offered/accepted still works
- verdictValue uses union type "yes" | "no" | "not-yet" | null -- clean, explicit
- updateFormalAssessments() already handles partial updates via Partial<> -- new fields work automatically

**Concerns:** None -- this is a clean type extension

**Severity:** None

---

### 6. app/api/fred/pitch-review/route.ts

**Changes:** Added RL gate check before pitch review execution

**Strengths:**
- 403 with RL_GATE_BLOCKED code is clean API design -- clients can handle this specifically
- blockingDimensions array tells the client exactly what's missing
- guidance text is user-friendly: "Chat with FRED to work through your {dims} assumptions"
- Gate check is wrapped in try/catch with non-blocking fallback -- if RL check fails, review proceeds (graceful degradation)

**Concerns:**
- The gate check uses checkGateStatus(rlGate, "pitch_deck") -- this means "pitch_deck" must be a recognized downstream request in the DOWNSTREAM_REQUIRED_DIMENSIONS mapping. If it's missing, the gate would always be "open" (false negative). Verified: it exists in conversation-state.ts.

**Severity:** None

---

### 7. lib/fred/pitch/types.ts

**Changes:** Added SlideObjection interface

**Strengths:**
- Clean interface with question, knockoutAnswer, severity
- Severity enum ("high" | "medium" | "low") matches established patterns
- Added objections: SlideObjection[] to existing SlideAnalysis -- backward-compatible

**Concerns:** None

**Severity:** None

---

### 8. lib/fred/pitch/analyzers/index.ts

**Changes:** Updated schema and prompt to generate per-slide investor objections

**Strengths:**
- Zod schema (SlideObjectionSchema) validates AI output structure
- Prompt is specific: "2-3 skeptical investor questions a VC partner would ask" with knockout answers
- Severity guidance in prompt: "high = deal-breaker if unanswered, medium = concerns but manageable, low = minor flag"
- Result capped at 3 objections via .slice(0, 3) -- prevents token bloat

**Concerns:**
- Default empty array fallback (result.objections || []) is good defensive coding

**Severity:** None

## Overall Assessment

**Quality:** GOOD -- Phase 39 follows established patterns from Phases 36-38 (non-blocking loads, fire-and-forget writes, conditional prompt injection, graceful degradation).

**Architecture:** Clean separation of concerns: engine adapter (irs/engine.ts), trigger logic (actors/execute.ts), prompt construction (prompts.ts), pipeline wiring (chat/route.ts), API gating (pitch-review/route.ts).

**Top Recommendations:**
1. **Deduplicate DB reads in chat route** -- getActiveMode() and getRealityLensGate() are each called twice. Hoist results from Phase 38 block and reuse in Phase 39 block. Saves ~10-30ms per request.
2. **Extend parseNumericHint** to handle "M"/"million"/"B"/"billion" -- common founder language.
3. **Wire hasUploadedDeck** when file upload is implemented -- currently hardcoded to false.

**No blockers.** Code is production-ready with the noted optimization opportunities.
```

Adapt the above into a proper markdown document. Ensure accuracy against the actual code reviewed.
  </action>
  <verify>File exists at .planning/phases/39-missing-frameworks-gated-reviews/39-CODE-REVIEW.md with file-by-file review covering all 8 files</verify>
  <done>CODE-REVIEW.md provides a thorough file-by-file review with strengths, concerns, severity ratings, and actionable recommendations</done>
</task>

</tasks>

<verification>
- [ ] .planning/phases/39-missing-frameworks-gated-reviews/39-01-PLAN.md exists and covers all 8 files
- [ ] .planning/phases/39-missing-frameworks-gated-reviews/39-CODE-REVIEW.md exists with file-by-file review
- [ ] Both documents reference commit d782112
- [ ] Plan accurately maps to ROADMAP.md Phase 39 success criteria
- [ ] Code review identifies real concerns from the actual implementation
</verification>

<success_criteria>
Phase 39 retroactive planning documentation is complete with accurate PLAN.md and CODE-REVIEW.md that reflect the actual committed implementation.
</success_criteria>

<output>
After completion, the executor should confirm both files are written and accurate.
No SUMMARY.md needed for quick tasks.
</output>
