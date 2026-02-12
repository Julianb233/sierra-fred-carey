# Phase 39 Code Review: Missing Frameworks & Gated Reviews

**Commit:** d782112c0f5723d42b782f046fbe0341bd834837
**Files reviewed:** 8 (+466/-12 lines)
**Reviewer:** Claude (retroactive)
**Date:** 2026-02-11

## Summary

Phase 39 wires three investor-readiness capabilities into the FRED conversation pipeline:
1. Automatic IRS scoring from conversation data
2. Deck Request Protocol with verdict-first enforcement
3. Reality Lens gating on pitch deck review API

The implementation follows established patterns from Phases 36-38 (non-blocking loads, fire-and-forget writes, conditional prompt injection, graceful degradation). Code quality is good with clean separation of concerns.

## File-by-File Review

### 1. lib/fred/irs/engine.ts

**Changes:** Added `calculateIRSFromConversation()` adapter + helpers (`parseNumericHint`, `mapProductStatus`)

**Lines added:** ~72 lines (lines 356-427)

**Strengths:**
- Clean adapter pattern: maps loose conversation data to structured IRSInput without modifying the core engine
- `parseNumericHint()` handles "$50k", "10000", "5" with k/K expansion — good defensive parsing for common founder input patterns
- `mapProductStatus()` covers comprehensive set of product status strings: idea/concept/proto/mvp/beta/launched/live/market/scaling
- Reuses existing `normalizeStage()` already in the module — good code reuse
- Adapter pattern makes conversation-to-IRS mapping testable independently of the scoring engine

**Concerns:**
- `conversationExcerpt.slice(0, 2000)` is used as `productInfo.description` — this is a rough heuristic; the entire last message may not be about the product. Could lead to scoring inaccuracies if conversation drifts.
- `parseNumericHint()` doesn't handle "M" or "million" (e.g., "$2M ARR", "$500K MRR") — founders commonly use these abbreviations, especially for ARR/revenue metrics
- No input validation on founderSnapshot keys — relies on caller passing correct shape. Could silently fail if upstream schema changes.
- `parseNumericHint()` uses simple regex replacement — doesn't validate that numbers are in reasonable ranges (e.g., "999999K users" would parse to 999,999,000 without sanity check)

**Severity:** Low — these are edge cases that affect scoring accuracy, not correctness. The adapter will still function and produce scores, just potentially less accurate in edge cases.

**Recommendation:** Extend `parseNumericHint()` to handle M/B suffixes. Consider adding basic range validation or logging when values seem unreasonable.

---

### 2. lib/fred/actors/execute.ts

**Changes:** Added `triggerIRSScoring()` (fire-and-forget IRS trigger) and `extractAndPersistVerdict()` (regex verdict detection)

**Lines added:** ~105 lines

**Strengths:**
- Fire-and-forget pattern with `.catch()` is correct — IRS scoring should never block the response or cause visible failures
- 24h cooldown via `getLatestIRS()` prevents excessive API calls and respects that IRS doesn't change minute-to-minute
- 3+ investor signals threshold prevents premature scoring when founder just mentions fundraising once
- Verdict regex patterns are comprehensive: "my verdict is", "IC verdict:", "verdict --" with markdown bold handling (`**yes**` support)
- Verdict normalization (lowercase + space-to-hyphen) correctly handles "Not Yet" → "not-yet"
- Integration is clean: both functions are called from `updateConversationState()` which is already fire-and-forget

**Concerns:**
- `triggerIRSScoring()` calls `getActiveMode(userId)` which is a separate DB read — the ModeContext is already available in the caller (`updateConversationState`) via `conversationState` param. Could avoid the extra read by passing `modeContext` down as a parameter. Not a bug, just an unnecessary DB round-trip (~5-15ms per request when IRS triggers).
- VERDICT_PATTERNS array: if FRED says "my verdict is not yet ready" it would match "not" or "not yet" depending on regex greediness. The pattern uses `\b` word boundary which should handle this, but there are edge cases where conversational language could trigger false matches.
- No upper bound on `latestIRS` age check — if `getLatestIRS()` returns null `createdAt`, the cooldown is skipped (correct fallback behavior, just worth noting)
- `extractAndPersistVerdict()` only looks at the assistant response text — doesn't account for multi-turn verdict delivery where FRED might say "let me think about this" then deliver verdict in next message

**Severity:** Low — the extra DB read is a minor perf concern. Verdict detection edge cases are unlikely in practice given FRED's communication patterns.

**Recommendation:** Pass `modeContext` from caller to avoid redundant `getActiveMode()` call. Consider adding verdict confidence scoring if edge cases become an issue.

---

### 3. lib/ai/prompts.ts

**Changes:** Added `buildIRSPromptBlock()`, `buildDeckProtocolBlock()`, `buildDeckReviewReadyBlock()`, `normalizeInvestorStage()`

**Lines added:** ~178 lines (lines 667-837)

**Strengths:**
- `buildIRSPromptBlock()` handles three states cleanly: no IRS, stale IRS (>7 days), fresh IRS with full breakdown
- Stage benchmark comparison (+/- arrows) gives FRED contextual scoring reference — helps guide conversation based on what's normal for the founder's stage
- "Do NOT mention the score system to the founder unless they ask" correctly enforces Operating Bible principle
- `buildDeckProtocolBlock()` encodes the full decision tree: no verdict → verdict + should request → verdict + should NOT request → deck already uploaded
- Verdict-before-deck enforcement is explicit and clear in the prompt text
- `buildDeckReviewReadyBlock()` returns empty string when conditions not met — safe for string concatenation in chat route
- All blocks use clear section headers (## INVESTOR READINESS SCORE, ## DECK REQUEST PROTOCOL) that structure the prompt for LLM parsing

**Concerns:**
- `buildDeckProtocolBlock()` hardcodes `mentionsFundraising: true` in the `shouldRequestDeck()` call — this is always true when in investor-readiness mode, but it means the other signal booleans (`mentionsValuation`, `mentionsDeck`, `asksAboutReadiness`) are always false, potentially limiting the deck request logic's responsiveness to specific conversation signals. The `shouldRequestDeck()` function is designed to be more granular, but here it's only using the verdict + stage inputs.
- `IRS_FRESHNESS_DAYS = 7` is hardcoded constant — might want configurability later, but fine for now as a reasonable default
- `normalizeInvestorStage()` duplicates similar logic in `engine.ts` `normalizeStage()` — different types (`InvestorStage` vs `StartupStage`) justify this, but there's slight DRY concern. Could extract to shared utility if more stage normalizations are needed.
- `buildIRSPromptBlock()` shows top 3 strengths and weaknesses — arbitrary limit that might hide relevant context if IRS identified 5+ issues

**Severity:** Low — the hardcoded signals are a simplification that works for the current flow. The other concerns are minor code quality points.

**Recommendation:** Consider passing actual conversation signals to `buildDeckProtocolBlock()` so `shouldRequestDeck()` gets full context. Extract stage normalization to shared utility if needed elsewhere.

---

### 4. app/api/fred/chat/route.ts

**Changes:** Added Phase 39 block loading in investor-readiness mode, wired into fullContext assembly

**Lines added:** ~52 lines (lines 418-469)

**Strengths:**
- Conditional loading (only when `activeMode === "investor-readiness"`) prevents unnecessary DB reads for non-investor conversations
- Non-blocking try/catch matches the established pattern from Phases 36-38 — failures don't crash the response
- Block assembly order is logical: founderContext → stepGuidance → RL → framework → IRS → deckProtocol → deckReview
- `hasUploadedDeck = false` with TODO comment — honest about the gap, makes it easy to search for when implementing file upload detection

**Concerns:**
- **Performance issue:** `getActiveMode(userId)` is called TWICE in the route:
  - First call at lines 364-365 (Phase 38 block) stores result in `persisted` variable
  - Second call at line 436 (Phase 39 block) fetches mode context again for `formalAssessments`
  - Should reuse the `persisted` variable from the Phase 38 block
- **Performance issue:** `getRealityLensGate(userId)` is also called twice:
  - First call in Phase 37 block (around line 300-350, outside shown range)
  - Second call at line 444 inside the Phase 39 block for deck review check
- Each redundant DB read adds ~5-15ms latency per request in the hot path
- This is a compounding issue: every investor-readiness conversation pays the cost twice per request

**Severity:** Medium — duplicate DB reads per request in the hot path. Not a bug (code works correctly) but a performance concern that should be addressed in next optimization pass. Impact scales with traffic.

**Recommendation:** Hoist `getActiveMode()` and `getRealityLensGate()` results from earlier blocks and reuse them in Phase 39 block. Add a comment explaining variable reuse to prevent future duplication.

---

### 5. lib/db/conversation-state.ts

**Changes:** Extended `ModeContext.formalAssessments` with `verdictIssued`, `verdictValue`, `deckRequested`

**Lines added:** ~23 lines (type extensions)

**Strengths:**
- Type extension is backward-compatible — existing code setting `offered`/`accepted` still works
- `verdictValue` uses union type `"yes" | "no" | "not-yet" | null` — clean, explicit, type-safe
- `updateFormalAssessments()` already handles partial updates via `Partial<>` — new fields work automatically without function changes
- Field naming is clear and self-documenting
- Null defaults allow graceful handling of missing data

**Concerns:** None — this is a clean type extension that follows established patterns.

**Severity:** None

**Recommendation:** None needed. Well-executed type extension.

---

### 6. app/api/fred/pitch-review/route.ts

**Changes:** Added Reality Lens gate check before pitch review execution

**Lines added:** ~27 lines (lines 41-67)

**Strengths:**
- 403 with `RL_GATE_BLOCKED` code is clean API design — clients can handle this specifically vs. generic 403s
- `blockingDimensions` array tells the client exactly what's missing — enables actionable error messages
- Guidance text is user-friendly: "Chat with FRED to work through your {dims} assumptions"
- Gate check is wrapped in try/catch with non-blocking fallback — if RL check fails due to DB error, review proceeds (graceful degradation)
- Matches the gating pattern from Phase 37 — consistent architecture

**Concerns:**
- The gate check uses `checkGateStatus(rlGate, "pitch_deck")` — this means "pitch_deck" must be a recognized downstream request in the `DOWNSTREAM_REQUIRED_DIMENSIONS` mapping in `conversation-state.ts`. If it's missing from that mapping, the gate would always return "open" (false negative).
  - **Verified:** "pitch_deck" exists in the mapping (Phase 37 implementation), so this is not an issue.
- Error message formatting: `dimensions.map(d => d.replace('_', ' ')).join(', ')` creates a comma-separated list with no "and" before the last item ("Demand, Economics, Distribution" vs. "Demand, Economics, and Distribution"). Minor UX polish opportunity.

**Severity:** None (verified that mapping exists)

**Recommendation:** Consider adding "and" before final dimension in error message for better readability.

---

### 7. lib/fred/pitch/types.ts

**Changes:** Added `SlideObjection` interface

**Lines added:** ~7 lines

**Strengths:**
- Clean interface with `question`, `knockoutAnswer`, `severity`
- Severity enum `("high" | "medium" | "low")` matches established patterns elsewhere in codebase
- Added `objections: SlideObjection[]` to existing `SlideAnalysis` interface — backward-compatible (optional field)
- Type is well-scoped: one purpose, clear contract

**Concerns:** None — straightforward type addition.

**Severity:** None

**Recommendation:** None needed. Clean type definition.

---

### 8. lib/fred/pitch/analyzers/index.ts

**Changes:** Updated schema and prompt to generate per-slide investor objections

**Lines added:** ~14 lines

**Strengths:**
- Zod schema (`SlideObjectionSchema`) validates AI output structure — prevents malformed data from corrupting analysis
- Prompt is specific: "2-3 skeptical investor questions a VC partner would ask" with knockout answers
- Severity guidance in prompt is actionable: "high = deal-breaker if unanswered, medium = concerns but manageable, low = minor flag"
- Result capped at 3 objections via `.slice(0, 3)` — prevents token bloat and keeps feedback focused
- Default empty array fallback (`result.objections || []`) is good defensive coding

**Concerns:**
- No validation that objections are actually different from each other — AI could theoretically return duplicates or near-duplicates
- No minimum requirement — AI could return 0 objections and that would be accepted (though prompt asks for 2-3)
- Prompt doesn't specify that objections should be distinct from the existing criticisms/suggestions in other fields

**Severity:** Low — these are minor quality concerns that would only surface if AI output degrades. Zod schema ensures structure is valid even if content quality varies.

**Recommendation:** Consider adding uniqueness validation or min length requirement if duplicate objections become an issue in practice.

---

## Overall Assessment

**Quality:** GOOD — Phase 39 follows established patterns from Phases 36-38 (non-blocking loads, fire-and-forget writes, conditional prompt injection, graceful degradation). The code is production-ready.

**Architecture:** Clean separation of concerns:
- Engine adapter (`irs/engine.ts`) — conversion logic isolated
- Trigger logic (`actors/execute.ts`) — fire-and-forget pattern
- Prompt construction (`prompts.ts`) — formatting and decision trees
- Pipeline wiring (`chat/route.ts`) — integration into conversation flow
- API gating (`pitch-review/route.ts`) — enforcement at endpoint level

**Code patterns:**
- Consistent with Phases 36-38 architecture
- Type-safe (TypeScript interfaces, Zod validation)
- Defensive (fallbacks, try/catch, null checks)
- Non-blocking (fire-and-forget, graceful degradation)

## Top Recommendations

### 1. Deduplicate DB reads in chat route (MEDIUM priority)
**Issue:** `getActiveMode()` and `getRealityLensGate()` are each called twice in the chat route.

**Impact:** ~10-30ms added latency per investor-readiness conversation request. Scales with traffic.

**Fix:**
```typescript
// Phase 38 block (lines 364-365)
const persisted = await getActiveMode(userId);
const activeMode = persisted.mode;

// Phase 39 block — REUSE persisted variable instead of calling getActiveMode() again
// BEFORE (line 436):
const persisted = await getActiveMode(userId); // ❌ redundant DB call

// AFTER:
// persisted is already available from Phase 38 block ✅
const formalAssessments = persisted.modeContext.formalAssessments;
```

Same pattern for `getRealityLensGate()` — hoist from Phase 37 block and reuse in Phase 39.

### 2. Extend parseNumericHint to handle M/B suffixes (LOW priority)
**Issue:** Founders commonly say "$2M ARR" or "$500K MRR" but `parseNumericHint()` only handles "k/K".

**Impact:** IRS scoring inaccuracies for revenue/traction metrics.

**Fix:**
```typescript
function parseNumericHint(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,kKmMbB]/gi, (match) => {
    const lower = match.toLowerCase();
    if (lower === 'k') return '000';
    if (lower === 'm') return '000000';
    if (lower === 'b') return '000000000';
    return '';
  });
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
```

### 3. Wire hasUploadedDeck when file upload is implemented (LOW priority)
**Issue:** `hasUploadedDeck = false` is hardcoded with TODO comment in chat route.

**Impact:** Deck protocol block can't detect when founder has already uploaded a deck, leading to redundant requests.

**Fix:** When file upload feature is built, detect deck uploads from attachments table and pass actual boolean.

## No Blockers

Code is production-ready with the noted optimization opportunities. The duplicate DB reads should be addressed in the next optimization pass, but they don't prevent deployment.

All 4 Phase 39 success criteria are met:
1. ✅ IRS framework fully implemented
2. ✅ Deck Request Protocol formalized
3. ✅ Pitch Deck Review gated behind Reality Lens
4. ✅ Per-slide investor objections generated
