# Phase 35: Onboarding-to-FRED Handoff -- Test Results

**Tester**: QA Tester
**Date**: 2026-02-11
**Commit Tested**: 5c9ae9f
**File**: `lib/fred/context-builder.ts` (86 lines added, 7 modified)
**Reference**: `.planning/OPERATING-BIBLE.md` (Sections 5, 12, 17)

---

## 1. Build Passes

**Result: PASS**

`npm run build` completed successfully with zero errors. All pages compiled, all routes resolved.

---

## 2. TypeScript Compiles

**Result: PASS**

`npx tsc --noEmit` shows zero new errors from Phase 35 files. Only pre-existing errors in `workers/voice-agent/agent.ts` (9 errors, unrelated to Phase 35).

`lib/fred/context-builder.ts` compiles cleanly. No type issues with the new `isFirstConversation`, `onboardingCompleted`, or `FounderContextData` interface additions.

---

## 3. Lint Passes

**Result: PASS (with pre-existing issues)**

No new lint errors in Phase 35 files. Pre-existing `any` type warnings in context-builder.ts are unchanged from Phase 34.

---

## 4. Unit Tests Pass

**Result: PASS**

617/617 tests passed. 1 pre-existing test file failure (unrelated to Phase 35).

---

## 5. First Conversation After Onboarding (Path A)

**Result: PASS**

### 5.1 Handoff Block Content

When `isFirstConversation === true` AND `profile.onboardingCompleted === true` AND `hasProfileData === true`, the context block emits:

```
## HANDOFF: FIRST CONVERSATION AFTER ONBOARDING

This founder just completed onboarding and collected the data above. This is your first real conversation.
- Reference what you already know naturally: "You mentioned you're at [stage] working in [industry]..."
- Do NOT re-ask for stage, industry, challenge, team size, revenue, or funding -- you already have this.
- Go deeper: ask about the specifics that onboarding didn't capture (product status, traction metrics, runway, 90-day goal, who their buyer is).
- Apply the Universal Entry Flow with context: since you know their challenge, start there. Ask what they've tried, what's working, what's stuck.
- Begin building the full Founder Snapshot by filling in the missing fields through natural conversation.
```

### 5.2 Verification Against Success Criteria

| Criterion | Status | Evidence |
|---|---|---|
| FRED references what was shared | PASS | Line 351: "Reference what you already know naturally: 'You mentioned you're at [stage] working in [industry]...'" |
| FRED never re-asks onboarding data | PASS | Line 352: "Do NOT re-ask for stage, industry, challenge, team size, revenue, or funding -- you already have this." |
| FRED asks deeper follow-up | PASS | Line 353: "Go deeper: ask about product status, traction metrics, runway, 90-day goal, who their buyer is" |
| Snapshot data included above handoff | PASS | Lines 196-258: All available profile fields (name, stage, industry, revenue, team, funding, challenges) rendered in FOUNDER SNAPSHOT section before handoff instructions |

### 5.3 Founder Snapshot Data in Context Block

Verified the FOUNDER SNAPSHOT section includes all fields from onboarding:
- `**Founder:** [name]` (line 202)
- `**Stage:** [stage]` with title-case formatting (line 206-207)
- `**Industry:** [industry]` (line 211)
- `**Revenue:** [revenueRange]` when no traction data exists (line 227)
- `**Team:** [teamSize] people` with singular/plural (line 231)
- `**Funding:** [fundingHistory]` (line 235)
- `**Current Challenges:** [challenges]` with title-case labels (lines 262-271)

---

## 6. Skipped Onboarding (Path B)

**Result: PASS**

### 6.1 Handoff Block Content

When `isFirstConversation === true` AND `hasProfileData === false`, the context block emits:

```
## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)

This founder has no onboarding data. They either skipped onboarding or are a new user.
- Run the Universal Entry Flow: "What are you building?", "Who is it for?", "What are you trying to accomplish right now?"
- Gather the Founder Snapshot fields naturally through conversation: stage, product status, traction, runway, primary constraint, 90-day goal.
- Do NOT mention onboarding, forms, or that data is missing. Just mentor naturally.
- Ask 2-3 questions at a time, respond thoughtfully, then gather more. This is mentoring, not an interrogation.
```

### 6.2 Operating Bible Section 5 Compliance

| Requirement | Status | Evidence |
|---|---|---|
| Default opening: "What are you building?" | PASS | Line 361: Canonical openers included verbatim |
| Default opening: "Who is it for?" | PASS | Same line |
| Default opening: "What are you trying to accomplish right now?" | PASS | Same line |
| Do NOT mention forms/onboarding | PASS | Line 363: "Do NOT mention onboarding, forms, or that data is missing" |
| Gather snapshot fields naturally | PASS | Line 362: Lists all 6 Founder Snapshot fields (Section 12) |
| Not an interrogation | PASS | Line 364: "Ask 2-3 questions at a time... This is mentoring, not an interrogation" |

### 6.3 Edge Case: Skipped Onboarding (`onboarding_completed=true`, Empty Profile)

When founder clicks "Skip setup":
- `use-onboarding.ts` `skipOnboarding()` at line 286: sets `startupInfo: {}`, `isComplete: true`
- `syncCompletionToDb()` fires with empty `startupInfo`
- Profile gets `onboarding_completed: true` but no stage/industry/challenges
- `loadFounderProfile()` returns all null/empty fields
- `hasProfileData` evaluates to `false` (line 182-189: no name, stage, industry, etc.)
- Line 346: Path A condition fails (`hasProfileData` is false)
- Line 356: Path B condition matches (`isFirstConversation && !hasProfileData`)
- **Result: Correctly falls to "NO ONBOARDING DATA" path**

### 6.4 Edge Case: `seedFounderSnapshot` with Empty Profile (Deep Trace)

When `isFirstConversation && profile.onboardingCompleted` (line 403), `seedFounderSnapshot(userId)` fires even with empty profile data. Full trace through `syncSnapshotFromProfile()` in `lib/db/conversation-state.ts`:

1. Profile query at line 550-554 returns a row (user exists) but all fields are null
2. Lines 562-567: Each `if` guard checks for truthy values:
   - `if (profile.stage)` -- null, skipped
   - `if (profile.product_status)` -- null, skipped
   - `if (profile.traction)` -- null, skipped
   - `if (profile.runway && Object.keys(profile.runway).length > 0)` -- null, skipped
   - `if (profile.primary_constraint)` -- null, skipped
   - `if (profile.ninety_day_goal)` -- null, skipped
3. `snapshot` remains `{}` (empty object)
4. `updateFounderSnapshot(userId, {})` called at line 569
5. Inside `updateFounderSnapshot()` (line 519): calls `getOrCreateConversationState(userId)` -- creates a new row if needed
6. Line 524: merges `{ ...state.founderSnapshot, ...{} }` -- no actual change to existing snapshot
7. Writes unchanged snapshot back to DB -- wasted roundtrip but no errors or data corruption
8. Entire call wrapped in fire-and-forget async IIFE (line 444-452) with try/catch

**Result: Handles null/empty fields gracefully. No errors, no data corruption. Just a wasted DB write.**

---

## 7. Returning User (Path C)

**Result: PASS**

When `isFirstConversation === false` (returning user with existing conversation state):
- Line 365 (else clause): Emits inline instruction (no HANDOFF section heading)
- Text: "Use this snapshot to personalize your mentoring. Skip intake questions you already have answers to. Reference what you know naturally. If key snapshot fields are missing (product status, traction, runway, primary constraint, 90-day goal), infer from conversation and state your assumptions."

| Criterion | Status | Evidence |
|---|---|---|
| No HANDOFF block | PASS | Falls to else at line 365 -- no "##" heading emitted |
| Personalize from snapshot | PASS | "Use this snapshot to personalize your mentoring" |
| Skip known questions | PASS | "Skip intake questions you already have answers to" |
| Infer missing fields | PASS | "infer from conversation and state your assumptions" |
| Phase 34 behavior preserved | PASS | Identical to Phase 34 returning-user behavior |

---

## 8. First Conversation Detection

**Result: PASS**

### 8.1 `checkIsFirstConversation()` (lines 119-133)

- Queries `fred_conversation_state` table for user's row
- If no row exists (PGRST116 error) -> returns `true` (first conversation)
- If row exists -> returns `false` (returning user)
- If query fails (exception) -> returns `true` (defaults to first conversation -- safe default)

### 8.2 Parallel Execution

`buildFounderContext()` at line 394 calls all four loaders in `Promise.all()`:
1. `loadFounderProfile(userId)`
2. `loadSemanticFacts(userId, hasPersistentMemory)`
3. `checkIsFirstConversation(userId)`
4. `loadProgressContext(userId)` (Phase 36 prep)

**No serial waterfalls** -- all four queries run in parallel. Added latency for first-conversation check is hidden behind the existing profile/facts loads.

---

## 9. Founder Snapshot Seeding

**Result: PASS**

### 9.1 Fire-and-Forget Pattern

`seedFounderSnapshot()` at line 444:
- Uses IIFE async pattern `(async () => { ... })()`
- Wrapped in try/catch with `console.warn` on failure
- Never awaited -- does not block the response
- Does not affect the return value of `buildFounderContext()`

### 9.2 `syncSnapshotFromProfile()` Call

- Dynamically imports from `lib/db/conversation-state` (line 447)
- Calls `syncSnapshotFromProfile(userId)` which reads profile fields and writes to `fred_conversation_state.founder_snapshot`
- Maps: stage, product_status, traction, runway, primary_constraint, ninety_day_goal from profiles table

### 9.3 Trigger Condition

- Only fires when `isFirstConversation && profile.onboardingCompleted` (line 403)
- Does NOT fire for returning users
- Does NOT fire when onboarding was not completed

---

## 10. No Regressions

**Result: PASS**

- **Unit tests**: 617/617 passed
- **Build**: Successful
- **Chat route**: Only file changed is `lib/fred/context-builder.ts` (86 lines added, 7 modified)
- **Returning users**: Path C behavior is identical to Phase 34 (else clause at line 365)
- **API contract**: `buildFounderContext()` signature unchanged -- still `(userId: string, hasPersistentMemory: boolean) => Promise<string>`
- **`buildContextBlock` still returns empty string** when no profile data AND not first conversation AND no facts (line 192-194)

---

## 11. Security Finding

**Result: NON-BLOCKING ISSUE (already tracked as Task #25)**

Core profile fields injected into the context block **without sanitization**:
- `profile.name` (line 202) -- user-controlled via onboarding form
- `profile.stage` (line 206) -- from predefined list but API accepts any string
- `profile.industry` (line 211) -- same
- `profile.revenueRange` (line 227) -- same
- `profile.fundingHistory` (line 235) -- same
- `profile.challenges` (lines 264-268) -- from predefined list but API accepts any string

The `sanitize()` helper (wrapping `sanitizeUserInput`) IS used for enrichment data and fact values, but NOT for these core profile fields. A malicious user could inject prompt-manipulation strings via their startup name field.

**Note:** This is already tracked as Task #25 ("Fix Phase 35 sanitization: core profile fields unescaped in context block").

---

## 12. Operating Bible Compliance

| Section | Requirement | Status | Evidence |
|---|---|---|---|
| 5.1 | Universal Entry Flow | PASS | Path B includes canonical openers verbatim |
| 5.2 | Silent Diagnosis | PASS | No scores/assessments/frameworks mentioned in any handoff path |
| 12 | Founder Snapshot fields | PASS | All 8 fields present: stage, product status, traction, runway, primary constraint, 90-day goal, plus enrichment |
| 12 | Infer missing fields | PASS | Path C: "infer from conversation and state your assumptions" |
| 12 | Skip known fields | PASS | Path A: "Do NOT re-ask"; Path C: "Skip intake questions you already have answers to" |
| 17.3 | Regression: asks founders to choose diagnostics | PASS | No diagnostic choice offered in any handoff path |
| 17.3 | Regression: scores without intake | PASS | No scoring in any handoff path |
| 17.3 | Regression: encourages fundraising by default | PASS | No fundraising mentioned in any handoff path |
| 17.3 | Regression: jumps to downstream artifacts | PASS | Path A focuses on gathering upstream truth (product status, traction, buyer) |

---

## Summary

| Test | Result |
|---|---|
| Build passes | **PASS** |
| TypeScript compiles | **PASS** |
| Lint passes | **PASS** |
| Unit tests pass | **PASS** |
| Path A: First conversation after onboarding | **PASS** |
| Path B: Skipped onboarding | **PASS** |
| Path B edge case: onboarding_completed=true, empty profile | **PASS** |
| Path B edge case: seedFounderSnapshot with nulls | **PASS** (handles gracefully) |
| Path C: Returning user | **PASS** |
| First conversation detection | **PASS** |
| Founder snapshot seeding (fire-and-forget) | **PASS** |
| No regressions | **PASS** |
| Operating Bible Section 5 | **PASS** |
| Operating Bible Section 12 | **PASS** |
| Operating Bible Section 17.3 regression triggers | **PASS** |

### Overall: 15/15 PASS

### Blocking Issues: None

### Non-Blocking Issues:
1. **Sanitization gap** (Task #25): Core profile fields (name, stage, industry, revenueRange, fundingHistory, challenges) injected into context block without `sanitize()`. Already tracked.
2. **Seeding with empty profile**: `seedFounderSnapshot()` fires even when onboarding was skipped (profile data empty). Creates an empty `fred_conversation_state` row. Harmless but wasteful. Suggested fix: add `hasProfileData` check at line 403.

### Recommendations:
1. Apply `sanitize()` to all profile fields in `buildContextBlock()` (Task #25)
2. Add guard to skip `seedFounderSnapshot()` when `!hasProfileData`
3. Add vitest tests for `buildContextBlock()` covering all three paths (A, B, C)
4. Add vitest tests for `checkIsFirstConversation()` behavior
