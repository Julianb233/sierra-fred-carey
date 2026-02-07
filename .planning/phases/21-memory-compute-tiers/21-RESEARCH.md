# Phase 21: Memory & Compute Tiers - Research

**Researched:** 2026-02-07
**Domain:** Tier-differentiated AI model selection, tiered memory depth, memory feature gating
**Confidence:** HIGH

## Summary

This research investigates what is needed to implement the three Phase 21 requirements: STUDIO-11 (priority compute), STUDIO-12 (deeper memory), and STUDIO-13 (memory tier gating). The investigation reveals three key findings:

1. **Model selection is hardcoded with no tier awareness.** Every AI engine in the codebase uses the same model regardless of user tier. The IRS engine hardcodes `openai('gpt-4o')` directly (line 90, `lib/fred/irs/engine.ts`). The Strategy generator hardcodes `openai('gpt-4o')` with `openai('gpt-4o-mini')` as a fallback (line 114, `lib/fred/strategy/generator.ts`). The FRED chat pipeline uses `generateStructuredReliable()` which defaults to the `"primary"` provider key (GPT-4o) without any tier parameter. The Reality Lens uses `generateStructuredReliable()` in the same way. None of these call sites accept or pass a tier parameter.

2. **Memory loading is flat -- no tier-based depth control.** The `loadMemoryActor` (line 26, `lib/fred/actors/load-memory.ts`) loads exactly 10 recent episodes and 5 recent decisions for every user regardless of tier. The `getAllUserFacts()` call loads every semantic fact with no limit. There is no concept of tier-based episodic depth, retention windows, or fact limits. The memory loading actor receives `(userId, sessionId)` but has no access to the user's tier.

3. **Memory features have zero tier gating.** The `/api/fred/memory` route (line 117, `app/api/fred/memory/route.ts`) requires only `requireAuth()` -- any authenticated user can read, write, and search all memory types. The `/api/fred/chat` route stores conversations in memory for all tiers via `storeInMemory: true` (line 42). The `useFredChat` hook defaults `storeInMemory: true` for all users (line 146, `lib/hooks/use-fred-chat.ts`). Free tier users get the same memory capabilities as Studio users.

**Primary recommendation:** This phase requires changes at three layers: (a) a model-selection utility that maps `UserTier` to `ProviderKey`, (b) tier-parameterized memory loading with configurable depth/retention, and (c) API-level tier gating on memory endpoints. All three can be implemented without new dependencies.

## Standard Stack

No new libraries are needed. This phase uses existing infrastructure in new ways.

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| `lib/ai/providers.ts` | Model registry (primary/fast/reasoning) | Source of model selection -- needs tier-aware wrapper |
| `lib/ai/fred-client.ts` | AI generation functions | All engines call through here -- `GenerateOptions.model` already accepts `ProviderKey` |
| `lib/db/fred-memory.ts` | Memory CRUD (episodic, semantic, procedural) | `retrieveRecentEpisodes` already has `limit` param; needs tier-based limits |
| `lib/fred/actors/load-memory.ts` | XState memory loading actor | Currently hardcodes `limit: 10` and `limit: 5` |
| `lib/api/tier-middleware.ts` | Tier detection (`getUserTier`, `checkTierForRequest`) | Already used by 20+ API routes |
| `lib/api/rate-limit.ts` | Rate limiting with `RATE_LIMIT_TIERS` | Already tier-differentiated (20/100/500 req/min) |
| `lib/constants.ts` | `UserTier` enum, `TIER_FEATURES`, `canAccessFeature()` | Feature list already mentions "Persistent founder memory" and "Priority compute" |
| `@upstash/ratelimit` + `@upstash/redis` | Production rate limiting | Already configured -- can reuse for memory storage quotas |

### Key Type Already Exists
| Type | Location | Key Fields |
|------|----------|------------|
| `ProviderKey` | `lib/ai/providers.ts` | `"primary" \| "fallback1" \| "fallback2" \| "fast" \| "reasoning"` |
| `UserTier` | `lib/constants.ts` | `FREE = 0, PRO = 1, STUDIO = 2` |
| `MemoryContext` | `lib/fred/types.ts` | `recentEpisodes`, `relevantFacts`, `recentDecisions` |
| `FredConfig` | `lib/fred/types.ts` | `enableMemory`, `aiTimeout`, `enabledModels` |
| `GenerateOptions` | `lib/ai/fred-client.ts` | `model?: ProviderKey` -- already wired to accept different models |
| `RateLimitConfig` | `lib/api/rate-limit.ts` | `limit`, `windowSeconds` -- already tier-differentiated |

## Architecture Patterns

### Current State: Complete Audit

#### STUDIO-11: Priority Compute -- Current Model Selection

Every AI engine in the codebase uses the same model for all users. No tier-based routing exists.

| Engine | File | Model Used | How Selected |
|--------|------|-----------|--------------|
| FRED Chat pipeline | `lib/ai/fred-client.ts:195` | GPT-4o (primary) | `getModel(options.model \|\| "primary")` -- no tier param |
| Reality Lens | `lib/fred/reality-lens.ts:174` | GPT-4o (primary) | `generateStructuredReliable()` -- defaults to primary |
| Investor Readiness | `lib/fred/irs/engine.ts:90` | `openai('gpt-4o')` | Hardcoded directly, bypasses provider system |
| Strategy Generator | `lib/fred/strategy/generator.ts:114` | `openai('gpt-4o')` with `openai('gpt-4o-mini')` fallback | Hardcoded directly, bypasses provider system |
| Pitch Deck Analyzer | `lib/fred/pitch/analyzers/index.ts` | Via `generateStructuredReliable()` | Defaults to primary |
| Scoring Engine | `lib/fred/scoring/engine.ts` | Via `generateStructuredReliable()` | Defaults to primary |
| Agent Tools | `lib/agents/*/tools.ts` | Via `generateStructuredReliable()` | Defaults to primary |

**Key insight:** The `GenerateOptions.model` field already accepts any `ProviderKey`. This means the plumbing for tier-based model selection already exists -- we just need a mapping function that converts `UserTier` to `ProviderKey` and passes it through.

**Available models for tier differentiation:**
| ProviderKey | Model | Cost (in/$M, out/$M) | Use Case |
|-------------|-------|---------------------|----------|
| `"fast"` | GPT-4o-mini | $0.15/$0.60 | Free tier -- fast, cost-effective |
| `"primary"` | GPT-4o | $2.50/$10 | Pro tier -- standard quality |
| `"reasoning"` | o1 | $15/$60 | Studio tier -- highest quality for complex analysis |

**IRS and Strategy bypass the provider system.** Both `lib/fred/irs/engine.ts` and `lib/fred/strategy/generator.ts` import `openai` directly from `@ai-sdk/openai` and hardcode model names. To make these tier-aware, they must be refactored to accept a `ProviderKey` or model instance parameter.

#### STUDIO-12: Deeper Memory -- Current Memory Loading

The `loadMemoryActor` in `lib/fred/actors/load-memory.ts` loads memory with flat limits:

```typescript
// Line 26-29 -- current implementation
const [episodes, facts, decisions] = await Promise.all([
  retrieveRecentEpisodes(userId, { limit: 10 }).catch(() => []),
  getAllUserFacts(userId).catch(() => []),
  getRecentDecisions(userId, { limit: 5 }).catch(() => []),
]);
```

**Problems:**
1. `limit: 10` for episodes is the same for all tiers
2. `getAllUserFacts()` loads ALL facts with no limit -- this is actually MORE generous than intended for Free tier
3. `limit: 5` for decisions is the same for all tiers
4. No time-based retention filter -- episodes from months ago are loaded equally
5. The actor function signature is `(userId, sessionId)` -- no tier parameter

**The `retrieveRecentEpisodes` function** (line 149, `lib/db/fred-memory.ts`) already accepts a `limit` parameter, making tier-based depth trivial to implement at the call site.

**The DB schema has no retention policy.** The `fred_episodic_memory` table (migration 021) has `created_at timestamptz` but no TTL, no automatic cleanup, and no tier column. Memory accumulates indefinitely.

**Recommended tier-based memory depth:**
| Parameter | Free | Pro | Studio |
|-----------|------|-----|--------|
| Episodic episodes loaded | 0 (no cross-session memory) | 10 | 25 |
| Semantic facts loaded | 0 (no persistent facts) | All | All |
| Recent decisions loaded | 0 | 5 | 15 |
| Memory retention window | Session only | 30 days | 90 days |
| Vector similarity search | Disabled | Enabled (limit 5) | Enabled (limit 15) |

#### STUDIO-13: Memory Tier Gating -- Current Access Control

Memory access currently has no tier gating:

| Endpoint/Feature | Current Protection | Tier Gating |
|------------------|-------------------|-------------|
| `GET /api/fred/memory` | `requireAuth()` only | None -- all tiers can read |
| `POST /api/fred/memory` | `requireAuth()` only | None -- all tiers can write |
| `DELETE /api/fred/memory` | `requireAuth()` only | None -- all tiers can delete |
| Chat memory storage | `storeInMemory: true` (default) | None -- all tiers store |
| Memory loading in pipeline | `loadMemoryActor()` | None -- all tiers load |
| `GET /api/fred/memory?type=search` | `requireAuth()` only | None -- all tiers search |

**Marketing promise vs. reality:**
- Pricing page shows "Persistent Founder Memory" as a Pro feature (line 55, `app/pricing/page.tsx`)
- Pricing page shows "Deeper Memory Persistence" as a Studio feature (line 86)
- `lib/constants.ts` lists "Persistent founder memory" under Pro tier (line 82) and "Priority compute & deeper memory" under Studio (line 92)
- But NONE of these are enforced -- Free users currently get the same memory as Studio users

**Where tier gating needs to be enforced:**

1. **API level** -- `/api/fred/memory` must check tier before allowing POST/GET/search operations
2. **Chat route level** -- `/api/fred/chat` should conditionally set `storeInMemory` based on tier
3. **Memory loading level** -- `loadMemoryActor` should load zero memory for Free tier (session-only experience)
4. **Frontend level** -- `useFredChat` hook should respect tier for `storeInMemory` default

### Recommended Pattern: Tiered AI Configuration

Create a centralized tier-to-config mapping that all engines can reference:

```typescript
// lib/ai/tier-config.ts (NEW)

import { UserTier } from "@/lib/constants";
import type { ProviderKey } from "./providers";

/**
 * AI compute configuration per tier
 */
export interface TierAIConfig {
  /** Default model for this tier */
  model: ProviderKey;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Temperature (lower = more deterministic) */
  temperature: number;
  /** Rate limit key */
  rateLimitKey: "free" | "pro" | "studio";
}

/**
 * Memory configuration per tier
 */
export interface TierMemoryConfig {
  /** Whether persistent memory is enabled */
  persistentMemoryEnabled: boolean;
  /** Max episodic episodes to load */
  episodicLimit: number;
  /** Max recent decisions to load */
  decisionsLimit: number;
  /** Whether to load semantic facts */
  loadSemanticFacts: boolean;
  /** Memory retention window in days (null = unlimited) */
  retentionDays: number | null;
  /** Whether vector similarity search is enabled */
  vectorSearchEnabled: boolean;
  /** Max vector search results */
  vectorSearchLimit: number;
  /** Whether to store new episodes from chat */
  storeConversations: boolean;
}

export const TIER_AI_CONFIG: Record<UserTier, TierAIConfig> = {
  [UserTier.FREE]: {
    model: "fast",          // GPT-4o-mini
    maxOutputTokens: 2048,
    temperature: 0.7,
    rateLimitKey: "free",
  },
  [UserTier.PRO]: {
    model: "primary",       // GPT-4o
    maxOutputTokens: 4096,
    temperature: 0.7,
    rateLimitKey: "pro",
  },
  [UserTier.STUDIO]: {
    model: "primary",       // GPT-4o (reasoning for complex analysis)
    maxOutputTokens: 8192,
    temperature: 0.7,
    rateLimitKey: "studio",
  },
};

export const TIER_MEMORY_CONFIG: Record<UserTier, TierMemoryConfig> = {
  [UserTier.FREE]: {
    persistentMemoryEnabled: false,
    episodicLimit: 0,
    decisionsLimit: 0,
    loadSemanticFacts: false,
    retentionDays: null,  // No retention since nothing is stored
    vectorSearchEnabled: false,
    vectorSearchLimit: 0,
    storeConversations: false,
  },
  [UserTier.PRO]: {
    persistentMemoryEnabled: true,
    episodicLimit: 10,
    decisionsLimit: 5,
    loadSemanticFacts: true,
    retentionDays: 30,
    vectorSearchEnabled: true,
    vectorSearchLimit: 5,
    storeConversations: true,
  },
  [UserTier.STUDIO]: {
    persistentMemoryEnabled: true,
    episodicLimit: 25,
    decisionsLimit: 15,
    loadSemanticFacts: true,
    retentionDays: 90,
    vectorSearchEnabled: true,
    vectorSearchLimit: 15,
    storeConversations: true,
  },
};

/**
 * Get AI model for a user's tier
 */
export function getModelForTier(tier: UserTier): ProviderKey {
  return TIER_AI_CONFIG[tier].model;
}

/**
 * Get memory config for a user's tier
 */
export function getMemoryConfigForTier(tier: UserTier): TierMemoryConfig {
  return TIER_MEMORY_CONFIG[tier];
}
```

### File-by-File Change Map

#### STUDIO-11: Priority Compute

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/ai/tier-config.ts` (NEW) | Create tier-to-model/memory config mapping | Low |
| `lib/fred/irs/engine.ts` | Replace hardcoded `openai('gpt-4o')` with tier-aware model selection; accept `tier` param | Medium |
| `lib/fred/strategy/generator.ts` | Replace hardcoded model list with tier-aware selection; accept `tier` param | Medium |
| `lib/fred/reality-lens.ts` | Pass `model` option from tier config to `generateStructuredReliable()` | Low |
| `lib/fred/pitch/analyzers/index.ts` | Pass `model` option from tier config | Low |
| `lib/fred/scoring/engine.ts` | Pass `model` option from tier config | Low |
| `lib/fred/service.ts` | Accept optional `tier` in `FredServiceOptions`, propagate to actors | Low |
| `lib/fred/machine.ts` | Thread tier through context for actor inputs | Medium |
| `app/api/fred/chat/route.ts` | Get user tier (already does), pass to `createFredService` | Low |
| `app/api/fred/reality-lens/route.ts` | Pass tier to `assessIdea()` | Low |
| `app/api/fred/investor-readiness/route.ts` | Pass tier to `calculateIRS()` | Low |
| `app/api/fred/strategy/route.ts` | Pass tier to `generateDocument()` | Low |
| `app/api/fred/pitch-review/route.ts` | Pass tier to pitch review engine | Low |

#### STUDIO-12: Deeper Memory

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/fred/actors/load-memory.ts` | Accept `TierMemoryConfig`, use tier-based limits and retention window | Medium |
| `lib/db/fred-memory.ts` | Add `retrieveRecentEpisodesWithRetention()` accepting `retentionDays` param | Low |
| `lib/fred/machine.ts` | Pass tier memory config to `loadMemory` actor input | Low |
| `lib/fred/types.ts` | Add optional `tier` field to `FredContext` or machine input | Low |

#### STUDIO-13: Memory Tier Gating

| File | Change Type | Complexity |
|------|-------------|------------|
| `app/api/fred/memory/route.ts` | Add tier check -- Free users get 403 on POST/search, limited GET | Medium |
| `app/api/fred/chat/route.ts` | Conditionally set `storeInMemory` based on tier | Low |
| `lib/hooks/use-fred-chat.ts` | No change needed (server controls storage) | None |
| `app/api/fred/memory/route.ts` (GET) | Return empty results for Free tier on episodic/search queries | Low |

### How Tier Flows Through the System

Current flow (no tier awareness in AI/memory layer):
```
User Request
  -> API Route (gets tier for rate limiting only)
    -> FredService (no tier)
      -> XState Machine (no tier)
        -> loadMemoryActor (flat limits)
        -> synthesizeActor (default model)
        -> decideActor (default model)
```

Proposed flow:
```
User Request
  -> API Route (gets tier)
    -> FredService (receives tier)
      -> XState Machine (tier in context)
        -> loadMemoryActor (tier-based limits + retention)
        -> [all actors use tier-based model via config]
    -> Memory API (tier-gated access)
```

The change is minimal because:
1. `getUserTier()` is already called in every API route (for rate limiting)
2. `FredService` already accepts `options` -- just add `tier`
3. `GenerateOptions.model` already accepts `ProviderKey` -- just pass it
4. `retrieveRecentEpisodes` already accepts `limit` -- just vary it by tier

### IRS and Strategy Engine Refactoring Detail

The IRS engine (`lib/fred/irs/engine.ts`) bypasses the provider system entirely:

```typescript
// Line 89-95 -- current
const { object: result } = await generateObject({
  model: openai('gpt-4o'),  // Hardcoded!
  schema: IRSResultSchema,
  system: getSystemPrompt(),
  prompt: buildPrompt(input),
  temperature: 0.3,
});
```

Two approaches to fix:
- **Option A (minimal):** Accept a `model` parameter and pass it through:
  ```typescript
  export async function calculateIRS(
    input: IRSInput,
    options?: { model?: LanguageModel }
  ): Promise<IRSResult> {
    const { object: result } = await generateObject({
      model: options?.model ?? openai('gpt-4o'),
      // ...
    });
  }
  ```
- **Option B (consistent):** Refactor to use `generateStructuredReliable()` from the unified client, which already handles fallback and accepts `ProviderKey`. This brings IRS in line with Reality Lens and other engines.

**Recommendation:** Option B for IRS and Strategy. This normalizes model selection across all engines and ensures the fallback chain protects these engines too.

The Strategy generator has a similar issue (line 114):
```typescript
const models = [openai('gpt-4o'), openai('gpt-4o-mini')];
```
This hardcoded fallback list should be replaced with the unified provider system's `ProviderKey` + `generateStructuredReliable()` pattern or at minimum accept a tier-derived model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model selection by tier | Custom model registry | `ProviderKey` + `getModel()` from `lib/ai/providers.ts` | Already handles fallback chain, circuit breaker |
| Memory depth limits | Custom query builders per tier | Pass `limit` param to existing `retrieveRecentEpisodes()` | Function already accepts `limit` |
| Tier detection | Custom auth + tier lookup | `getUserTier()` from `lib/api/tier-middleware.ts` | Already used in 20+ routes, handles edge cases |
| Rate limiting per tier | Custom counters | `RATE_LIMIT_TIERS` from `lib/api/rate-limit.ts` | Already has free/pro/studio tiers with Redis backend |
| Feature gating UI | Custom lock components | `FeatureLock` from `components/tier/feature-lock.tsx` | Already supports `requiredTier`/`currentTier` props |
| Memory retention cleanup | Application-level delete loops | PostgreSQL `WHERE created_at > now() - interval` | DB-level filtering is faster and atomic |
| Model quality A/B testing | Custom experiment framework | `lib/ai/ab-testing.ts` | Already supports variant assignment, config overrides |

## Common Pitfalls

### Pitfall 1: Breaking IRS/Strategy by Swapping Models Without Testing
**What goes wrong:** Switching Free tier from GPT-4o to GPT-4o-mini causes IRS scores to drift -- the structured output schema validation may fail or produce nonsensical scores because smaller models handle complex scoring instructions less reliably.
**Why it happens:** Structured output schemas (Zod validation) are more likely to fail with smaller models. GPT-4o-mini sometimes struggles with complex multi-field scoring rubrics.
**How to avoid:** The key insight is that Free tier users cannot access IRS, Strategy, or Pitch Deck (these are Pro+ features gated by `checkTierForRequest(request, UserTier.PRO)`). So model quality only matters for engines that Free tier users actually use: FRED Chat and Reality Lens. Test GPT-4o-mini specifically with Reality Lens scoring and Chat heuristic pipeline.
**Warning signs:** Zod validation errors in logs after model switch; Reality Lens scores clustering at extremes.

### Pitfall 2: Memory Loading Failure Crashes the Chat Pipeline
**What goes wrong:** Adding tier-based memory logic to `loadMemoryActor` introduces a code path that throws (e.g., invalid tier, missing config) and the XState machine transitions to `error` state.
**Why it happens:** `loadMemoryActor` is currently wrapped in try/catch that returns empty context on failure (line 49-56). If new tier logic throws before the try/catch, the machine crashes.
**How to avoid:** Keep the existing try/catch safety net. Any tier config lookup should happen inside the try block. If tier is unknown, default to Free tier config (most restrictive = safest). Never let memory loading failure break the chat pipeline -- it is explicitly designed as non-critical (line 356, `lib/fred/machine.ts`: `onError` continues to `intake` state).
**Warning signs:** Chat returning "error" state for requests that should work; observability logs showing `MEMORY_ERROR` codes.

### Pitfall 3: Free Tier Users Lose In-Session Context
**What goes wrong:** Blocking Free tier from all memory storage means FRED cannot maintain context within a single chat session -- each message is processed in isolation.
**Why it happens:** Conflating "persistent cross-session memory" (the paid feature) with "in-session conversation context" (needed for basic usability).
**How to avoid:** The distinction is: Free tier should NOT persist memory between sessions but CAN have in-session context through the sessionId and message history. The `storeInMemory: false` flag for Free tier prevents writing to `fred_episodic_memory` table. But the chat interface already maintains messages client-side via `useFredChat` state. For FRED pipeline context, the `memoryContext` can still contain session-scoped data passed through the request body -- just not loaded from the database.
**Warning signs:** Free tier users reporting that FRED "forgets" what was said earlier in the same conversation.

### Pitfall 4: Retention Cleanup Deletes Data Before Users Can See It
**What goes wrong:** Adding a cron job or DB trigger that deletes episodes older than 30/90 days means a Pro user who doesn't log in for 31 days loses all memory.
**Why it happens:** Aggressive retention enforcement without considering user activity patterns.
**How to avoid:** Implement retention as a query filter, not a deletion job. When loading memory, filter by `WHERE created_at > now() - interval '30 days'` rather than actually deleting old rows. This way data is preserved for potential tier upgrades (a Free user who upgrades to Pro would gain access to their historical data). A separate background cleanup can run monthly to purge very old data (6+ months) for storage management.
**Warning signs:** Users complaining about lost context after inactivity periods.

### Pitfall 5: Exposing Tier Differences in Error Messages
**What goes wrong:** Memory API returns `"Memory features require Pro tier"` to Free users, revealing the tier gating mechanism and creating a confusing UX.
**Why it happens:** Using the standard `createTierErrorResponse()` which shows tier names and upgrade URLs.
**How to avoid:** For memory endpoints, return graceful degradation instead of errors. Free tier `GET /api/fred/memory?type=episodes` should return `{ success: true, data: [], count: 0, message: "Upgrade to Pro for persistent conversation history." }` -- not a 403 error. The memory POST should silently no-op for Free tier (accept the request, don't store, return success). This prevents frontend breakage and confusion.
**Warning signs:** 403 errors appearing in browser console for Free tier users during normal chat usage.

### Pitfall 6: o1 (Reasoning Model) Does Not Support System Prompts
**What goes wrong:** Routing Studio tier to the `"reasoning"` (o1) model for all engines causes failures because o1 does not support the `system` parameter.
**Why it happens:** The o1 model has a different API contract than GPT-4o -- it does not accept system messages and has different temperature constraints.
**How to avoid:** Do NOT use o1 as the default Studio tier model. Use GPT-4o as the Studio default (same as Pro), but offer o1 selectively for specific high-value operations (e.g., complex strategy analysis, deep IRS evaluation) where the 60x cost increase is justified. The `"reasoning"` ProviderKey should only be used through a separate opt-in path, not as the tier default.
**Warning signs:** API errors mentioning "system message not supported"; 60x cost increase with no measurable quality difference for simple queries.

## Code Examples

### Example 1: Tier-Aware Memory Loading

Source: Derived from existing `lib/fred/actors/load-memory.ts` and proposed `lib/ai/tier-config.ts`.

```typescript
// lib/fred/actors/load-memory.ts -- AFTER

import type { MemoryContext } from "../types";
import type { TierMemoryConfig } from "@/lib/ai/tier-config";

export async function loadMemoryActor(
  userId: string,
  sessionId: string,
  memoryConfig?: TierMemoryConfig
): Promise<MemoryContext> {
  // Default to most restrictive (Free tier) if no config provided
  const config = memoryConfig ?? {
    persistentMemoryEnabled: false,
    episodicLimit: 0,
    decisionsLimit: 0,
    loadSemanticFacts: false,
    retentionDays: null,
    vectorSearchEnabled: false,
    vectorSearchLimit: 0,
    storeConversations: false,
  };

  // Free tier: no persistent memory
  if (!config.persistentMemoryEnabled) {
    return {
      recentEpisodes: [],
      relevantFacts: [],
      recentDecisions: [],
    };
  }

  try {
    const {
      retrieveRecentEpisodes,
      getAllUserFacts,
      getRecentDecisions,
    } = await import("@/lib/db/fred-memory");

    const [episodes, facts, decisions] = await Promise.all([
      retrieveRecentEpisodes(userId, {
        limit: config.episodicLimit,
        // TODO: Add retentionDays filter to retrieveRecentEpisodes
      }).catch(() => []),
      config.loadSemanticFacts
        ? getAllUserFacts(userId).catch(() => [])
        : Promise.resolve([]),
      getRecentDecisions(userId, {
        limit: config.decisionsLimit,
      }).catch(() => []),
    ]);

    return {
      recentEpisodes: episodes.map((e) => ({
        eventType: e.eventType,
        content: e.content,
        createdAt: e.createdAt,
      })),
      relevantFacts: facts.map((f) => ({
        category: f.category,
        key: f.key,
        value: f.value,
      })),
      recentDecisions: decisions.map((d) => ({
        decisionType: d.decisionType,
        recommendation: d.recommendation || {},
        outcome: d.outcome,
      })),
    };
  } catch (error) {
    console.error("[FRED] Error loading memory:", error);
    return {
      recentEpisodes: [],
      relevantFacts: [],
      recentDecisions: [],
    };
  }
}
```

### Example 2: Tier-Aware Chat Route

Source: Derived from existing `app/api/fred/chat/route.ts`.

```typescript
// app/api/fred/chat/route.ts -- key changes (not full file)

import { getMemoryConfigForTier, getModelForTier } from "@/lib/ai/tier-config";

// Inside POST handler, after getUserTier:
const userTier = await getUserTier(userId);
const memoryConfig = getMemoryConfigForTier(userTier);

// Conditionally store in memory based on tier
const shouldStoreInMemory = storeInMemory && memoryConfig.storeConversations;

// Pass tier to FRED service
const fredService = createFredService({
  userId,
  sessionId: effectiveSessionId,
  enableObservability: true,
  tier: userTier, // NEW: tier parameter
});
```

### Example 3: Tier-Aware IRS Engine

Source: Derived from existing `lib/fred/irs/engine.ts`.

```typescript
// lib/fred/irs/engine.ts -- AFTER

import { getModel, type ProviderKey } from "@/lib/ai/providers";

export async function calculateIRS(
  input: IRSInput,
  options?: { modelKey?: ProviderKey }
): Promise<IRSResult> {
  const model = getModel(options?.modelKey ?? "primary");
  const context = buildContext(input);

  const { object: result } = await generateObject({
    model,
    schema: IRSResultSchema,
    system: getSystemPrompt(),
    prompt: buildPrompt(input),
    temperature: 0.3,
  });
  // ... rest unchanged
}
```

### Example 4: Memory API Tier Gating

Source: Derived from existing `app/api/fred/memory/route.ts`.

```typescript
// app/api/fred/memory/route.ts -- key additions

import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { getMemoryConfigForTier } from "@/lib/ai/tier-config";

// In GET handler:
const userTier = await getUserTier(userId);
const memoryConfig = getMemoryConfigForTier(userTier);

if (!memoryConfig.persistentMemoryEnabled) {
  // Free tier: return empty results with upgrade message
  return NextResponse.json({
    success: true,
    type: parsed.data.type,
    data: [],
    count: 0,
    tierMessage: "Upgrade to Pro for persistent conversation history and founder memory.",
  });
}

// In POST handler:
if (!memoryConfig.storeConversations) {
  // Silently accept but don't store for Free tier
  return NextResponse.json({
    success: true,
    type: "skipped",
    message: "Memory storage requires Pro tier.",
  });
}
```

### Example 5: Retention-Filtered Episode Retrieval

Source: Derived from existing `lib/db/fred-memory.ts`.

```typescript
// lib/db/fred-memory.ts -- new function

/**
 * Retrieve recent episodes with retention window filtering
 */
export async function retrieveRecentEpisodesWithRetention(
  userId: string,
  options: {
    limit?: number;
    retentionDays?: number | null;
    sessionId?: string;
    eventType?: EpisodeEventType;
  } = {}
): Promise<EpisodicMemory[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("fred_episodic_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 10);

  // Apply retention window
  if (options.retentionDays !== null && options.retentionDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.retentionDays);
    query = query.gte("created_at", cutoffDate.toISOString());
  }

  if (options.sessionId) {
    query = query.eq("session_id", options.sessionId);
  }

  if (options.eventType) {
    query = query.eq("event_type", options.eventType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FRED Memory] Error retrieving episodes:", error);
    throw error;
  }

  return (data || []).map(transformEpisodicRow);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single model for all users | Still single model (needs fixing) | Not yet changed | All users get GPT-4o regardless of tier |
| Flat memory loading (10 episodes) | Still flat (needs fixing) | Not yet changed | Free users get same depth as Studio |
| No memory tier gating | Still ungated (needs fixing) | Not yet changed | "Persistent Founder Memory" is free despite being a Pro feature |
| Tier-based rate limiting | Already implemented | Phase 12 | 20/100/500 req/min by tier -- good pattern to follow |
| Feature locking UI | Already implemented | Phase 10 | FeatureLock component works; can gate memory UI |

## Open Questions

1. **Studio model: GPT-4o or selective o1?**
   - What we know: o1 is 6x-60x more expensive per token and does not support system prompts. GPT-4o handles all current engines well.
   - What's unclear: Whether there is a measurable quality difference for Studio users between GPT-4o and o1 for Reality Lens/IRS scoring.
   - Recommendation: Default Studio to GPT-4o (same as Pro). Differentiate Studio through deeper memory, higher rate limits, and higher token limits. Reserve o1 for a potential future "deep analysis" mode that users explicitly opt into. The cost difference is too significant to justify as a default.

2. **Should Free tier chat work without any memory at all?**
   - What we know: The FRED chat pipeline uses `loadMemoryActor` to load context before processing. Setting all limits to 0 means FRED has no historical context.
   - What's unclear: Whether the XState pipeline handles empty memory context gracefully throughout all actors. The `synthesizeActor` and `mentalModelsActor` receive `memoryContext` -- if they expect non-empty arrays, they might produce worse results.
   - Recommendation: Yes, Free tier should work without persistent memory. The pipeline already handles null/empty `memoryContext` (confirmed: `loadMemoryActor` returns empty arrays on error, line 51-56). The experience will be session-scoped only. Test that actors produce reasonable output with empty memory.

3. **Memory retention: query filter or deletion job?**
   - What we know: The DB has no TTL or cleanup mechanism. Data grows indefinitely.
   - What's unclear: Whether Supabase's free tier has storage limits that would eventually be hit.
   - Recommendation: Start with query-time filtering (WHERE clause) for retention. Add a monthly Supabase Edge Function or cron that deletes episodes older than 6 months (well beyond any tier's retention window). This is simpler, safer, and allows tier upgrades to "unlock" historical data.

4. **Should tier be passed through the XState machine context?**
   - What we know: The `FredContext` type has no tier field. The machine creates actors with `input: ({ context }) => ({ ... })` patterns.
   - What's unclear: Whether adding tier to FredContext is the right level or if it should be in the machine's `input` type.
   - Recommendation: Add `tier: UserTier` to the machine's `input` type (not FredContext). This keeps tier as a configuration parameter that doesn't change during processing. The machine can then derive memory config and model selection from the tier at actor invocation time.

5. **What about A/B testing model quality per tier?**
   - What we know: `lib/ai/ab-testing.ts` already supports experiment variants with `configOverrides` and is wired into the logging pipeline.
   - What's unclear: Whether tier changes should be deployed as A/B tests first.
   - Recommendation: Use A/B testing for the Free tier model change (GPT-4o -> GPT-4o-mini). Run 50/50 for a week, compare Reality Lens score distributions and chat response quality metrics. This is the highest-risk change since it downgrades model quality.

## Sources

### Primary (HIGH confidence)
- `lib/ai/providers.ts` -- Read in full (242 lines): model registry, ProviderKey types, getModel() fallback logic
- `lib/ai/fred-client.ts` -- Read in full (569 lines): GenerateOptions with model field, all generate functions
- `lib/ai/fallback-chain.ts` -- Read in full (250 lines): provider fallback chain, circuit breaker integration
- `lib/ai/config-loader.ts` -- Read in full (288 lines): database-driven AI config, caching
- `lib/ai/ab-testing.ts` -- Read in full (342 lines): A/B variant assignment, config overrides
- `lib/ai/context-manager.ts` -- Read in full (180 lines): token budget management, model context limits
- `lib/ai/index.ts` -- Read in full (120 lines): unified exports
- `lib/fred/types.ts` -- Read in full (510 lines): FredContext, MemoryContext, FredConfig, DEFAULT_FRED_CONFIG
- `lib/fred/service.ts` -- Read in full (347 lines): FredService class, FredServiceOptions
- `lib/fred/machine.ts` -- Read in full (660 lines): XState machine, actor invocations, loadMemory actor config
- `lib/fred/actors/load-memory.ts` -- Read in full (59 lines): memory loading with hardcoded limits
- `lib/fred/actors/execute.ts` -- Read in full (325 lines): decision logging to memory, episode storage
- `lib/db/fred-memory.ts` -- Read in full (738 lines): all CRUD operations, retrieveRecentEpisodes with limit param
- `lib/db/migrations/021_fred_memory_schema.sql` -- Read in full (240 lines): all 4 memory tables, RLS policies, indexes
- `lib/constants.ts` -- Read in full (172 lines): UserTier enum, TIER_FEATURES, canAccessFeature()
- `lib/api/tier-middleware.ts` -- Read in full (255 lines): getUserTier, checkTierForRequest, requireTier wrapper
- `lib/api/rate-limit.ts` -- Read in full (335 lines): RATE_LIMIT_TIERS (20/100/500), Upstash backend
- `app/api/fred/chat/route.ts` -- Read in full (332 lines): tier-based rate limiting, storeInMemory flag, SSE streaming
- `app/api/fred/analyze/route.ts` -- Read in full (162 lines): tier-based rate limiting pattern
- `app/api/fred/memory/route.ts` -- Read in full (428 lines): memory API with no tier gating
- `app/api/fred/reality-lens/route.ts` -- Grep'd: getUserTier for rate limiting only, not model selection
- `lib/fred/reality-lens.ts` -- Read first 50 lines + grep'd: uses generateStructuredReliable (default primary)
- `lib/fred/irs/engine.ts` -- Read lines 1-30 + 80-110: hardcoded `openai('gpt-4o')` on line 90
- `lib/fred/strategy/generator.ts` -- Read lines 1-30 + 100-138: hardcoded models on line 114
- `lib/hooks/use-fred-chat.ts` -- Read in full (405 lines): storeInMemory default true, no tier awareness
- `components/tier/feature-lock.tsx` -- Read in full (229 lines): FeatureLock component pattern
- `app/pricing/page.tsx` -- Read first 100 lines: "Persistent Founder Memory" (Pro), "Deeper Memory Persistence" + "Priority Compute" (Studio)
- `.planning/REQUIREMENTS.md` -- Read in full: STUDIO-11, STUDIO-12, STUDIO-13 requirement definitions
- `.planning/ROADMAP.md` -- Read in full: Phase 21 success criteria
- Full grep across `app/api` for all `getUserTier`, `checkTierForRequest`, `requireTier` usage (60+ call sites)
- Full grep across `lib/fred` for all model references (no tier-based selection found)
- Full grep for `storeInMemory` across codebase (all default to true, no tier check)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all files read directly, no external dependencies needed
- STUDIO-11 (compute tiers): HIGH -- every model selection call site audited, GenerateOptions.model plumbing confirmed
- STUDIO-12 (deeper memory): HIGH -- loadMemoryActor, retrieveRecentEpisodes, and DB schema fully traced
- STUDIO-13 (memory gating): HIGH -- all memory access points (API, chat, pipeline) audited for tier checks
- Pitfalls: HIGH -- derived from direct code analysis of existing error handling patterns and model constraints
- Code examples: HIGH -- derived from actual file contents, using real function signatures and patterns

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
