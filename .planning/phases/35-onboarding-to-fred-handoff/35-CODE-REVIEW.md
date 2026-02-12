# Phase 35: Onboarding-to-FRED Handoff -- CODE REVIEW

**Reviewer:** reviewer
**Date:** 2026-02-11
**Commit reviewed:** `5c9ae9f` feat(context): onboarding-to-FRED handoff with first-conversation detection (Phase 35)

**Files changed:** 1 file (`lib/fred/context-builder.ts`), +88 / -4 lines

---

## OVERALL ASSESSMENT: APPROVED (with 2 warnings)

Phase 35 delivers a clean, well-designed onboarding handoff mechanism. The three-path branching logic correctly handles first conversation after onboarding, first conversation without onboarding, and returning users. The code is backward-compatible, non-blocking, and follows the existing architectural patterns established in Phase 34.

---

## REVIEW CRITERIA (from team-lead)

### 1. Does the handoff feel seamless? No repeated questions?

**PASS** -- The handoff instructions explicitly tell FRED "Do NOT re-ask for stage, industry, challenge, team size, revenue, or funding -- you already have this" (line 352). The returning-user path also says "Skip intake questions you already have answers to" (line 367). The first-conversation-after-onboarding path tells FRED to "Go deeper: ask about the specifics that onboarding didn't capture" and lists the 5 fields not captured by onboarding: product status, traction metrics, runway, 90-day goal, who their buyer is.

**Design note:** The onboarding hook (`lib/hooks/use-onboarding.ts`) captures: name, stage, industry, challenges, revenue_range, team_size, funding_history. The migration 050 fields (product_status, traction, runway, primary_constraint, ninety_day_goal) are NOT captured during onboarding -- the handoff correctly instructs FRED to gather these conversationally. This is the right design: less friction in onboarding, more depth in the first real conversation.

### 2. Is founder profile data sanitized before prompt injection?

**PARTIAL PASS (WARNING)** -- Enrichment data and semantic memory values ARE sanitized (via `sanitize()` wrapper from commit `94adddc`). However, core profile fields are NOT sanitized:

| Field | Source | Sanitized? | Risk |
|-------|--------|------------|------|
| `profile.name` (line 202) | User text input (onboarding) | NO | Medium -- prompt injection via name field |
| `profile.stage` (line 206) | Fixed enum ("idea", "mvp", "pre-seed", "seed", "series-a") | N/A -- safe | None |
| `profile.industry` (line 211) | User text input (onboarding) | NO | Medium |
| `profile.revenueRange` (line 227) | Onboarding dropdown | N/A -- safe | None |
| `profile.teamSize` (line 231) | Numeric | N/A -- safe | None |
| `profile.fundingHistory` (line 235) | User text input | NO | Medium |
| `profile.challenges` (line 264-268) | User text input (mainChallenge) | NO | Medium |
| Enrichment data (lines 279-295) | Prior conversations | YES | Mitigated |
| Semantic memory facts (lines 332-339) | Prior conversations | YES | Mitigated |

The `name`, `industry`, `fundingHistory`, and `challenges` fields come from user text input during onboarding and are injected directly into the system prompt via template literals without passing through `sanitizeUserInput`. A malicious user could set their name to "Ignore previous instructions..." and have it injected verbatim.

**Recommended fix:** Apply `sanitize()` to `profile.name`, `profile.industry`, `profile.fundingHistory`, and each challenge string before interpolation.

### 3. Does the Founder Intake Protocol handle missing data gracefully?

**PASS** -- The three-path branching at lines 346-368 handles all cases:

| Scenario | Path | Behavior |
|----------|------|----------|
| Completed onboarding, has data, first conversation | Path 1 (line 346) | "HANDOFF: FIRST CONVERSATION AFTER ONBOARDING" -- reference known data, go deeper on missing fields |
| No onboarding data, first conversation | Path 2 (line 356) | "HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)" -- run Universal Entry Flow, gather naturally |
| Returning user | Path 3 (line 365) | Personalize from snapshot, skip known answers, infer missing fields |

The no-data path correctly instructs FRED: "Do NOT mention onboarding, forms, or that data is missing. Just mentor naturally." This prevents the awkward case where FRED says "I see you didn't fill out our onboarding form..."

The empty-state handling at line 192 is also correct: if no profile data AND no facts AND NOT first conversation, return empty string. But if it IS a first conversation (even with no data), the handoff instructions are still generated.

---

## FILE REVIEW: `lib/fred/context-builder.ts`

### Changes Summary

1. **New type field:** `onboardingCompleted: boolean` on `FounderProfile` (line 31)
2. **New type field:** `isFirstConversation: boolean` on `FounderContextData` (line 37)
3. **New function:** `checkIsFirstConversation(userId)` (lines 119-133)
4. **Modified function:** `loadFounderProfile` now selects `onboarding_completed` (line 53)
5. **Modified function:** `buildContextBlock` now has three-path handoff logic (lines 346-368)
6. **Modified function:** `buildFounderContext` loads `isFirstConversation` in parallel (line 394-397)
7. **New function:** `seedFounderSnapshot(userId)` fire-and-forget (lines 418-427)

### Detailed Review

#### `checkIsFirstConversation` (lines 119-133) -- GOOD with NOTE

Clean implementation. Queries `fred_conversation_state` for the user -- if no row exists (PGRST116), this is a first conversation.

**Note:** This detection relies on the `fred_conversation_state` table having NO row for a new user. But `seedFounderSnapshot` (called at line 403) triggers `syncSnapshotFromProfile` which calls `updateFounderSnapshot` which calls `getOrCreateConversationState` which CREATES a row. This means:

- First request: `checkIsFirstConversation` returns `true` -> handoff instructions included -> `seedFounderSnapshot` fires -> row created
- Second request: `checkIsFirstConversation` returns `false` -> returning user path
- Race condition: If `seedFounderSnapshot` completes before `checkIsFirstConversation` runs (both in the same Promise.all), the check could return `false`. BUT they are NOT in the same Promise.all -- `checkIsFirstConversation` is in the parallel load at line 394, and `seedFounderSnapshot` is called AFTER at line 403. So this is correct.

**Potential edge case:** If two browser tabs send messages simultaneously, the first request creates the conversation state row, and the second request sees `isFirstConversation = false` and skips the handoff. This is acceptable -- the handoff instructions are a one-time thing.

#### `seedFounderSnapshot` (lines 418-427) -- GOOD

Fire-and-forget pattern is correct:
- Uses an immediately-invoked async function
- Catches errors and logs them
- Does NOT await -- the response is not blocked
- Dynamic import of `conversation-state` module (same pattern as `loadSemanticFacts`)

The `syncSnapshotFromProfile` function (conversation-state.ts:488-511) correctly:
- Reads profile fields including migration 050 columns (product_status, traction, runway, primary_constraint, ninety_day_goal)
- Only includes non-null values in the snapshot
- Calls `updateFounderSnapshot` which merges into existing snapshot data

#### Three-path handoff logic (lines 346-368) -- GOOD

The branching conditions are correct:

```
Path 1: isFirstConversation && onboardingCompleted && hasProfileData
Path 2: isFirstConversation && !hasProfileData
Path 3: else (returning user)
```

**Gap analysis -- what about `isFirstConversation && onboardingCompleted && !hasProfileData`?** This would be a user who "completed" onboarding but somehow has no data. This falls into Path 2 (since `!hasProfileData` is checked second). This is correct behavior -- if there's no data, run the intake protocol regardless of onboarding status.

**Gap analysis -- what about `isFirstConversation && !onboardingCompleted && hasProfileData`?** This would be a user who has profile data (from some other source) but didn't complete onboarding. This falls into Path 1 only if `onboardingCompleted` is true. Since `onboardingCompleted` is false, and `hasProfileData` is true, this falls into Path 3 (returning user). But it's a first conversation! The returning user path says "Skip intake questions you already have answers to" which is reasonable behavior for this edge case.

**Operating Bible Section 5.1 compliance:** Path 2 includes the Universal Entry Flow's three canonical questions: "What are you building?", "Who is it for?", "What are you trying to accomplish right now?" This matches the Operating Bible verbatim.

#### `buildFounderContext` parallel loading (lines 394-397) -- GOOD

```typescript
const [profile, facts, isFirstConversation] = await Promise.all([
  loadFounderProfile(userId),
  loadSemanticFacts(userId, hasPersistentMemory),
  checkIsFirstConversation(userId),
]);
```

Three parallel queries. Clean. The `checkIsFirstConversation` is a lightweight SELECT by PK, so minimal latency impact.

---

## ISSUE SUMMARY

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | WARNING | context-builder.ts:202,211,235,264 | Core profile fields (name, industry, fundingHistory, challenges) injected without sanitization | OPEN |
| 2 | WARNING | context-builder.ts:346 | Edge case: first conversation with profile data but `onboardingCompleted=false` falls to returning-user path instead of handoff | OPEN (acceptable behavior) |
| 3 | NOTE | context-builder.ts:119-133 | First-conversation detection depends on absence of `fred_conversation_state` row -- correct but one-shot (cannot re-trigger handoff) | NOTED |
| 4 | NOTE | context-builder.ts:418-427 | `seedFounderSnapshot` fire-and-forget has no retry mechanism -- if it fails, the conversation state's founder_snapshot stays empty until next write | NOTED |

### Issue #1 Detail (SECURITY -- carries over from Phase 34)

This is the same class of issue identified in Phase 34 Issue #1 but for different fields. The Phase 34 sanitization fix (commit `94adddc`) covered enrichment data and semantic memory values, but core profile fields were already being injected unsanitized in Phase 34 and Phase 35 did not address this gap.

**Affected lines:**
- Line 202: `lines.push(\`**Founder:** ${profile.name}\`)` -- name is user text input
- Line 211: `lines.push(\`**Industry:** ${profile.industry}\`)` -- industry is user text input
- Line 235: `lines.push(\`**Funding:** ${profile.fundingHistory}\`)` -- fundingHistory is user text input
- Lines 264-268: Challenge labels from `profile.challenges` array -- user text input

**Fix (trivial):**
```typescript
// Line 202
lines.push(`**Founder:** ${sanitize(profile.name)}`);
// Line 211
lines.push(`**Industry:** ${sanitize(profile.industry)}`);
// Line 235
lines.push(`**Funding:** ${sanitize(profile.fundingHistory)}`);
// Lines 264-268
const label = typeof challenge === "string"
  ? sanitize(challenge.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
  : sanitize(String(challenge));
```

---

## PHASE 36 PLAN REVIEW (Pre-implementation Notes)

Since Phase 36 is being implemented (Tasks #20, #22), here are review notes on the plans:

### 36-01 Plan: Wire Conversation State into Chat Pipeline

**LOOKS GOOD.** Clean data-flow-only plan. Key architectural decisions are sound:
- Parallel loading with existing queries (no serial waterfall)
- Graceful fallback if state loading fails
- Reuses existing `buildProgressContext` from DAL
- Step guidance block is in the prompt layer (correct per Operating Bible Section 4)

**One concern:** Task 2 proposes extending `buildFounderContext` to also load progress context. This means a single function loads profile + facts + first-conversation state + progress context. Consider whether this is too many responsibilities for one function. The function name suggests "founder context" but now also loads "step progress." Minor naming concern -- functionally fine.

### 36-02 Plan: Structured Flow Control

**LOOKS GOOD.** Both of my earlier concerns have been addressed in the revised plan:

1. **Redirect is now prompt-driven** (Task 2): `buildDriftRedirectBlock` lives in `prompts.ts`, not hardcoded in `decide.ts`. The LLM generates contextual redirect language. Detection stays structural. This matches the Operating Bible layered architecture.

2. **Keyword matching uses word-boundary regex** (Task 1): Signals like `/\bfrustrat\w*\b/` prevent false positives on "frustrated about fundraising" triggering the "problem" step. Multi-word phrases use `includes()` which is correct.

**Remaining concerns for implementation review:**
- The `extractDiagnosticSignals` function in Task 5 uses regex matching on raw user messages to set diagnostic tags like `positioningClarity` and `stage`. This is a heuristic that will have false positives. "I'm thinking about hiring" does not mean stage is "idea" just because it contains "thinking about." The regex `/idea|concept|thinking about/` is too broad for stage detection.
- The `extractSnapshotUpdates` function extracts money entities as "traction." A user saying "I need $50K in funding" would have their funding need stored as traction, which is incorrect. Entity type alone is insufficient -- context matters.
- Both of these are acceptable for an initial implementation as long as they are treated as heuristics, not ground truth, and can be corrected by FRED through conversation.

---

## VERDICT

**APPROVED** -- Phase 35 delivers a clean, well-designed onboarding handoff that handles all three user states correctly. The Operating Bible Universal Entry Flow is faithfully implemented. The fire-and-forget snapshot seeding is the right pattern.

**Priority fix before production:** Issue #1 (sanitize core profile fields). This is a 4-line fix that should ship with the next commit touching `context-builder.ts`.
