# Phase 63: FRED Intelligence Upgrade - Research

**Researched:** 2026-02-23
**Domain:** AI chat memory retrieval, mode switching, tool calling, long conversation handling
**Confidence:** HIGH (codebase-derived, all findings verified against source files)

## Summary

Phase 63 upgrades four aspects of FRED's intelligence: (1) memory retrieval accuracy, (2) long conversation handling, (3) mode switching smoothness, and (4) new AI tools for content recommendation and provider finding. The codebase already has a substantial three-layer memory architecture (episodic, semantic, procedural) with pgvector embeddings, an XState v5 state machine pipeline, a diagnostic engine with mode transitions, and a context manager with token-based trimming.

The key gaps are: episodic memory is stored but **never used for semantic retrieval** during chat (loadMemoryActor fetches recent episodes by timestamp, not by embedding similarity); the context-manager.ts exists but is **not wired into the chat route**; mode switching uses regex-only signal detection with a static 3-message exit threshold that causes false positives; and there are **no AI tool definitions** anywhere in the codebase (the Vercel AI SDK tool() function is not used).

**Primary recommendation:** Focus on wiring existing infrastructure together (embedding-based retrieval, context trimming) before building new features (tools). The foundation is solid but underutilized.

## Standard Stack

The established libraries/tools already in this codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | ^6.0.72 | Text generation, streaming, structured output, embeddings, tool calling | Already used throughout; has native tool() support |
| @ai-sdk/openai | ^3.0.25 | OpenAI provider (GPT-4o, GPT-4o-mini, embeddings) | Primary provider |
| @ai-sdk/anthropic | ^3.0.37 | Anthropic provider (Claude fallback) | Fallback provider |
| xstate | ^5.26.0 | FRED state machine (decision pipeline) | Core architecture |
| @supabase/supabase-js | (installed) | Supabase client for pgvector, RLS, RPCs | Database layer |
| zod | 4.3.6 | Schema validation for structured outputs and tools | Used everywhere |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pgvector (Supabase) | extension | Vector similarity search | Memory retrieval |
| openai | ^6.15.0 | Direct OpenAI client (embeddings, some agents) | Embedding generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pgvector (Supabase) | Pinecone/Weaviate | External dependency; Supabase already has pgvector installed and tables created |
| Character-based token estimation | tiktoken | More accurate but adds dependency; current heuristic is fine for trimming |
| Custom tool calling | LangChain tools | Heavy dependency; Vercel AI SDK tool() is simpler and already in stack |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Current FRED Architecture (as-is)
```
app/api/fred/chat/route.ts          -- Entry point, SSE streaming
  -> lib/fred/context-builder.ts     -- Founder snapshot + semantic facts
  -> lib/ai/diagnostic-engine.ts     -- Mode detection (regex-based)
  -> lib/fred/service.ts             -- XState actor orchestrator
     -> lib/fred/machine.ts          -- State machine definition
        -> actors/load-memory.ts     -- Load recent episodes + facts
        -> actors/validate-input.ts  -- Intent, entity, burnout detection
        -> actors/mental-models.ts   -- Apply mental models
        -> actors/synthesize.ts      -- 7-factor scoring
        -> actors/decide.ts          -- Action determination + LLM response
        -> actors/execute.ts         -- Side effects
  -> lib/db/fred-memory.ts           -- Episodic/semantic/procedural CRUD
  -> lib/ai/context-manager.ts       -- Token estimation + message trimming (NOT WIRED IN)
```

### Target Architecture (to-be)
```
app/api/fred/chat/route.ts
  -> lib/fred/context-builder.ts     -- ENHANCED: embedding-based fact retrieval
  -> lib/ai/diagnostic-engine.ts     -- ENHANCED: confidence-based transitions, hysteresis
  -> lib/ai/context-manager.ts       -- WIRED IN: conversation summarization for 50+ msgs
  -> lib/fred/service.ts
     -> lib/fred/machine.ts
        -> actors/load-memory.ts     -- ENHANCED: embedding search for relevant episodes
        -> actors/decide.ts          -- ENHANCED: tool calling via Vercel AI SDK
  -> lib/fred/tools/                 -- NEW: Tool definitions
     -> content-recommender.ts       -- Stub for Phase 66/67
     -> provider-finder.ts           -- Stub for Phase 68/69
     -> memory-search.ts             -- Self-retrieval tool
```

### Pattern 1: Vercel AI SDK Tool Calling
**What:** Define tools with Zod schemas that the LLM can invoke during response generation
**When to use:** Content recommendation, provider finding, memory search
**Example:**
```typescript
// Source: Vercel AI SDK v6 docs
import { tool } from "ai";
import { z } from "zod";

const contentRecommenderTool = tool({
  description: "Recommend relevant content from the Sahara content library based on the founder's current situation",
  parameters: z.object({
    topic: z.string().describe("The topic to search for"),
    stage: z.string().optional().describe("Startup stage filter"),
    format: z.enum(["video", "article", "course"]).optional(),
  }),
  execute: async ({ topic, stage, format }) => {
    // Stub: returns placeholder until Phase 66 content tables exist
    return {
      available: false,
      message: "Content library coming soon. For now, I can guide you directly.",
    };
  },
});
```

### Pattern 2: Embedding-Based Memory Retrieval
**What:** Use the user's current message embedding to find semantically similar past conversations
**When to use:** Every chat message (for Pro+ tiers with persistent memory)
**Example:**
```typescript
// Generate embedding for current message
const { embedding } = await generateEmbedding(message);

// Search episodic memory by similarity
const relevantEpisodes = await searchEpisodesByEmbedding(userId, embedding, {
  limit: 5,
  similarityThreshold: 0.75,
});

// Search semantic facts by similarity
const relevantFacts = await searchFactsByEmbedding(userId, embedding, {
  limit: 5,
  similarityThreshold: 0.7,
});
```

### Pattern 3: Conversation Summarization for Long Threads
**What:** When conversation exceeds token budget, summarize older messages instead of dropping them
**When to use:** Conversations with 50+ messages
**Example:**
```typescript
// In context-manager.ts - new function
export async function summarizeOlderMessages(
  messages: Message[],
  keepRecent: number = 10
): Promise<Message[]> {
  const recent = messages.slice(-keepRecent);
  const older = messages.slice(0, -keepRecent);

  if (older.length === 0) return recent;

  const summary = await generate(
    `Summarize the key points, decisions, and context from this conversation:\n${older.map(m => `${m.role}: ${m.content}`).join('\n')}`,
    { system: "Create a concise summary preserving key facts, decisions, and context.", maxOutputTokens: 512 }
  );

  return [
    { role: "system", content: `Previous conversation summary:\n${summary.text}` },
    ...recent,
  ];
}
```

### Anti-Patterns to Avoid
- **Loading all episodes by timestamp only:** Currently loadMemoryActor fetches recent episodes by `created_at DESC` regardless of relevance. Always combine recency with semantic similarity.
- **Sending full conversation history to LLM:** The context-manager.ts exists but is not used in the chat route. Without trimming, 50+ message conversations will exceed context windows.
- **Regex-only mode detection:** The current `determineModeTransition` uses simple regex patterns. These cause false positives (e.g., "my position in the market" triggers positioning mode). Add confidence scoring and require multiple signals.
- **Storing episodes without embeddings:** Currently `storeEpisode` in the chat route does NOT generate embeddings. Without embeddings, vector search falls back to recent-only retrieval.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool calling for LLM | Custom function dispatch | Vercel AI SDK `tool()` from `ai` package | Handles schema validation, streaming tool calls, multi-step tool use |
| Token counting | Exact tokenizer | `estimateTokens()` in `lib/ai/context-manager.ts` | Already exists; character heuristic is sufficient for budget management |
| Embedding generation | Direct OpenAI API calls | `generateEmbedding()` in `lib/ai/fred-client.ts` | Already exists with provider abstraction |
| Vector similarity search | Custom cosine distance | Supabase RPC `search_episodic_memory` / `search_semantic_memory` | pgvector handles this in-database; RPCs are referenced but need to be created |
| Message trimming | Manual array slicing | `trimMessages()` in `lib/ai/context-manager.ts` | Already exists with system message preservation and min-recent guarantees |
| Conversation state persistence | Custom state store | `lib/db/conversation-state.ts` | Already has mode persistence, gate state, founder snapshot |

**Key insight:** Most infrastructure exists but is disconnected. The primary work is wiring existing components together, not building from scratch.

## Common Pitfalls

### Pitfall 1: Missing pgvector RPC Functions
**What goes wrong:** `searchEpisodesByEmbedding` and `searchFactsByEmbedding` in fred-memory.ts call Supabase RPCs (`search_episodic_memory`, `search_semantic_memory`) that may not exist in the database yet. The code has fallback logic that silently degrades to non-vector queries.
**Why it happens:** Migration 021 creates tables and IVFFlat indexes but does not create the RPC functions.
**How to avoid:** Create the RPC functions in a new migration before relying on embedding-based retrieval.
**Warning signs:** Console warnings: "Vector search RPC not available, using fallback"

### Pitfall 2: Episodes Stored Without Embeddings
**What goes wrong:** The chat route calls `storeEpisode()` without passing an embedding. This means all episodic memories have `embedding = NULL`, making vector search return zero results.
**Why it happens:** Generating embeddings adds latency and cost to every message. The original design deferred this.
**How to avoid:** Generate embeddings asynchronously (fire-and-forget) after storing the episode, or batch-generate embeddings periodically.
**Warning signs:** `fred_episodic_memory` rows where `embedding IS NULL` for all conversation entries.

### Pitfall 3: Mode Switching False Positives
**What goes wrong:** Simple keyword matching triggers mode transitions incorrectly. "My position in the market" triggers positioning mode. "How do I value my time?" triggers investor mode (mentions "valuation" pattern).
**Why it happens:** `detectPositioningSignals` and `detectInvestorSignals` use broad regex patterns without disambiguation.
**How to avoid:** Add a confidence scoring layer. Require 2+ signals within a sliding window. Add negative patterns (e.g., "position" in non-marketing context). Increase `MODE_EXIT_THRESHOLD` from 3 to 5.
**Warning signs:** Users reporting unexpected framework introductions mid-conversation.

### Pitfall 4: Context Window Overflow in Long Conversations
**What goes wrong:** With 50+ messages, the system prompt + founder context + conversation history exceeds GPT-4o's effective context budget. Responses degrade in quality or fail.
**Why it happens:** The chat route assembles `fullContext` (system prompt + all injected blocks) which can be 3000-5000 tokens, leaving limited room for conversation history. There is no conversation history management in the route.
**How to avoid:** Wire in `trimMessages()` from context-manager.ts. Implement conversation summarization for messages beyond a sliding window.
**Warning signs:** Token usage approaching 128K, responses ignoring earlier context.

### Pitfall 5: Tool Stubs Breaking Future Phases
**What goes wrong:** Tool stubs for content and provider recommendation return "not available" but Phases 66-69 need real implementations.
**Why it happens:** Stubs are designed without knowing the future schema.
**How to avoid:** Design tool interfaces (input/output schemas) to match the planned content_courses and marketplace_providers table schemas from the ROADMAP. Return structured "unavailable" responses that the chat UI can render gracefully.
**Warning signs:** Tool schemas that don't match Phase 66/68 data models.

## Code Examples

### Example 1: Creating Supabase RPC for Vector Search
```sql
-- Migration: Create episodic memory vector search RPC
CREATE OR REPLACE FUNCTION search_episodic_memory(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  session_id uuid,
  event_type text,
  content jsonb,
  importance_score float,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fem.id,
    fem.user_id,
    fem.session_id,
    fem.event_type,
    fem.content,
    fem.importance_score,
    fem.created_at,
    fem.metadata,
    1 - (fem.embedding <=> query_embedding) AS similarity
  FROM fred_episodic_memory fem
  WHERE fem.user_id = match_user_id
    AND fem.embedding IS NOT NULL
    AND 1 - (fem.embedding <=> query_embedding) > match_threshold
  ORDER BY fem.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Similar for semantic memory
CREATE OR REPLACE FUNCTION search_semantic_memory(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  match_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  category text,
  key text,
  value jsonb,
  confidence float,
  source text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fsm.id,
    fsm.user_id,
    fsm.category,
    fsm.key,
    fsm.value,
    fsm.confidence,
    fsm.source,
    fsm.created_at,
    fsm.updated_at,
    1 - (fsm.embedding <=> query_embedding) AS similarity
  FROM fred_semantic_memory fsm
  WHERE fsm.user_id = match_user_id
    AND fsm.embedding IS NOT NULL
    AND (match_category IS NULL OR fsm.category = match_category)
    AND 1 - (fsm.embedding <=> query_embedding) > match_threshold
  ORDER BY fsm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Example 2: Vercel AI SDK Tool Definition Pattern
```typescript
// lib/fred/tools/content-recommender.ts
import { tool } from "ai";
import { z } from "zod";

export const recommendContentTool = tool({
  description: "Search the Sahara content library for courses, articles, or videos relevant to the founder's question. Use when a founder needs learning resources.",
  parameters: z.object({
    query: z.string().describe("What the founder wants to learn about"),
    stage: z.enum(["idea", "pre-seed", "seed", "series-a", "growth"]).optional(),
    format: z.enum(["video", "article", "course", "any"]).default("any"),
  }),
  execute: async ({ query, stage, format }) => {
    // Phase 63 stub - returns structured "not yet available"
    // Phase 66/67 will implement real content search
    return {
      status: "coming_soon" as const,
      query,
      message: `Content library is being built. Based on your question about "${query}", I'll guide you directly.`,
      suggestedTopics: [],
    };
  },
});

export const findProviderTool = tool({
  description: "Search the Sahara service marketplace for providers who can help the founder. Use when a founder needs professional services (legal, accounting, design, development, marketing).",
  parameters: z.object({
    serviceType: z.string().describe("Type of service needed"),
    budget: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
    urgency: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  execute: async ({ serviceType, budget, urgency }) => {
    // Phase 63 stub - returns structured "not yet available"
    // Phase 68/69 will implement real provider search
    return {
      status: "coming_soon" as const,
      serviceType,
      message: `Service marketplace is being built. I can help you think through what to look for in a ${serviceType} provider.`,
      suggestedQuestions: [
        `What specific ${serviceType} tasks do you need help with?`,
        "What's your timeline for getting this done?",
      ],
    };
  },
});
```

### Example 3: Enhanced loadMemoryActor with Embedding Search
```typescript
// Enhanced load-memory.ts pattern
export async function loadMemoryActor(
  userId: string,
  sessionId: string,
  tier: string = "free",
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>,
  currentMessage?: string // NEW: for embedding-based retrieval
): Promise<MemoryContext> {
  const config = MEMORY_CONFIG[normalizedTier] || MEMORY_CONFIG.free;

  if (config.retentionDays === 0) {
    return { recentEpisodes: [], relevantFacts: preloadedFacts ?? [], recentDecisions: [] };
  }

  // Generate embedding for current message (for similarity search)
  let messageEmbedding: number[] | undefined;
  if (currentMessage && config.loadEpisodic) {
    try {
      const { embedding } = await generateEmbedding(currentMessage);
      messageEmbedding = embedding;
    } catch {
      // Fall back to recency-only retrieval
    }
  }

  const [recentEpisodes, relevantEpisodes, facts, decisions] = await Promise.all([
    // Always get recent episodes for continuity
    retrieveRecentEpisodes(userId, { limit: Math.min(config.maxEpisodicItems, 5) }),
    // Embedding search for relevant older episodes
    messageEmbedding
      ? searchEpisodesByEmbedding(userId, messageEmbedding, { limit: 5, similarityThreshold: 0.75 })
      : Promise.resolve([]),
    preloadedFacts ? Promise.resolve(preloadedFacts) : getAllUserFacts(userId).then(/*...*/),
    getRecentDecisions(userId, { limit: 10 }),
  ]);

  // Merge and deduplicate episodes (recent + relevant)
  const episodeIds = new Set(recentEpisodes.map(e => e.id));
  const mergedEpisodes = [
    ...recentEpisodes,
    ...relevantEpisodes.filter(e => !episodeIds.has(e.id)),
  ].slice(0, config.maxEpisodicItems);

  return { recentEpisodes: mergedEpisodes, relevantFacts: facts, recentDecisions: decisions };
}
```

### Example 4: Wiring Context Manager into Chat Route
```typescript
// In app/api/fred/chat/route.ts - after assembling fullContext
import { trimMessages, estimateTokens } from "@/lib/ai/context-manager";

// Estimate current context size
const systemTokens = estimateTokens(fullContext);
const maxConversationTokens = 128_000 - systemTokens - 4096; // Reserve for response

// If conversation would be too long, summarize older messages
// (conversation history would need to be loaded from episodic memory)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recent-N episodes only | Embedding similarity + recency | This phase | Retrieves actually relevant context, not just recent |
| No context trimming | Token-aware trimming + summarization | This phase | 50+ message conversations work correctly |
| Regex-only mode detection | Confidence-scored signal accumulation | This phase | Fewer false positive mode switches |
| No AI tools | Vercel AI SDK tool() definitions | This phase | Foundation for content/marketplace FRED integration |
| Embedding column unused | Async embedding generation on store | This phase | Enables vector search that was always planned |

**Deprecated/outdated:**
- None. All current components are still valid. This phase enhances, not replaces.

## Open Questions

Things that could not be fully resolved:

1. **Are the pgvector RPC functions deployed?**
   - What we know: Migration 021 creates tables and indexes. fred-memory.ts calls RPCs with fallback.
   - What's unclear: Whether `search_episodic_memory` and `search_semantic_memory` RPCs exist in production Supabase.
   - Recommendation: Create a migration that defines both RPCs. Safe to run even if they exist (CREATE OR REPLACE).

2. **What percentage of episodic memories have embeddings?**
   - What we know: `storeEpisode()` is called without embeddings in the chat route. The memory API allows `generateEmbedding: true` but the chat route doesn't use it.
   - What's unclear: Whether any episodes have embeddings from other code paths.
   - Recommendation: Add a backfill migration/script and start generating embeddings on new episodes.

3. **How many messages does a typical long conversation have?**
   - What we know: Success criteria says "50+ messages". Studio tier allows 50 maxMessages.
   - What's unclear: Actual distribution of conversation lengths in production.
   - Recommendation: Design for 100 messages as upper bound. Summarize at 20-message threshold.

4. **Should tools be available on all tiers?**
   - What we know: Content library and marketplace are paid features.
   - What's unclear: Whether tool availability should be tier-gated.
   - Recommendation: Make tools available on all tiers but return tier-appropriate responses (Free: "upgrade to access", Pro+: full results).

5. **Conversation history storage location**
   - What we know: Episodes are stored in fred_episodic_memory per message. But the chat route doesn't load conversation history as an ordered thread for the LLM.
   - What's unclear: Whether conversation history should be reconstructed from episodes or stored separately.
   - Recommendation: Load recent episodes for the current session as conversation history. The channel conversation context layer (lib/channels/conversation-context.ts) already does this pattern.

## Key Codebase Files

| File | Role | Changes Needed |
|------|------|---------------|
| `app/api/fred/chat/route.ts` | Chat entry point | Wire in context trimming, pass message to loadMemory for embeddings |
| `lib/fred/actors/load-memory.ts` | Memory loading | Add embedding-based retrieval, accept currentMessage param |
| `lib/fred/actors/decide.ts` | LLM response generation | Add tool definitions to `generate()` call |
| `lib/ai/diagnostic-engine.ts` | Mode switching | Add confidence scoring, increase exit threshold, add negative patterns |
| `lib/ai/context-manager.ts` | Token management | Add `summarizeOlderMessages()`, wire into chat route |
| `lib/db/fred-memory.ts` | Memory CRUD | Add async embedding generation on store |
| `lib/fred/context-builder.ts` | Founder snapshot | Add embedding-based fact retrieval |
| `lib/fred/tools/` (NEW) | Tool definitions | Create content-recommender.ts, provider-finder.ts |

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All files listed in Key Codebase Files section
- `lib/db/migrations/021_fred_memory_schema.sql` - Memory schema with pgvector
- `lib/ai/fred-client.ts` - Embedding generation already available
- `lib/ai/context-manager.ts` - Token management already built

### Secondary (MEDIUM confidence)
- Vercel AI SDK v6 tool() API - based on installed version ^6.0.72 and package structure

### Tertiary (LOW confidence)
- None. All findings are directly from codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns derived from existing codebase
- Memory retrieval gaps: HIGH - Verified by reading load-memory.ts and chat route
- Mode switching issues: HIGH - Verified regex patterns in diagnostic-engine.ts
- Tool calling approach: MEDIUM - Vercel AI SDK tool() API pattern based on installed version
- Pitfalls: HIGH - Derived from code reading, not speculation

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable codebase, no fast-moving external dependencies)
