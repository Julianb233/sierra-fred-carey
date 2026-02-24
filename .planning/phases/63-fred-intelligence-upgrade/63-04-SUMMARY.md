---
phase: 63
plan: 04
subsystem: fred-intelligence
tags: [ai-tools, vercel-ai-sdk, tool-calling, memory-search]
dependency-graph:
  requires: [63-01]
  provides: [fred-tool-infrastructure, content-recommender-stub, provider-finder-stub, memory-search-tool]
  affects: [66, 67, 68, 69]
tech-stack:
  added: []
  patterns: [ai-tool-factory, tool-augmented-generation]
key-files:
  created:
    - lib/fred/tools/content-recommender.ts
    - lib/fred/tools/provider-finder.ts
    - lib/fred/tools/memory-search.ts
    - lib/fred/tools/index.ts
  modified:
    - lib/fred/actors/decide.ts
    - lib/ai/fred-client.ts
    - lib/fred/machine.ts
decisions:
  - key: tool-api
    value: "AI SDK v6 uses inputSchema (not parameters) for tool definitions"
  - key: stop-condition
    value: "AI SDK v6 uses stopWhen: stepCountIs(3) instead of maxSteps: 3"
  - key: tool-threading
    value: "userId threaded from machine context through decide actor to generate()"
  - key: generate-tools
    value: "tools and maxSteps added to GenerateOptions, passed through to streamText"
metrics:
  duration: ~6 minutes
  completed: 2026-02-24
---

# Phase 63 Plan 04: AI Tool Definitions and Integration Summary

**One-liner:** Vercel AI SDK tool() definitions for content recommendation (stub), provider finding (stub), and memory search (working), wired into FRED's LLM generation with multi-step tool calling.

## What Was Done

### Task 1: Create Tool Definitions
Created four files in `lib/fred/tools/`:

1. **content-recommender.ts** - Stub tool for Phase 66/67 content library. Returns structured "coming_soon" response with the query echoed back. Uses `inputSchema` with Zod for query, stage (startup stage enum), and format parameters.

2. **provider-finder.ts** - Stub tool for Phase 68/69 service marketplace. Returns structured "coming_soon" response with suggested follow-up questions. Parameters: serviceType, budget, urgency.

3. **memory-search.ts** - Working tool that searches episodic memory by embedding similarity. Factory function `createMemorySearchTool(userId)` returns a tool bound to the user. Generates embedding for query, searches with 0.65 similarity threshold, returns summaries with dates and relevance scores. Graceful error handling returns empty results on failure.

4. **index.ts** - Barrel export with `getFredTools(userId)` factory that returns all three tools keyed as `recommendContent`, `findProvider`, `searchMemory`.

### Task 2: Wire Tools into Decide Actor
Threaded tool support through the full call chain:

- **fred-client.ts**: Added `tools` and `maxSteps` to `GenerateOptions`. `generate()` passes tools to `streamText()` and uses `stopWhen: stepCountIs(maxSteps)` for multi-step tool calling (AI SDK v6 API).
- **decide.ts**: Added `userId` parameter to `decideActor()`. `generateWithLLM()` calls `getFredTools(userId)` and passes tools with `maxSteps: 3` to `generate()`.
- **machine.ts**: Updated decide actor invocation to pass `context.userId` through to `decideActor()`.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use `inputSchema` not `parameters` | AI SDK v6 renamed this field; `parameters` is SDK v4/v5 |
| `stopWhen: stepCountIs(3)` | AI SDK v6 replaced `maxSteps` with `stopWhen` stop conditions |
| Factory pattern for memory search | Tool needs userId binding at creation time for scoped queries |
| Tools optional via spread | `...(tools ? { tools, maxSteps: 3 } : {})` keeps non-tool paths unchanged |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AI SDK v6 API changes**
- **Found during:** Task 1
- **Issue:** Plan specified `parameters` and `maxSteps` but AI SDK v6 uses `inputSchema` and `stopWhen: stepCountIs()`
- **Fix:** Used correct v6 API (`inputSchema`, `stopWhen`, `stepCountIs`)
- **Files modified:** All tool files, fred-client.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e598782 | Create FRED AI tool definitions |
| 2 | f2d1785 | Wire AI tools into decide actor LLM generation |

## Verification

- TypeScript compiles without errors (only pre-existing sw.ts vibrate issue)
- Tests: 766/778 passing (same pre-existing failures)
- All three tool files use AI SDK `tool()` with Zod schemas
- `decide.ts` imports `getFredTools` and passes tools to `generate()`
- Memory search tool uses `searchEpisodesByEmbedding` with error handling
- Content and provider tools return structured "coming_soon" responses

## Next Phase Readiness

- Phase 66/67 (Content Library): Replace `recommendContentTool` execute function with real content search
- Phase 68/69 (Service Marketplace): Replace `findProviderTool` execute function with real provider search
- No new blockers introduced
