---
phase: 79-active-founder-memory-layer
plan: 01
subsystem: memory
tags: [memory, types, extraction, supabase, prompt-engineering]
dependency-graph:
  requires: []
  provides:
    - FounderMemory type system with confidence scoring
    - Active memory builder (profile + semantic + enrichment merger)
    - LLM memory extraction prompt and parser
    - DB migration for co_founder and company_name columns
  affects:
    - 79-02 (wires memory into chat pipeline)
    - 80-xx (core experience phases depend on founder context)
tech-stack:
  added: []
  patterns:
    - "MemoryField<T> with confidence/source/staleness per field"
    - "Fire-and-forget persistence pattern (non-blocking after chat)"
    - "LLM extraction with structured JSON + safe parser fallback"
key-files:
  created:
    - lib/fred/founder-memory-types.ts
    - lib/fred/active-memory.ts
    - lib/ai/memory-extraction-prompt.ts
    - supabase/migrations/20260308100001_add_co_founder_and_company_name.sql
  modified: []
decisions:
  - id: "79-01-d1"
    decision: "Semantic memory facts override profile fields when available (higher recency = higher confidence)"
    reason: "Conversation-extracted facts are more recent than onboarding data"
  - id: "79-01-d2"
    decision: "persistMemoryUpdates writes to BOTH profiles table AND semantic memory for redundancy"
    reason: "Profile is source of truth for queries, semantic memory enables search and context building"
  - id: "79-01-d3"
    decision: "Extraction uses temperature 0.2 and maxOutputTokens 256 for fast deterministic output"
    reason: "Memory extraction is a background task that must be fast and predictable"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-08"
---

# Phase 79 Plan 01: Active Founder Memory Data Layer Summary

**One-liner:** FounderMemory structured type with 7 core fields, confidence scoring, staleness detection, active memory builder merging 3 data sources, and LLM extraction prompt for post-chat enrichment.

## What Was Built

### 1. FounderMemory Type System (`lib/fred/founder-memory-types.ts`)
- `MemoryField<T>` interface with `value`, `confidence` (0-1), `source` (profile/onboarding/conversation/enrichment), and `lastUpdated`
- `FounderMemory` interface with 7 core fields + `additional` record for extended facts
- `MemoryUpdate` interface for conversation-extracted updates
- `CORE_MEMORY_FIELDS` constant array: founder_name, company_name, stage, market, co_founder, biggest_challenge, oases_stage
- `isStale()` -- checks if a field is older than 7 days (configurable threshold)
- `getStaleFields()` -- returns all stale core fields
- `getMissingFields()` -- returns all core fields with no value
- `emptyFounderMemory()` factory function

### 2. Active Memory Builder (`lib/fred/active-memory.ts`)
- `buildActiveFounderMemory(userId, hasPersistentMemory)` -- merges profile columns, semantic memory facts, and enrichment JSONB into a single FounderMemory struct with confidence scoring per field
- `formatMemoryBlock(memory)` -- generates the `## ACTIVE FOUNDER CONTEXT` prompt block with CRITICAL INSTRUCTION to reference founder details in every response, stale field re-confirmation prompts, and missing field collection instructions
- `extractMemoryUpdates(userMessage, assistantResponse)` -- calls LLM with extraction prompt to identify new/updated founder facts from chat
- `persistMemoryUpdates(userId, updates)` -- fire-and-forget storage to both profiles table (direct column update) and semantic memory (via storeFact), with full error handling

### 3. Memory Extraction Prompt (`lib/ai/memory-extraction-prompt.ts`)
- `MEMORY_EXTRACTION_PROMPT` -- structured prompt for LLM fact extraction with confidence scoring rules (0.7-1.0 based on explicitness)
- `parseExtractionResult(raw)` -- safe JSON parser with markdown fence stripping, field validation, confidence range checking, and empty array fallback
- `buildExtractionInput(userMessage, assistantResponse)` -- composes the full prompt with conversation exchange

### 4. DB Migration
- `supabase/migrations/20260308100001_add_co_founder_and_company_name.sql` -- adds `co_founder TEXT` and `company_name TEXT` columns to profiles table with `IF NOT EXISTS` safety

## Data Flow

```
Profile Table ──┐
                 ├──> buildActiveFounderMemory() ──> FounderMemory struct
Semantic Facts ──┤                                        │
                 │                                        ├──> formatMemoryBlock() ──> prompt injection
Enrichment JSONB ┘                                        │
                                                          │
Chat Exchange ──> extractMemoryUpdates() ──> MemoryUpdate[] ──> persistMemoryUpdates()
                                                                     │
                                                     ┌───────────────┤
                                                     ▼               ▼
                                              profiles table    semantic memory
```

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no errors in new files
- `npm run build` succeeds (221 pages compiled)
- All 4 expected exports from `active-memory.ts` present
- All expected exports from `founder-memory-types.ts` present
- All expected exports from `memory-extraction-prompt.ts` present
- Migration SQL file contains valid ALTER TABLE statements

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6ed0e88 | FounderMemory types, extraction prompt, DB migration |
| 2 | ebfb40f | Active memory builder with persistence and formatting |

## Next Phase Readiness

Plan 79-02 can now wire the active memory into the chat pipeline:
- Import `buildActiveFounderMemory` and `formatMemoryBlock` to replace/augment the existing `buildFounderContext` output
- Call `extractMemoryUpdates` + `persistMemoryUpdates` as post-chat fire-and-forget
- All types and functions are exported and ready for integration
