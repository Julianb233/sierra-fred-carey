# Phase 21-01 Summary: Tier-Based Model Routing & Memory Depth Gating

**Status:** Complete
**Date:** 2026-02-07

## What Changed

### New File: `lib/ai/tier-routing.ts`
- Exports `getModelForTier(tier, purpose)` — maps user subscription tier to AI provider key
- Exports `getModelConfigForTier(tier)` — returns full config (provider keys, maxTokens, temperature)
- Exports `TIER_MODEL_MAP` — record mapping Free/Pro/Studio to model configurations
- Exports `ModelTier` and `TierModelConfig` types
- Free tier → "fast" provider (GPT-4o-mini, 1024 tokens)
- Pro tier → "primary" provider (GPT-4o, 2048 tokens)
- Studio tier → "primary" provider (GPT-4o, 4096 tokens)
- Integrates with existing `getModel()` from `lib/ai/providers.ts`
- Handles numeric UserTier enum values, mixed case, and unknown values gracefully

### Modified: `lib/agents/base-agent.ts`
- `runAgent()` now accepts optional `userTier` parameter (3rd argument)
- When no explicit model override is set in agent config, uses `getModelForTier(userTier, "agent")` to select the provider
- Backward compatible — existing callers without tier default to "free" (fast model)

### Modified: `app/api/agents/route.ts`
- Resolves user tier name from `getUserTier()` + `TIER_NAMES` mapping
- Embeds `userTier` in the task's `input` object so specialist agents can access it
- Passes `userTierName` to `startAgentExecution()` which forwards it to the orchestrator task

### Modified: `lib/constants.ts`
- Added `MEMORY_CONFIG` constant with per-tier settings:
  - Free: 5 maxMessages, 0 retentionDays, no episodic memory
  - Pro: 20 maxMessages, 30 retentionDays, 10 episodic items
  - Studio: 50 maxMessages, 90 retentionDays, 25 episodic items
- Added `MemoryTier` type (`"free" | "pro" | "studio"`)

### Modified: `lib/fred/actors/load-memory.ts`
- `loadMemoryActor()` now accepts optional `tier` parameter (3rd argument)
- Reads `MEMORY_CONFIG` to apply tier-appropriate limits
- Free tier: skips persistent memory entirely (returns empty context)
- Pro/Studio: loads episodic memory up to `maxEpisodicItems`, limits decisions to `maxMessages`

### Modified: `app/api/fred/chat/route.ts`
- Imports `getModelForTier` from `lib/ai/tier-routing`
- Resolves tier name from `getUserTier()` and computes model provider key
- Determines `hasPersistentMemory` flag (Pro+ only)
- Free tier: session-only — `storeEpisode()` calls are skipped
- Pro/Studio: persistent memory — episodes stored as before
- Response metadata includes `tier` and `persistentMemory` flags

## Verification
- `npx tsc --noEmit` passes with 0 errors
- All 6 plan verification checks pass
- No existing logic removed — all changes are additive
- All tier parameters default to "free" when unavailable

## Files
| File | Action |
|------|--------|
| `lib/ai/tier-routing.ts` | Created |
| `lib/agents/base-agent.ts` | Modified |
| `app/api/agents/route.ts` | Modified |
| `lib/constants.ts` | Modified |
| `lib/fred/actors/load-memory.ts` | Modified |
| `app/api/fred/chat/route.ts` | Modified |
