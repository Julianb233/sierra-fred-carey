# Phase 35: Onboarding-to-FRED Handoff -- Test Plan

**Tester**: QA Tester
**Date Created**: 2026-02-11
**Reference**: `.planning/OPERATING-BIBLE.md` (Sections 5, 12, 17), `.planning/ROADMAP.md` (Phase 35)

---

## Phase 35 Success Criteria (from ROADMAP.md)

1. Onboarding captures the full founder snapshot: stage, industry, challenge, revenue range, team size, funding history
2. FRED's first message after onboarding references what was already shared and asks a deeper follow-up -- never re-asks stage or industry
3. If a founder skips onboarding, FRED detects the missing data and runs the Founder Intake Protocol conversationally
4. The combined onboarding + FRED intake data populates the Founder Snapshot visible on the dashboard

---

## 1. Build, TypeScript, Lint (Standard Gates)

### 1.1 Build Passes
- Run `npm run build` -- must complete with zero errors
- All pages compile, all routes resolve

### 1.2 TypeScript Compiles
- Run `npx tsc --noEmit` -- zero new errors from Phase 35 files
- Pre-existing errors in `workers/voice-agent/agent.ts` are acceptable (9 errors)

### 1.3 Lint Passes
- Run `npm run lint` -- no new lint errors in Phase 35 files
- Check specifically: any new files, modified files in `lib/fred/`, `lib/db/`, `app/api/`, `components/onboarding/`

---

## 2. Onboarding Data Capture (Success Criterion #1)

### 2.1 Full Onboarding Flow -- Profile Storage
Verify the onboarding form captures all Founder Snapshot fields and persists them to the `profiles` table:

| Field | Form Step | DB Column | Verified? |
|---|---|---|---|
| Startup name | startup-info > name | `name` | |
| Stage | startup-info > stage | `stage` | |
| Main challenge | startup-info > challenge | `challenges` (JSONB) | |
| Industry | startup-info > details | `industry` | |
| Revenue range | startup-info > details | `revenue_range` | |
| Team size | startup-info > details | `team_size` | |
| Funding history | startup-info > details | `funding_history` | |
| Onboarding completed flag | auto on completion | `onboarding_completed` | |
| Enrichment metadata | auto on details step | `enrichment_source`, `enriched_at` | |

### 2.2 Dual Persistence Paths
Data flows through two paths -- both must be verified:

**Path A: Client-side hook (`use-onboarding.ts`)**
- `syncCompletionToDb()` updates profiles table on completion
- `populateFredMemory()` stores facts to `fred_semantic_memory` via `/api/fred/memory`

**Path B: Server-side API (`/api/onboard/route.ts`)**
- POST handler stores enrichment fields (industry, revenue_range, team_size, funding_history)
- Sets `onboarding_completed: true`
- Sets `enrichment_source: "onboarding"` and `enriched_at`

### 2.3 Semantic Memory Population
After onboarding completes, verify facts stored in `fred_semantic_memory`:
- `startup_facts/company_name` -> startup name
- `startup_facts/funding_stage` -> stage
- `startup_facts/industry` -> industry
- `startup_facts/description` -> description
- `startup_facts/funding_history` -> funding history
- `challenges/primary_challenge` -> main challenge
- `metrics/revenue_range` -> revenue range
- `team_info/team_size` -> team size

---

## 3. First Conversation After Onboarding -- FRED Handoff (Success Criterion #2)

### 3.1 Context Builder: First Conversation Detection
The `buildFounderContext()` function in `lib/fred/context-builder.ts` must:
- Call `checkIsFirstConversation(userId)` -- returns `true` when no `fred_conversation_state` row exists
- Load profile data from `profiles` table
- Load semantic facts from `fred_semantic_memory` (Pro+ only)
- Build the HANDOFF context block

### 3.2 Handoff Block -- Completed Onboarding
When `isFirstConversation === true` AND `onboardingCompleted === true` AND profile has data:
- Context block must include `## HANDOFF: FIRST CONVERSATION AFTER ONBOARDING`
- Instructions must tell FRED to:
  - Reference what was shared: "You mentioned you're at [stage] working in [industry]..."
  - NOT re-ask for stage, industry, challenge, team size, revenue, or funding
  - Go deeper: ask about product status, traction metrics, runway, 90-day goal, buyer identity
  - Begin building the full Founder Snapshot for missing fields

**Test verification points:**
- `buildContextBlock()` output contains "HANDOFF: FIRST CONVERSATION AFTER ONBOARDING" when conditions met
- Output contains all profile fields that were captured during onboarding (stage, industry, challenges, etc.)
- Output does NOT contain "FIRST CONVERSATION (NO ONBOARDING DATA)" when onboarding was completed

### 3.3 Founder Snapshot Seeding
On first conversation after completed onboarding:
- `seedFounderSnapshot(userId)` fires (fire-and-forget)
- Calls `syncSnapshotFromProfile(userId)` from `lib/db/conversation-state.ts`
- Creates or updates `fred_conversation_state` with `founder_snapshot` JSONB from profile data
- Maps: stage, product_status, traction, runway, primary_constraint, ninety_day_goal

### 3.4 No Data Re-Asking
After onboarding completion, FRED's first message must NOT contain:
- "What are you building?" (already known from onboarding)
- "Who is it for?" (should go deeper instead)
- "What stage are you at?" (already captured)
- "What's your industry?" (already captured)
- Any of the canonical Universal Entry Flow openers (these are for unknown founders only)

FRED's first message SHOULD:
- Reference the founder's name if available
- Reference their stage, industry, or challenge
- Ask a deeper follow-up question about something NOT captured in onboarding

---

## 4. Skipped Onboarding -- Founder Intake Protocol (Success Criterion #3)

### 4.1 Skip Detection
When `skipOnboarding()` is called in `use-onboarding.ts`:
- `startupInfo` is empty (`{}`)
- `isComplete: true` is set
- `syncCompletionToDb()` fires but with no meaningful data
- Profile gets `onboarding_completed: true` but no stage/industry/challenges

### 4.2 Context Builder: Skipped Onboarding
When `isFirstConversation === true` AND `hasProfileData === false`:
- Context block must include `## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)`
- Instructions must tell FRED to:
  - Run the Universal Entry Flow: "What are you building?", "Who is it for?", "What are you trying to accomplish right now?"
  - Gather Founder Snapshot fields through natural conversation
  - NOT mention onboarding, forms, or that data is missing
  - Ask 2-3 questions at a time (mentoring, not interrogation)

**Critical Operating Bible compliance (Section 5):**
- Default opening must be the canonical openers
- No scores, assessments, investor readiness, positioning frameworks mentioned
- Silent diagnosis runs internally

### 4.3 Edge Case: `onboarding_completed: true` but Empty Profile
This happens when a founder clicks "Skip setup":
- `loadFounderProfile()` returns all null/empty fields
- `hasProfileData` evaluates to `false`
- System correctly falls through to "NO ONBOARDING DATA" handoff path
- Verify this edge case specifically (it's the most common skip path)

---

## 5. Founder Snapshot Dashboard Integration (Success Criterion #4)

### 5.1 Dashboard Snapshot Display
The Founder Snapshot on the dashboard must show combined data from:
- Onboarding form data (stored in `profiles` table)
- FRED conversation intake (stored in `fred_conversation_state.founder_snapshot`)
- Semantic memory facts (from `fred_semantic_memory`)

### 5.2 Data Merging
Verify that the snapshot view at `/dashboard/profile/snapshot` reads from the correct sources:
- Primary: `profiles` table (onboarding data)
- Enrichment: `fred_conversation_state.founder_snapshot` (FRED-gathered data)
- Facts: `fred_semantic_memory` (conversation-extracted facts)

### 5.3 Progressive Filling
Snapshot should progressively fill as more data becomes available:
1. After onboarding: stage, industry, challenge, revenue, team, funding visible
2. After first FRED conversation: product status, traction, constraint, 90-day goal filled
3. After subsequent conversations: additional facts from semantic memory

---

## 6. Operating Bible Compliance

### 6.1 Section 5: Universal Entry Flow
| Requirement | Test |
|---|---|
| Default opening when no data | Verify "What are you building? Who is it for? What are you trying to accomplish right now?" appears in context for skipped-onboarding founders |
| No scores/assessments/frameworks in first interaction | Verify handoff block does NOT mention these |
| Silent diagnosis | Verify silent diagnosis tags are referenced in system prompt (inherited from Phase 34) |

### 6.2 Section 12: Founder Snapshot
| Requirement | Test |
|---|---|
| Snapshot fields: stage, product status, traction, runway, primary constraint, 90-day goal | Verify `buildContextBlock()` includes all available fields |
| Infer missing fields and state assumptions | Verify system prompt retains "infer from conversation and state your assumptions" instruction |
| Update after check-ins | Not Phase 35 scope, but verify wiring exists |
| Skip intake questions already answered | Verify FRED handoff instructions say to skip known data |

### 6.3 Section 17: Test Personas
**Persona 1: New founder who completed full onboarding (SaaS, seed stage, finding customers)**
- Expected: FRED references their stage and challenge, asks about product status and traction
- Must NOT: Re-ask stage, industry, or primary challenge

**Persona 2: New founder who skipped onboarding**
- Expected: FRED uses canonical openers, gathers data conversationally
- Must NOT: Mention forms, onboarding, or that data is missing

**Persona 3: New founder with partial onboarding (name + stage only, skipped details)**
- Expected: FRED references known data (name, stage), asks about missing pieces
- Must NOT: Re-ask for name or stage

### 6.4 Section 17.3: Regression Triggers
| Trigger | Test |
|---|---|
| Asks founders to choose diagnostics | FRED handoff says "diagnose silently" |
| Scores without intake | No scoring in first conversation handoff |
| Encourages fundraising by default | Handoff does not mention fundraising |
| Jumps to downstream artifacts | Handoff focuses on gathering upstream truth first |

---

## 7. Data Flow Verification

### 7.1 Complete Data Pipeline
Trace the full data flow for a completed-onboarding founder:

```
Onboarding Form (client)
  -> use-onboarding.ts: syncCompletionToDb()
    -> profiles table (stage, industry, challenges, revenue_range, team_size, funding_history, onboarding_completed=true)
  -> use-onboarding.ts: populateFredMemory()
    -> /api/fred/memory -> fred_semantic_memory table

First Chat Message
  -> /api/fred/chat/route.ts
    -> buildFounderContext(userId, hasPersistentMemory)
      -> loadFounderProfile(userId) -> profiles table
      -> loadSemanticFacts(userId, hasPersistentMemory) -> fred_semantic_memory
      -> checkIsFirstConversation(userId) -> fred_conversation_state
      -> buildContextBlock({ profile, facts, isFirstConversation: true })
        -> Returns "## FOUNDER SNAPSHOT" + "## HANDOFF: FIRST CONVERSATION AFTER ONBOARDING"
      -> seedFounderSnapshot(userId) -> syncSnapshotFromProfile(userId)
        -> Creates fred_conversation_state with founder_snapshot from profiles
    -> buildSystemPrompt(founderContext)
      -> Replaces {{FOUNDER_CONTEXT}} with handoff block
    -> createFredService({ founderContext })
```

### 7.2 Skipped Onboarding Pipeline
```
Skip Button (client)
  -> use-onboarding.ts: skipOnboarding()
    -> syncCompletionToDb() with empty startupInfo
    -> profiles: onboarding_completed=true, no stage/industry/challenges

First Chat Message
  -> buildFounderContext(userId, hasPersistentMemory)
    -> loadFounderProfile() -> returns all null/empty
    -> checkIsFirstConversation() -> true
    -> buildContextBlock({ hasProfileData: false, isFirstConversation: true })
      -> Returns "## HANDOFF: FIRST CONVERSATION (NO ONBOARDING DATA)"
    -> seedFounderSnapshot NOT called (profile.onboardingCompleted is true but no profile data to seed)
```

Wait -- this is a potential issue to verify. When onboarding is skipped:
- `onboarding_completed` is set to `true` in profiles (via `syncCompletionToDb`)
- But `hasProfileData` is `false`
- The context builder at line 356 checks: `isFirstConversation && !hasProfileData`
- This correctly falls into the "NO ONBOARDING DATA" path
- BUT line 402 checks: `isFirstConversation && profile.onboardingCompleted` for seeding
- If both are true, `seedFounderSnapshot` will fire with an empty profile -- should be harmless but verify no error

---

## 8. No Regressions

### 8.1 Returning Users
Verify that returning users (not first conversation) are not affected:
- Context block should NOT contain any HANDOFF section
- Context block should contain "Use this snapshot to personalize your mentoring..."
- All Phase 34 behavior preserved

### 8.2 Unit Tests
- Run `npm test` -- all existing tests must pass
- Check for new tests covering:
  - `buildContextBlock()` with various data combinations
  - `buildFounderContext()` with first/returning user
  - `checkIsFirstConversation()` behavior
  - `syncSnapshotFromProfile()` data mapping

### 8.3 Chat Route
- Existing chat functionality unchanged
- SSE streaming works
- Rate limiting works
- Memory persistence works
- Enrichment works

---

## Summary Checklist

| # | Test | Pass Criteria |
|---|---|---|
| 1.1 | Build passes | `npm run build` zero errors |
| 1.2 | TypeScript compiles | `npx tsc --noEmit` zero new errors |
| 1.3 | Lint passes | No new lint errors in Phase 35 files |
| 2.1 | Onboarding captures full snapshot | All 8 fields stored in profiles table |
| 2.2 | Dual persistence paths | Both client hook and server API store data |
| 2.3 | Semantic memory populated | Facts stored for all onboarding fields |
| 3.1 | First conversation detection | `checkIsFirstConversation()` returns true for new users |
| 3.2 | Completed onboarding handoff block | Contains "FIRST CONVERSATION AFTER ONBOARDING" with correct instructions |
| 3.3 | Snapshot seeding | `syncSnapshotFromProfile()` creates conversation state |
| 3.4 | No data re-asking | FRED references known data, asks deeper questions |
| 4.1 | Skip detection | Empty profile with `onboarding_completed=true` |
| 4.2 | Skipped onboarding handoff | Contains "NO ONBOARDING DATA" with canonical openers |
| 4.3 | Edge case: completed but empty | Correctly falls to NO ONBOARDING DATA path |
| 5.1 | Dashboard snapshot display | Shows combined onboarding + FRED data |
| 5.2 | Data merging | Reads from profiles + conversation state + semantic memory |
| 5.3 | Progressive filling | Snapshot fills as data arrives |
| 6.1 | Operating Bible Section 5 | Entry flow compliant |
| 6.2 | Operating Bible Section 12 | Founder Snapshot compliant |
| 6.3 | Test personas | 3 personas validated |
| 6.4 | Regression triggers | 4 triggers protected |
| 7.1 | Full data pipeline | End-to-end flow verified |
| 7.2 | Skipped onboarding pipeline | Edge case flow verified |
| 8.1 | Returning users unaffected | No HANDOFF block for returning users |
| 8.2 | Unit tests pass | All tests green |
| 8.3 | Chat route preserved | No regressions |
