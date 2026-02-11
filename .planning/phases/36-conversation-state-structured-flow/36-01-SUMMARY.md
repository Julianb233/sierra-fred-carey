# Phase 36 Plan 01: Wire Conversation State into Chat Pipeline Summary

## One-liner
Conversation state loaded in parallel, step guidance injected into system prompt, state context threaded through XState machine to all actors.

## What Was Done

### Task 1: Add ConversationStateContext to FredContext types
- Added `ConversationStateContext` interface to `lib/fred/types.ts` with fields for currentStep, stepStatuses, processStatus, currentBlockers, diagnosticTags, founderSnapshot, and progressContext
- Added `conversationState: ConversationStateContext | null` to `FredContext`
- Added `stepRelevance` and `driftDetected` fields to `ValidatedInput` for Phase 36 step-awareness
- **Commit:** `3f16d1f`

### Task 2: Extend buildFounderContext with step progress loading
- Added `loadProgressContext` helper that dynamically imports from conversation-state DAL
- Added parallel loading of progress context alongside profile, facts, and first-conversation check
- Appends progress context to founder context block when available
- Also sanitized user-controlled profile fields before prompt injection
- **Commit:** `9c48744` (committed by concurrent process alongside startup-process type updates)

### Task 3: Add buildStepGuidanceBlock to prompts.ts
- Added `buildStepGuidanceBlock` function that generates step-specific system prompt guidance
- Includes priority questions, required output, do-not-advance conditions
- Lists validated steps to prevent re-asking answered questions
- Shows active blockers when present
- Added `buildDriftRedirectBlock` for redirecting founders who skip ahead
- Target <300 tokens for context window efficiency
- **Commit:** `3ce6fc7`

### Task 4 + Task 6: Wire conversation state into chat route
- Load conversation state via `getOrCreateConversationState` in handlePost
- Build step guidance block from current step, statuses, and blockers
- Build `ConversationStateContext` for machine access
- Append step guidance to founder context for system prompt injection
- Pass conversation state through to `FredService`
- Graceful try/catch fallback if conversation state loading fails
- **Commit:** `5793040`

### Task 5: Pass conversation state through service, machine, and actors
- Added `conversationState` to `FredServiceOptions` and passed to machine input
- Added `conversationState` to machine input type and `createInitialContext`
- Threaded `conversationState` through all actors: validate, synthesize, decide, execute
- validate-input: step-relevance detection via keyword matching, drift detection
- synthesize: step-aware context appended to reasoning chain
- decide: step context in response content and metadata
- execute: fire-and-forget post-response state updates (evidence, diagnostics, snapshot)
- All params optional for backward compatibility
- **Commit:** `91eefcb` (committed by concurrent process alongside migration hardening)

## Verification Results

- [x] `ConversationStateContext` type is exported from `lib/fred/types.ts`
- [x] `FredContext` includes `conversationState: ConversationStateContext | null`
- [x] `buildFounderContext` loads step progress in parallel with profile and facts
- [x] `buildStepGuidanceBlock` produces formatted step guidance with questions, required output, do-not-advance conditions
- [x] `buildStepGuidanceBlock` only includes data for the current step
- [x] `buildStepGuidanceBlock` lists validated steps so FRED doesn't re-ask
- [x] Chat route loads conversation state via `getOrCreateConversationState`
- [x] Chat route gracefully falls back to no state if loading fails
- [x] `FredServiceOptions` accepts optional `conversationState`
- [x] Machine input includes `conversationState`
- [x] `FredContext` receives `conversationState` in `createInitialContext`
- [x] Conversation state is accessible to all actors via `context.conversationState`
- [x] Step guidance block appended to system prompt
- [x] New founder (no conversation state row) gets a fresh state created automatically
- [x] `npx tsc --noEmit` passes (only unrelated voice-agent errors)
- [x] Existing chat API contract is preserved (same request/response schema)
- [x] Existing tests pass (16/16 FRED machine tests green)

## Deviations from Plan

### Concurrent Commits
Tasks 2 and 5 were committed by a concurrent process running in parallel:
- Task 2 context-builder changes landed in commit `9c48744` (feat(types): add "assumed" StepStatus)
- Task 5 service/machine/actor changes landed in commit `91eefcb` (fix(db): harden migration 051)

The code content is identical to what the plan specified. The commit messages reference different work but the Phase 36 code is present and correct.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Step guidance block targets <300 tokens | Preserve context window for actual mentoring |
| All conversation state loading is non-blocking | Chat must not fail if state table is missing |
| Progress context loaded in parallel | No serial waterfalls; profile, facts, and state load simultaneously |
| Actor signatures use optional params | Backward compatibility; existing callers unaffected |
| Drift redirect is a separate function | Clean separation; injected only when drift is detected |

## Key Files

### Created
- None (all changes were modifications to existing files)

### Modified
- `lib/fred/types.ts` -- ConversationStateContext interface, FredContext extension, ValidatedInput extensions
- `lib/fred/context-builder.ts` -- loadProgressContext, parallel loading, progress context appending
- `lib/ai/prompts.ts` -- buildStepGuidanceBlock, buildDriftRedirectBlock
- `app/api/fred/chat/route.ts` -- conversation state loading, context building, service wiring
- `lib/fred/service.ts` -- FredServiceOptions.conversationState, pass-through to machine
- `lib/fred/machine.ts` -- machine input type, createInitialContext, actor input threading
- `lib/fred/actors/validate-input.ts` -- step-relevance and drift detection
- `lib/fred/actors/synthesize.ts` -- step-aware reasoning context
- `lib/fred/actors/decide.ts` -- step context in response and metadata
- `lib/fred/actors/execute.ts` -- post-response state updates

## Metrics

- **Duration:** ~3 minutes
- **Completed:** 2026-02-11
- **Tests:** 16/16 passing
- **TypeScript:** Clean (excluding unrelated voice-agent)

## Next Phase Readiness

Plan 36-02 (Behavioral Changes: structured flow, redirects, step advancement) can proceed. This plan provides:
- Conversation state loaded and accessible in all machine actors
- Step guidance injected into system prompt
- Drift detection signals available in ValidatedInput
- buildDriftRedirectBlock ready for prompt injection on drift
