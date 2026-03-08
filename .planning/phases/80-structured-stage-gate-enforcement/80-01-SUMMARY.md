---
phase: 80-structured-stage-gate-enforcement
plan: 01
subsystem: oases-stage-gating
tags: [oases, intent-classifier, stage-validator, stage-gating, prompt-engineering]
dependency-graph:
  requires: [78-01, 78-02]
  provides: [stage-topic-map, intent-classifier, stage-validator, stage-gate-prompt-block]
  affects: [80-02]
tech-stack:
  added: []
  patterns: [regex-intent-classification, reverse-order-matching, prompt-block-injection]
key-files:
  created:
    - lib/oases/stage-topics.ts
    - lib/oases/intent-classifier.ts
    - lib/oases/stage-validator.ts
  modified: []
decisions:
  - id: d80-01-01
    decision: "Scan from highest stage (grow) to lowest (clarity) for conservative matching"
  - id: d80-01-02
    decision: "Return highest matching stage when multiple match — prevents bypassing gates"
  - id: d80-01-03
    decision: "General conversation (greetings, wellbeing, vague questions) always allowed — returns null"
  - id: d80-01-04
    decision: "Redirect tone matches Fred Cary voice — direct but warm, strategic sequencing not restriction"
metrics:
  duration: ~5m
  completed: 2026-03-08
---

# Phase 80 Plan 01: Stage Gate Intent Classification & Validation Summary

**Regex-based intent classifier with reverse-order stage scanning, stage validator with warm redirect messages, and comprehensive prompt block generator for FRED system prompt injection.**

## What Was Built

### Task 1: Stage Topic Mapping + Intent Classifier
- `lib/oases/stage-topics.ts`: STAGE_TOPIC_MAP covering all 5 Oases stages with 10-16 keyword RegExp patterns each. Word-boundary matching prevents false positives. `getStageForTopic` helper for simple lookups.
- `lib/oases/intent-classifier.ts`: `classifyIntent(message)` scans from grow->clarity (highest first) to catch premature topics. Returns `{ detectedStage, matchedTopic, confidence }` with high/medium/low confidence levels. Returns null for general conversation.

### Task 2: Stage Validator + Prompt Block Generator
- `lib/oases/stage-validator.ts`:
  - `validateStageAccess(message, currentStage)`: Compares classified intent against user's current stage. Blocks later-stage topics with warm redirect messages. Gap-aware messaging (1 stage ahead vs 2+ stages ahead).
  - `buildStageGatePromptBlock(currentStage)`: Generates comprehensive prompt block for FRED's system prompt listing current stage agenda, allowed topics, restricted topics, and redirect language templates. Includes CRITICAL instruction about tone.

## Decisions Made

1. **Reverse-order scanning** — Highest stage checked first ensures premature topics are caught before lower-stage matches
2. **Conservative matching** — When multiple stages match, return the highest (most restrictive)
3. **General conversation always allowed** — Greetings, emotional support, wellbeing topics return null and pass through
4. **Fred Cary voice** — Redirect messages use "Let's nail X first" framing, never "You can't do that yet"

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes with no errors in new files (pre-existing errors in unrelated files only)
- All 3 files created with expected exports
- STAGE_TOPIC_MAP has 5 stages with 10+ keyword patterns each
- classifyIntent returns null for general conversation
- validateStageAccess blocks future-stage topics with redirect messages
- buildStageGatePromptBlock generates complete prompt injection block

## Next Phase Readiness

Phase 80 Plan 02 can now wire these modules into the FRED chat pipeline:
- Import `validateStageAccess` to check messages before responding
- Import `buildStageGatePromptBlock` to inject stage-gate rules into system prompt
- All modules are pure functions with no DB calls or side effects
