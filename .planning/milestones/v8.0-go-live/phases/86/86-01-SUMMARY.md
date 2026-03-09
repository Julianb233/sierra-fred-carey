---
phase: 86-fred-response-conciseness
plan: 01
subsystem: ai-prompts
tags: [conciseness, baby-stepping, voice, prompts, regression-tests]
dependency-graph:
  requires: []
  provides: [conciseness-enforcement, baby-step-voice-rules, conciseness-regression-tests]
  affects: []
tech-stack:
  added: []
  patterns: [conciseness-protocol, baby-step-coaching]
key-files:
  created:
    - lib/ai/__tests__/conciseness.test.ts
  modified:
    - lib/fred/voice.ts
    - lib/agents/fred-agent-voice.ts
decisions: []
metrics:
  duration: ~3min
  completed: 2026-03-09
---

# Phase 86 Plan 01: FRED Response Conciseness & Baby-Stepping Summary

**One-liner:** Voice preamble and agent voice constant now enforce conciseness (2-3 sentences) and baby-step (1-week micro-steps) rules, with 7 regression tests covering all prompt paths.

## What Was Done

### Task 1: Voice preamble and agent voice constant updates
- Added baby-step constraint to `buildFredVoicePreamble()` in `lib/fred/voice.ts`: "When suggesting actions, give ONE thing to do this week."
- Added conciseness rule (2-3 sentences, offer depth as follow-up) to `FRED_AGENT_VOICE` in `lib/agents/fred-agent-voice.ts`
- Added baby-stepping rule (1-week micro-steps only) to `FRED_AGENT_VOICE`
- Commit: `9fd0bb4`

### Task 2: Conciseness regression tests
- Created `lib/ai/__tests__/conciseness.test.ts` with 7 test cases:
  1. Core prompt contains CONCISENESS PROTOCOL
  2. Core prompt contains BABY-STEP COACHING
  3. All COACHING_PROMPTS include conciseness reminder
  4. buildSystemPrompt output includes conciseness and baby-step sections
  5. Voice preamble includes conciseness and baby-step rules
  6. FRED_AGENT_VOICE includes conciseness and baby-step rules
  7. Core prompt explicitly bans multi-month anti-patterns
- All 7 tests pass
- Commit: `3464f02`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Anti-pattern test adjusted for negative examples**
- **Found during:** Task 2
- **Issue:** The test checked that "over the next 3 months" was NOT in the core prompt, but the phrase exists as a negative example (instruction telling FRED to never use it)
- **Fix:** Changed test to verify the anti-pattern guardrail instructions ARE present rather than checking for absence of instructional references
- **Files modified:** `lib/ai/__tests__/conciseness.test.ts`
- **Commit:** `3464f02` (included in Task 2 commit)

## Files Unchanged (Verified)

- `lib/ai/prompt-layers.ts` — CONCISENESS PROTOCOL and BABY-STEP COACHING sections untouched (verified by tests)
- `lib/ai/prompts.ts` — All 5 COACHING_PROMPTS topics retain "Keep initial responses to 2-3 sentences" (verified by tests)
