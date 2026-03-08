---
phase: 86-fred-conciseness
plan: 01
subsystem: prompt-architecture
tags: [conciseness, coaching, prompts, voice, ux]
dependency-graph:
  requires: [83-01]
  provides:
    - CONCISENESS PROTOCOL in FRED_CORE_PROMPT (2-3 sentence max initial responses)
    - BABY-STEP COACHING in FRED_CORE_PROMPT (1-week micro-steps, no multi-month plans)
    - Voice-specific conciseness constraint (1-2 sentences max in voice mode)
    - 4 regression tests for conciseness and baby-stepping
  affects:
    - All FRED chat responses (shorter, more actionable)
    - All FRED voice responses (even shorter)
    - Coaching overlays (conciseness applies across all topics)
tech-stack:
  added: []
  patterns:
    - "2-3 sentence initial response with follow-up offer"
    - "1-week micro-step action items"
    - "Voice mode ultra-conciseness (1-2 sentences)"
key-files:
  modified:
    - lib/ai/prompt-layers.ts (CONCISENESS PROTOCOL + BABY-STEP COACHING sections)
    - lib/fred/voice.ts (voice-specific conciseness constraint in buildFredVoicePreamble)
    - lib/ai/__tests__/prompts.test.ts (4 new regression tests)
decisions:
  - id: "86-01-d1"
    decision: "Conciseness rules placed AFTER proactive response rules, BEFORE frameworks"
    reason: "Establishes response length discipline before any framework-specific instructions"
  - id: "86-01-d2"
    decision: "Voice mode gets stricter 1-2 sentence limit vs chat's 2-3 sentence limit"
    reason: "Listeners can't scan/skim; audio responses must be even more focused"
  - id: "86-01-d3"
    decision: "Exception clause for explicit detail requests"
    reason: "When founders ask for full breakdowns, conciseness should yield to thoroughness"
metrics:
  duration: "pre-existing implementation"
  completed: "2026-03-08"
---

# Phase 86 Plan 01: Fred Conciseness Protocol Summary

**One-liner:** Enforces 2-3 sentence initial responses with follow-up offers, 1-week micro-step coaching, and 1-2 sentence voice mode constraint across all FRED interactions.

## What Was Built

### 1. Conciseness Protocol (`lib/ai/prompt-layers.ts`)
- Added `## CONCISENESS PROTOCOL` section to FRED_CORE_PROMPT
- Rules: lead with single most important insight, 2-3 sentences max, end with follow-up offer
- No front-loading disclaimers or caveats
- Exception: when founder explicitly asks for detail
- Includes example responses demonstrating correct conciseness

### 2. Baby-Step Coaching (`lib/ai/prompt-layers.ts`)
- Added `## BABY-STEP COACHING` section to FRED_CORE_PROMPT
- Maximum time horizon: 7 days per action item
- Each step completable by one person in one focused session
- Frame as "this week" not "over the next quarter"
- Anti-patterns: no multi-month roadmaps, no 10+ item lists

### 3. Voice Conciseness (`lib/fred/voice.ts`)
- Added voice-specific conciseness constraint to `buildFredVoicePreamble()`
- 1-2 sentences max in voice mode (stricter than chat's 2-3)
- "Founders are listening, not reading. Lead with the single most important point."
- "Pause after your point and let them respond."

### 4. Regression Tests (`lib/ai/__tests__/prompts.test.ts`)
- "assembled system prompt includes conciseness protocol" -- verifies CONCISENESS PROTOCOL, 2-3 sentences, follow-up offer
- "assembled system prompt includes baby-step coaching rules" -- verifies BABY-STEP COACHING, 1-week micro-steps, 7 days
- "conciseness rules appear before frameworks section" -- ensures correct section ordering
- "voice preamble includes voice conciseness constraint" -- verifies 1-2 sentences + voice mode

## Verification

- `npx vitest run lib/ai/__tests__/prompts.test.ts` -- 45 tests pass (including 4 new)
- `grep -c "CONCISENESS" lib/ai/prompt-layers.ts` returns 1
- `grep -c "BABY-STEP" lib/ai/prompt-layers.ts` returns 1
- `grep -c "concise\|1-2 sentences" lib/fred/voice.ts` returns 2
