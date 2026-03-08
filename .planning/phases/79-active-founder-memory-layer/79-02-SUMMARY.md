---
phase: 79-active-founder-memory-layer
plan: 02
subsystem: memory
tags: [memory, chat-pipeline, prompt-engineering, context-builder, fire-and-forget]
dependency-graph:
  requires:
    - 79-01 (FounderMemory types, active memory builder, extraction prompt)
  provides:
    - Active founder memory wired into FRED chat pipeline end-to-end
    - Post-response memory extraction (fire-and-forget LLM call after each chat turn)
    - Mandatory founder-specific referencing in FRED core prompt
    - Co-founder as 7th Business Fundamental in collection protocol
  affects:
    - 80-xx (core experience phases depend on enriched founder context)
    - All FRED chat interactions (prompt updated with ACTIVE FOUNDER CONTEXT section)
tech-stack:
  added: []
  patterns:
    - "formatMemoryBlock replaces buildContextBlock for founder context generation"
    - "Fire-and-forget IIFE pattern for post-response memory extraction"
    - "Tier-gated persistence: profile columns for all, semantic facts for Pro+"
key-files:
  created: []
  modified:
    - lib/fred/context-builder.ts
    - lib/ai/prompt-layers.ts
    - app/api/fred/chat/route.ts
    - lib/fred/active-memory.ts
decisions:
  - id: "79-02-d1"
    decision: "persistMemoryUpdates accepts hasPersistentMemory param with default true for backward compatibility"
    reason: "Free-tier users get profile column updates, Pro+ get semantic memory too"
  - id: "79-02-d2"
    decision: "buildContextBlock marked deprecated but not deleted"
    reason: "Other code paths may still reference it; safe removal deferred"
  - id: "79-02-d3"
    decision: "Handoff instructions (first conversation) moved inline to buildFounderContextWithFacts"
    reason: "Legacy buildContextBlock contained handoff logic; replicated in new flow to maintain behavior"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-08"
---

# Phase 79 Plan 02: Wire Active Founder Memory into FRED Chat Pipeline Summary

**One-liner:** Context builder delegates to active memory layer with formatMemoryBlock, core prompt requires mandatory founder-specific references with stale/missing field handling, post-response LLM extraction fires after every chat turn for all tiers.

## What Was Built

### 1. Context Builder Integration (`lib/fred/context-builder.ts`)
- `buildFounderContextWithFacts` now calls `buildActiveFounderMemory(userId, hasPersistentMemory)` in its parallel Promise.all
- Core founder context block produced by `formatMemoryBlock(activeMemory)` instead of legacy `buildContextBlock`
- Return type extended with optional `memory: FounderMemory` field (backward-compatible)
- Handoff instructions (first conversation after onboarding, first conversation without data) preserved inline
- Co-founder status added to "no onboarding data" handoff instructions
- Legacy `buildContextBlock` marked `@deprecated` with migration note
- All existing appendages preserved: startup process progress, channel context, red flags

### 2. Core Prompt Update (`lib/ai/prompt-layers.ts`)
- `## FOUNDER SNAPSHOT (Context Memory)` renamed to `## FOUNDER SNAPSHOT (Active Context Memory)`
- Added **MANDATORY** instruction: FRED must reference at least one founder-specific detail in every substantive response
- Added **stale context** handling: naturally confirm fields flagged as stale (>7 days)
- Added **missing context** handling: weave collection into first 2-3 exchanges
- Co-founder added as 7th Business Fundamental: "Are you doing this solo or do you have a co-founder?"
- Rules updated: "7 fundamentals total. Weave into 2-3 exchanges naturally."
- Version bumped to 1.1.0, lastModified to 2026-03-08

### 3. Chat Route Memory Extraction (`app/api/fred/chat/route.ts`)
- Import `extractMemoryUpdates` and `persistMemoryUpdates` from `@/lib/fred/active-memory`
- Fire-and-forget memory extraction added in **both** non-streaming and streaming response paths
- Pattern: async IIFE with try/catch, console.warn on failure (same as existing enrichment, sentiment)
- Extraction runs on current turn only (user message + assistant response), not full history
- Passes `hasPersistentMemory` to `persistMemoryUpdates` for tier-gated persistence

### 4. Persistence Tier Gating (`lib/fred/active-memory.ts`)
- `persistMemoryUpdates` updated with `hasPersistentMemory: boolean = true` parameter
- Profile column updates (name, company_name, co_founder, stage, industry) run for ALL tiers
- Semantic memory facts (via storeFact) only stored when `hasPersistentMemory` is true (Pro+)

## Data Flow (End-to-End)

```
PRE-RESPONSE:
  buildFounderContextWithFacts()
    -> buildActiveFounderMemory(userId, hasPersistentMemory)
      -> profiles table + semantic facts + enrichment JSONB -> FounderMemory
    -> formatMemoryBlock(memory)
      -> "## ACTIVE FOUNDER CONTEXT" with CRITICAL INSTRUCTION
    -> inject into system prompt via {{FOUNDER_CONTEXT}}
    -> FRED references founder details in every response

POST-RESPONSE (fire-and-forget):
  extractMemoryUpdates(userMessage, assistantResponse)
    -> LLM extraction (temp 0.2, max 256 tokens)
    -> MemoryUpdate[] (field, value, confidence)
  persistMemoryUpdates(userId, updates, hasPersistentMemory)
    -> profiles table (ALL tiers)
    -> semantic memory (Pro+ only)
```

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npm run build` passes with no errors (all pages compiled)
- `npx vitest run lib/ai/__tests__/prompts.test.ts` -- 369/369 tests passing
- `grep -n "ACTIVE FOUNDER CONTEXT" lib/ai/prompt-layers.ts` -- 4 matches (section title + 3 references)
- `grep -n "extractMemoryUpdates" app/api/fred/chat/route.ts` -- import + 2 usages (streaming + non-streaming)
- `grep -n "persistMemoryUpdates" app/api/fred/chat/route.ts` -- import + 2 usages
- `grep -n "buildActiveFounderMemory" lib/fred/context-builder.ts` -- import + usage in Promise.all
- `grep -n "co-founder" lib/ai/prompt-layers.ts` -- fundamentals list + active context section
- No TypeScript errors in modified files

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 69571be | Context builder + prompt layers updated for active memory |
| 2 | aea817f | Post-response memory extraction wired into chat route |

## Next Phase Readiness

Phase 79 (Active Founder Memory Layer) is now complete:
1. FRED references founder-specific details in every response (CRITICAL INSTRUCTION in prompt)
2. Memory auto-refreshes after each conversation turn (fire-and-forget extraction)
3. Co-founder field flows end-to-end: profile -> context builder -> active memory -> prompt -> FRED
4. Stale fields (>7 days) trigger re-confirmation questions
5. Missing fields trigger natural collection within first 2-3 exchanges
6. All tiers get profile updates; Pro+ also gets semantic memory storage

Wave 1 Foundation phases (77, 78, 79) can now be followed by Wave 2 Core Experience phases (80, 81, 82).
