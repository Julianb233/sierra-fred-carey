# Phase 79-01 Summary: Active Founder Memory Foundation

## Status: COMPLETE

## What Was Built

### 1. FounderMemory Type System (`lib/fred/founder-memory-types.ts`)
- `MemoryField<T>` interface with value, confidence (0-1), source, lastUpdated
- `FounderMemory` interface with 7 core fields: founder_name, company_name, stage, market, co_founder, biggest_challenge, oases_stage
- `CoreMemoryFieldKey` union type for type-safe field access
- `MemoryUpdate` interface for extraction results
- Staleness detection: `isStale()`, `getStaleFields()`, `getMissingFields()`
- Factory functions: `emptyField()`, `emptyFounderMemory()`

### 2. Active Memory Builder (`lib/fred/active-memory.ts`)
- `buildActiveFounderMemory(userId, hasPersistentMemory)` -- merges profile + semantic memory + enrichment data with confidence scoring
- `formatMemoryBlock(memory)` -- produces the ACTIVE FOUNDER CONTEXT prompt block with stale/missing field instructions
- `extractMemoryUpdates(userMessage, assistantResponse)` -- LLM-based fact extraction from chat exchanges
- `persistMemoryUpdates(userId, updates, hasPersistentMemory)` -- stores extracted facts to both profiles table and semantic memory

### 3. Memory Extraction Prompt (`lib/ai/memory-extraction-prompt.ts`)
- `MEMORY_EXTRACTION_PROMPT` -- focused prompt for extracting 7 core fact types
- `parseExtractionResult(raw)` -- safely parses LLM JSON output into MemoryUpdate[]
- `buildExtractionInput(userMessage, assistantResponse)` -- assembles the full prompt

### 4. Database Migration
- `supabase/migrations/20260308100001_add_co_founder_and_company_name.sql` -- adds co_founder and company_name columns to profiles

### 5. Context Builder Updates (`lib/fred/context-builder.ts`)
- Added `coFounder: string | null` to FounderProfile interface
- Added `co_founder` to SELECT query in loadFounderProfile
- Integration with active memory layer via `buildActiveFounderMemory` and `formatMemoryBlock`

## Key Design Decisions
- Used numeric confidence (0-1) instead of enum for finer granularity
- Named types `FounderMemory` instead of `FounderContext` to avoid confusion with the context-builder's `FounderContextData`
- Active memory builder has its own DB query (separate from loadFounderProfile) to select exactly the fields it needs
- Extraction uses the existing `fred-client` generate function rather than direct OpenAI SDK calls

## Verification
- TypeScript compiles cleanly (no new errors introduced)
- All files exist and export the expected functions/types
- context-builder.ts loads co_founder from profiles
