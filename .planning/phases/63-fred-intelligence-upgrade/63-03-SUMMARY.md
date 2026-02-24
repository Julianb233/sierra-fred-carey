---
phase: 63-fred-intelligence-upgrade
plan: 03
subsystem: fred-context-management
tags: [context-window, summarization, token-management, llm-pipeline]
dependency-graph:
  requires: [63-01]
  provides: [conversation-summarization, context-budget-enforcement]
  affects: [63-04]
tech-stack:
  added: []
  patterns: [priority-based-truncation, llm-summarization-fallback, token-budget-enforcement]
key-files:
  created: []
  modified:
    - lib/ai/context-manager.ts
    - app/api/fred/chat/route.ts
decisions:
  - id: "63-03-01"
    decision: "100K token budget for system prompt context, leaving ~28K for conversation + response"
    rationale: "Primary model (GPT-4o) has 128K limit; 4K reserved for response, ~24K for conversation history"
  - id: "63-03-02"
    decision: "Priority-based block truncation drops least critical blocks first"
    rationale: "founderContext and frameworkBlock are most important for response quality; deckReviewReady and deckProtocol are situational"
  - id: "63-03-03"
    decision: "shouldSummarize threshold at 60% of context limit AND >20 messages"
    rationale: "Triggers proactively before hitting hard limit, dual condition prevents unnecessary summarization on short conversations"
metrics:
  duration: "2 minutes"
  completed: "2026-02-24"
---

# Phase 63 Plan 03: Context Window Management and Summarization Summary

**One-liner:** LLM-based conversation summarization for long threads with priority-based system prompt truncation wired into the chat route.

## What Was Done

### Task 1: Add Conversation Summarization to context-manager.ts
- Added `shouldSummarize(messages, systemPromptTokens, model)` heuristic function
  - Returns true when messages.length > 20 AND estimated tokens exceed 60% of model context limit
  - Prevents unnecessary summarization on short conversations while catching long ones early
- Added `summarizeOlderMessages(messages, keepRecent)` async function
  - Splits messages into older (to summarize) and recent (to keep intact, default 10)
  - Filters older to user/assistant only (skips system messages)
  - Calls `generate()` with a summarization-focused system prompt (temperature 0.3, maxOutputTokens 512)
  - Returns a single system message with the summary + the recent messages
  - Falls back to `trimMessages()` if summarization LLM call fails (try/catch)

### Task 2: Wire Context Manager into Chat Route
- Imported `estimateTokens` from `@/lib/ai/context-manager` into the chat route
- Added context token estimation after `fullContext` assembly (line ~497)
- When `contextTokens > 100_000`, applies priority-based block truncation:
  - Priority order (highest first): founderContext, frameworkBlock, stepGuidanceBlock, rlStatusBlock, rlGateBlock, modeTransitionBlock, irsBlock, deckProtocolBlock, deckReviewReadyBlock
  - Drops lowest-priority blocks iteratively until under budget
  - If founderContext alone exceeds budget, truncates it to ~100K tokens worth of characters
- Logs `console.warn` when truncation occurs for monitoring

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 100K token budget for system prompt | 128K model limit - 4K response - ~24K conversation = ~100K |
| 2 | Priority-based block truncation | founderContext most critical; deck blocks most situational |
| 3 | 60% threshold + 20 message minimum for summarization | Proactive trigger without false positives on short chats |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors (no context-manager.ts or route.ts errors)
- Tests: 766/778 passing (same 12 pre-existing failures)
- context-manager.ts has both `summarizeOlderMessages` and `shouldSummarize`
- Chat route imports and uses `estimateTokens` for context budget enforcement
- Large system prompts truncated gracefully with console.warn logging

## Next Phase Readiness

**Blockers:** None
**Notes:**
- `summarizeOlderMessages` is available but not yet called from the chat route directly; it is designed for use when multi-turn conversation history is passed alongside the system prompt (e.g., future chat memory integration)
- `shouldSummarize` provides the heuristic check that callers can use to decide when to invoke summarization
- The context truncation in the chat route handles the system prompt side; conversation history management will be relevant when/if multi-turn history is added to the pipeline
