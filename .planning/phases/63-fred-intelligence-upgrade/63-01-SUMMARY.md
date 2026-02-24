---
phase: 63-fred-intelligence-upgrade
plan: 01
subsystem: fred-memory
tags: [pgvector, embeddings, semantic-search, memory-retrieval]
dependency-graph:
  requires: [phase-21-memory-architecture]
  provides: [embedding-based-memory-retrieval, async-episode-embeddings, vector-search-rpcs]
  affects: [63-02, 63-03, 63-04]
tech-stack:
  added: []
  patterns: [fire-and-forget-embedding, parallel-recency-plus-similarity, graceful-fallback]
key-files:
  created:
    - lib/db/migrations/063_memory_vector_search_rpcs.sql
  modified:
    - lib/db/fred-memory.ts
    - lib/fred/actors/load-memory.ts
    - lib/fred/machine.ts
decisions:
  - id: "63-01-01"
    decision: "Thread currentMessage through machine context.input.message rather than FredServiceOptions"
    rationale: "The machine already stores user input in context before invoking loadMemory, so no service-level changes needed"
  - id: "63-01-02"
    decision: "Embedding generation runs in parallel with recency queries, not sequentially"
    rationale: "Reduces latency — embedding generation and DB queries overlap"
  - id: "63-01-03"
    decision: "Similarity thresholds: 0.75 for episodes, 0.7 for facts"
    rationale: "Episodes need higher threshold to avoid false matches; facts are more broadly useful"
metrics:
  duration: "3 minutes"
  completed: "2026-02-24"
---

# Phase 63 Plan 01: Embedding-Based Memory Retrieval Summary

**One-liner:** pgvector RPCs for episodic/semantic search, fire-and-forget embedding generation on episode store, and parallel recency+similarity memory retrieval in loadMemoryActor.

## What Was Done

### Task 1: pgvector RPC Functions + Async Embedding on Store
- Created `lib/db/migrations/063_memory_vector_search_rpcs.sql` with two RPC functions:
  - `search_episodic_memory(query_embedding, match_user_id, match_threshold, match_count)` — cosine similarity search on fred_episodic_memory
  - `search_semantic_memory(query_embedding, match_user_id, match_threshold, match_count, match_category)` — cosine similarity search on fred_semantic_memory with optional category filter
  - Both use `SECURITY DEFINER` for RLS bypass (service role context)
  - Both filter by `embedding IS NOT NULL` and similarity > threshold
- Added `fireEmbeddingGeneration(episodeId, text)` helper to `lib/db/fred-memory.ts`
  - Fire-and-forget: does not block storeEpisode
  - Truncates text to 8000 chars for embedding model limits
  - Wraps in try/catch, logs warnings on failure, never throws
- Modified `storeEpisode()` to call `fireEmbeddingGeneration` after successful insert
  - Only fires when content has a string `content` field (user/assistant messages)
  - Skips if embedding was already provided in options

### Task 2: Embedding-Based Memory Retrieval in loadMemoryActor
- Added `currentMessage` parameter to `loadMemoryActor`
- When `currentMessage` is provided and tier supports episodic memory:
  - Generates embedding for current message (truncated to 8000 chars)
  - Runs `searchEpisodesByEmbedding` and `searchFactsByEmbedding` in parallel alongside recency queries
  - Merges and deduplicates: episodes by ID, facts by category+key composite key
  - Slices to `config.maxEpisodicItems` limit
- Falls back silently to recency-only on any embedding failure
- Updated machine.ts `loadMemory` actor to accept and pass `currentMessage`
- Threads `context.input?.message` from machine context to loadMemory invoke

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Thread message through machine context, not service options | Machine already stores input before loading_memory state — no service-level changes needed |
| 2 | Parallel embedding generation with recency queries | Overlaps network I/O for lower latency |
| 3 | Similarity thresholds: 0.75 episodes, 0.7 facts | Higher threshold for episodes avoids noise; facts are broadly useful |

## Deviations from Plan

### Minor Adjustments

**1. No changes to chat route or service.ts needed**
- **Reason:** The plan suggested threading `currentMessage` through `createFredService` and `service.ts`, but the machine already has the user's message in `context.input.message` (set by USER_INPUT event before loading_memory). This made the threading simpler — only machine.ts needed to be updated to pass `context.input?.message` to the loadMemory actor input.
- **Impact:** Fewer files changed, same result.

## Verification Results

- TypeScript compiles without errors: `npx tsc --noEmit` passes
- Tests: 766/778 passing (same 12 pre-existing failures in profile-creation and get-started)
- Migration file contains valid SQL with both RPC functions
- storeEpisode has fire-and-forget embedding generation
- loadMemoryActor combines recency + similarity search
- Machine threads user message to memory loading
- No breaking changes — embedding failures fall back silently

## Next Phase Readiness

**Blockers:** None
**Notes:**
- Migration `063_memory_vector_search_rpcs.sql` needs to be run against the database for vector search to work (falls back to recency until deployed)
- Existing episodes without embeddings will gradually get embeddings as new conversations occur (fire-and-forget on store only)
- A backfill job for existing episodes could be added if needed but is not critical
