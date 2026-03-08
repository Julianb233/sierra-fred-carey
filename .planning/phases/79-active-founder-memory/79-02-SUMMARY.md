---
phase: 79-active-founder-memory
plan: 02
status: complete
completed_at: 2026-03-08
---

# Phase 79-02 Summary: Active Memory Chat Integration

## Status: COMPLETE

## What Was Built

### 1. Context Builder Integration (`lib/fred/context-builder.ts`) -- UPDATED

The `buildFounderContextWithFacts` function now integrates the active memory layer:

- Calls `buildActiveFounderMemory(userId, hasPersistentMemory)` in the existing `Promise.all` alongside profile, facts, and conversation state loading
- Uses `formatMemoryBlock(activeMemory)` to produce the ACTIVE FOUNDER CONTEXT section with:
  - All 7 core fields (founder_name, company_name, stage, market, co_founder, biggest_challenge, oases_stage) with confidence scoring
  - CRITICAL INSTRUCTION: "You MUST reference at least one of the above details in EVERY response"
  - Stale field prompts (>7 days) with re-confirmation language
  - Missing field collection instructions
- Legacy `buildContextBlock` marked `@deprecated` in favor of `formatMemoryBlock`
- Handoff instructions (first conversation / returning user) appended after the active context block
- Returns `memory` (FounderMemory) in the result for downstream consumers
- No duplicate DB queries -- profile and facts loaded once and shared

### 2. Chat Route Memory Extraction (`app/api/fred/chat/route.ts`) -- UPDATED

Fire-and-forget LLM-based memory extraction wired into both code paths:

- **Non-streaming path**: After response generation, calls `extractMemoryUpdates()` + `persistMemoryUpdates()` in a fire-and-forget async IIFE, gated behind `shouldPersistMemory` (Pro+ only)
- **Streaming path**: Same extraction pattern inside the `isComplete` block after the assistant response is stored
- Extraction uses `extractMemoryUpdates(userMessage, assistantResponse)` which sends the exchange to the LLM with the MEMORY_EXTRACTION_PROMPT
- Persistence uses `persistMemoryUpdates(userId, updates, hasPersistentMemory)` which:
  - Updates profile columns (name, company_name, co_founder, stage, industry) for ALL tiers
  - Stores semantic memory facts for Pro+ tiers only
- Complementary to existing `fireEnrichment` (regex-based, free, fast) -- both run in parallel
- Console logging: `[Active Memory] Extracted and stored N facts for user XXXXXXXX...`
- Error handling: warnings logged, never thrown -- extraction failures are non-blocking

### 3. System Prompt Architecture (`lib/ai/prompt-layers.ts`) -- VERIFIED

The FRED_CORE_PROMPT already includes the ACTIVE FOUNDER CONTEXT integration:

- `{{FOUNDER_CONTEXT}}` placeholder replaced at runtime with the output of `formatMemoryBlock`
- FOUNDER SNAPSHOT section instructs FRED to:
  - MANDATORY: reference at least one founder-specific detail in every substantive response
  - Confirm stale fields naturally ("Last time we spoke, you mentioned [X]...")
  - Weave missing field collection into first 2-3 exchanges
  - Never give generic startup advice when specific context is available

## Must-Have Verification

| Requirement | Status | Evidence |
|---|---|---|
| Every FRED chat references founder's specific context | DONE | CRITICAL INSTRUCTION in formatMemoryBlock + MANDATORY in prompt-layers.ts |
| New facts auto-extracted from chat | DONE | extractMemoryUpdates + persistMemoryUpdates in both streaming/non-streaming paths |
| Stale memory (>7 days) triggers confirmation | DONE | getStaleFields() in formatMemoryBlock produces re-confirmation prompts |
| Memory extraction is fire-and-forget | DONE | Async IIFE pattern, errors caught and warned, never awaited |
| CRITICAL INSTRUCTION in every system prompt | DONE | formatMemoryBlock always includes it, {{FOUNDER_CONTEXT}} always replaced |
| Gated behind Pro+ (shouldPersistMemory) | DONE | Both paths check `if (shouldPersistMemory)` before extraction |

## Key File Changes

- `lib/fred/context-builder.ts` -- buildFounderContextWithFacts uses active memory, returns FounderMemory
- `app/api/fred/chat/route.ts` -- imports + fire-and-forget extraction in both paths
- `lib/ai/prompt-layers.ts` -- verified ACTIVE FOUNDER CONTEXT section present (no changes needed)

## Architecture: End-to-End Memory Loop

```
User sends message
  -> buildFounderContextWithFacts loads active memory (profile + semantic + enrichment)
  -> formatMemoryBlock produces ACTIVE FOUNDER CONTEXT with CRITICAL INSTRUCTION
  -> {{FOUNDER_CONTEXT}} injected into FRED_CORE_PROMPT
  -> FRED responds with founder-specific context
  -> Fire-and-forget: extractMemoryUpdates (LLM) + persistMemoryUpdates
  -> Fire-and-forget: fireEnrichment (regex) + profile update
  -> Next message starts with updated memory
```
