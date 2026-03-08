---
phase: 79-active-founder-memory
plan: 01
status: complete
completed_at: 2026-03-08
---

# Phase 79-01 Summary: Active Founder Memory Types and Builder

## Status: COMPLETE

## What Was Built

### 1. FounderContext Type Aliases (`lib/fred/founder-context-types.ts`) -- NEW
- `FounderContext` type (alias for `FounderMemory`) -- all 7 core fields with confidence scoring
- `MemoryConfidence` type: `"high" | "medium" | "low" | "unknown"`
- `FounderContextField` type (alias for `MemoryField`)
- `ExtractedFacts` interface for LLM extraction output
- Helpers: `toMemoryConfidence()`, `fromMemoryConfidence()`
- Re-exports `CoreMemoryFieldKey` for downstream consumers

### 2. FounderMemory Type System (`lib/fred/founder-memory-types.ts`) -- pre-existing
- `MemoryField<T>` interface with value, confidence (0-1), source, lastUpdated
- `FounderMemory` interface with 7 core fields: founder_name, company_name, stage, market, co_founder, biggest_challenge, oases_stage
- `CoreMemoryFieldKey` union type for type-safe field access
- `MemoryUpdate` interface for extraction results
- Staleness detection: `isStale()`, `getStaleFields()`, `getMissingFields()`
- Factory functions: `emptyField()`, `emptyFounderMemory()`

### 3. Active Memory Builder (`lib/fred/active-memory.ts`) -- UPDATED
- `buildActiveFounderMemory(userId, hasPersistentMemory)` -- merges profile + semantic memory + enrichment data with confidence scoring
- `buildActiveFounderContext` -- exported alias for `buildActiveFounderMemory` (plan spec requirement)
- `computeConfidence(lastUpdated: Date | null): MemoryConfidence` -- exported for testing (plan spec requirement)
- `formatMemoryBlock(memory)` -- produces the ACTIVE FOUNDER CONTEXT prompt block with stale/missing field instructions
- `extractMemoryUpdates(userMessage, assistantResponse)` -- LLM-based fact extraction from chat exchanges
- `persistMemoryUpdates(userId, updates, hasPersistentMemory)` -- stores extracted facts to both profiles table and semantic memory

### 4. Memory Extraction Prompt (`lib/ai/memory-extraction-prompt.ts`) -- pre-existing
- `MEMORY_EXTRACTION_PROMPT` -- focused prompt for extracting 7 core fact types
- `parseExtractionResult(raw)` -- safely parses LLM JSON output into MemoryUpdate[]
- `buildExtractionInput(userMessage, assistantResponse)` -- assembles the full prompt

### 5. Database Migration -- pre-existing
- `supabase/migrations/20260308100001_add_co_founder_and_company_name.sql` -- adds co_founder and company_name columns to profiles

### 6. Context Builder Integration (`lib/fred/context-builder.ts`) -- pre-existing
- Already imports and uses `buildActiveFounderMemory` and `formatMemoryBlock`
- Already selects `co_founder` via active-memory.ts profile query
- Phase 79 integration wired into `buildFounderContextWithFacts`

## Must-haves Verification

| Truth | Status |
|-------|--------|
| FounderContext struct contains all 7 core fields with confidence scores | PASS |
| buildActiveFounderContext returns structured context with confidence scoring | PASS |
| Memory extraction prompt identifies new facts from chat messages | PASS |
| co_founder column exists on profiles table | PASS |

| Artifact | Required Exports | Status |
|----------|-----------------|--------|
| `lib/fred/founder-context-types.ts` | FounderContext, MemoryConfidence, FounderContextField | PASS |
| `lib/fred/active-memory.ts` | buildActiveFounderContext, extractMemoryUpdates, computeConfidence | PASS |
| `lib/ai/memory-extraction-prompt.ts` | MEMORY_EXTRACTION_PROMPT, parseExtractionResult | PASS |
| Migration SQL | ALTER TABLE profiles ADD COLUMN co_founder | PASS |

## Key Design Decisions
- Used numeric confidence (0-1) in the canonical `MemoryField` for finer granularity; categorical `MemoryConfidence` provided as a conversion layer
- Named canonical types `FounderMemory`/`MemoryField` to avoid confusion with context-builder's `FounderContextData`; plan-required `FounderContext` is a type alias
- `buildActiveFounderContext` is a const alias for `buildActiveFounderMemory` for backward compatibility
- Extraction uses the existing `fred-client` generate function rather than direct OpenAI SDK calls

## TypeScript Compilation
`npx tsc --noEmit` -- zero errors in plan-scoped files. Pre-existing errors in unrelated modules (feedback, voice, funnel) are not in scope.
