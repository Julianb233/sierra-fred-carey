---
phase: 79
plan: 01
subsystem: memory
tags: [memory, extraction, schema, fred, ai]
dependency-graph:
  requires: []
  provides: [structured-memory-14-fields, rephrase-extraction, all-tier-extraction]
  affects: [79-02, chat-personalization]
tech-stack:
  added: []
  patterns: [fire-and-forget-extraction, semantic-memory-mapping]
key-files:
  created: []
  modified:
    - lib/fred/founder-memory-types.ts
    - lib/ai/memory-extraction-prompt.ts
    - lib/fred/active-memory.ts
    - app/api/fred/chat/route.ts
decisions:
  - Memory extraction runs for ALL tiers (not just Pro+); persistMemoryUpdates handles tier gating internally
  - 7 new fields added to CORE_MEMORY_FIELDS (traction, revenue_status, funding_status, team_size, product_status, ninety_day_goal, key_decisions)
  - Rephrase rule added for biggest_challenge, traction, and key_decisions extraction
metrics:
  duration: ~8min
  completed: 2026-03-09
---

# Phase 79 Plan 01: Extended Memory Schema & Auto-Refresh Pipeline Summary

JWT-style structured memory extended from 7 to 14 core fields with rephrase rules and all-tier extraction.

## What Was Done

### Task 1: Extend structured memory schema and extraction prompt
- **CORE_MEMORY_FIELDS** expanded from 7 to 14 fields: added traction, revenue_status, funding_status, team_size, product_status, ninety_day_goal, key_decisions
- **FounderMemory** interface updated with typed fields and JSDoc descriptions
- **emptyFounderMemory()** factory updated with new empty field defaults
- **MEMORY_EXTRACTION_PROMPT** updated with 7 new field descriptions and extraction guidance
- Added **REPHRASE RULE** (rule 7): biggest_challenge, traction, and key_decisions are rephrased into concise summaries
- Added **key_decisions extraction rule** (rule 6): pivots and decisions trigger key_decisions extraction
- **buildActiveFounderMemory** populates new fields from profile columns (team_size, revenue_range, funding_history) and enrichment data fallbacks
- Semantic fact mapping extended: 6 new category/key mappings for traction, revenue, funding, product_status, goals, decisions
- **formatMemoryBlock** outputs all 14 fields in ACTIVE FOUNDER CONTEXT prompt section
- **PROFILE_COLUMN_MAP** extended with team_size and funding_status mappings
- **SEMANTIC_MAP** extended with 6 new category/key mappings
- **formatFieldLabel** updated with human-readable labels for all 14 fields
- Profile SELECT query updated to include team_size, revenue_range, funding_history

### Task 2: Wire auto-refresh pipeline into chat route
- Removed `shouldPersistMemory` guard from memory extraction calls in both streaming and non-streaming paths
- Memory extraction now runs fire-and-forget for ALL tiers (Free, Pro, Studio)
- `persistMemoryUpdates` handles tier gating internally: profile columns for all tiers, semantic facts for Pro+ only
- Used `void` prefix for fire-and-forget pattern (cleaner than `;(async () =>`)
- Verified `extractProfileEnrichment` (heuristic) still runs alongside LLM extraction
- Verified both are truly non-blocking (fire-and-forget after response stream)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1ec2624 | feat(memory): extend structured memory schema to 14 core fields with rephrase rules |
| 2 | f3081c9 | feat(memory): enable memory extraction for all tiers in chat route |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes (0 errors, excluding .next/types cache)
- `npm run test -- --run lib/db/__tests__/fred-memory.test.ts` passes (20/20 tests)
- `npm run test -- --run lib/ai/__tests__/prompts.test.ts` passes (45/45 tests)
- All 14 fields present in CORE_MEMORY_FIELDS
- Rephrase rule confirmed in extraction prompt
- extractMemoryUpdates called unconditionally (all tiers) in chat route
