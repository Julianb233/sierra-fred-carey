---
phase: 80-structured-stage-gate-enforcement
plan: 02
subsystem: fred-chat-pipeline
tags: [oases, stage-gate, chat-pipeline, prompt-injection, stage-validation]
dependency-graph:
  requires: [80-01]
  provides: [stage-gate-chat-enforcement, stage-redirect-prompt-block]
  affects: [83, 84, 85]
tech-stack:
  added: []
  patterns: [prompt-level-enforcement, pre-validation-redirect, context-priority-ordering]
key-files:
  created: []
  modified:
    - lib/fred/context-builder.ts
    - app/api/fred/chat/route.ts
decisions:
  - id: d80-02-01
    decision: "Stage-gate prompt block injected via context-builder after startup process section, before channel context"
  - id: d80-02-02
    decision: "Pre-validation stageRedirectBlock placed FIRST in fullContext array for highest LLM priority"
  - id: d80-02-03
    decision: "No API-level blocking — redirects happen conversationally via prompt injection"
  - id: d80-02-04
    decision: "stageRedirectBlock is empty string for allowed messages, filtered out by .filter(Boolean) — zero overhead"
metrics:
  duration: ~5m
  completed: 2026-03-08
---

# Phase 80 Plan 02: Wire Stage-Gate Enforcement into Chat Pipeline Summary

**Stage-gate enforcement wired into FRED chat pipeline via context-builder prompt block injection and chat route pre-validation with redirect prompt blocks.**

## What Was Built

### Task 1: Stage-Gate Prompt Block in Context Builder
- `lib/fred/context-builder.ts`: Imports `buildStageGatePromptBlock` from `@/lib/oases/stage-validator` and `OasesStage` type
- Extracts `currentOasesStage` from active memory: `activeMemory.oases_stage?.value || "clarity"`
- Generates and appends stage-gate prompt block after startup process section, before channel context
- Returns `oasesStage` in the result object for downstream use by chat route
- Block tells FRED: current stage, allowed topics, restricted topics, redirect templates

### Task 2: Stage-Gate Pre-Validation in Chat Route
- `app/api/fred/chat/route.ts`: Imports `validateStageAccess` and `OasesStage`
- Extracts `currentOasesStage` from `founderContextResult.oasesStage`
- Runs `validateStageAccess(message, currentOasesStage)` before fullContext assembly
- When violation detected: builds `stageRedirectBlock` with explicit redirect instructions
- `stageRedirectBlock` placed FIRST in fullContext array (highest priority)
- Empty string when allowed, filtered by `.filter(Boolean)` — no overhead for normal messages
- Also added to truncation priority list at position 0

## Decisions Made

1. **Prompt-level enforcement** — No API errors or blocks. FRED redirects conversationally using injected prompt instructions
2. **Highest priority placement** — stageRedirectBlock is first in fullContext array so LLM sees it before all other context
3. **Zero overhead for allowed messages** — stageRedirectBlock is empty string and gets filtered out
4. **Dual enforcement** — Both the static `buildStageGatePromptBlock` (always present) and dynamic `stageRedirectBlock` (only on violations) work together

## Deviations from Plan

1. Code was already committed in `f2d5bea` from a prior session. This pass verified completeness and fixed a syntax error.
2. Fixed escaped exclamation mark (`\!` -> `!`) on line 711 that caused TypeScript parse error TS1127.

## Verification Results

- Imports resolve correctly (`validateStageAccess`, `OasesStage`, `buildStageGatePromptBlock`)
- `currentOasesStage` extracted and defaults to "clarity" when missing
- `stageRedirectBlock` appears first in fullContext array
- `npx tsc --noEmit` passes clean for all Phase 80 files (context-builder.ts, stage-validator.ts, chat/route.ts)
- Stage-gate prompt block successfully injected into founder context output
- Full build blocked by pre-existing errors from other concurrent agents (unrelated to Phase 80)

## Next Phase Readiness

Phases 83 (Founder Mindset Monitor), 84 (Daily Mentor Guidance), and 85 (Journey-Gated Fund Matching) can now build on top of the stage-gate enforcement infrastructure:
- `validateStageAccess` for checking topic appropriateness
- `buildStageGatePromptBlock` for prompt injection
- `classifyIntent` for intent detection
- `currentOasesStage` available in chat route for downstream logic
