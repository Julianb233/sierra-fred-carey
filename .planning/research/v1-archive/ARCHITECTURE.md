# Architecture Patterns

**Domain:** AI-powered founder operating system with cognitive engine
**Researched:** 2026-01-28
**Confidence:** HIGH (based on industry patterns, official documentation, and existing codebase analysis)

## Executive Summary

Building the FRED Cognitive Engine and Sahara platform requires a layered architecture combining:
1. **Cognitive Engine Core** - State machine-driven decision framework with memory persistence
2. **Multi-Agent Orchestration** - Specialized agents coordinated by a central router
3. **API-First Backend** - Clean separation enabling future React Native support
4. **Document Processing Pipeline** - PDF extraction with embedding storage for RAG

The existing codebase already implements multi-provider AI fallback and request/response logging. Architecture should extend these patterns rather than replace them.

---

## Recommended Architecture

### High-Level System Architecture

```
                                    +------------------+
                                    |   React Native   |
                                    |   (Future)       |
                                    +--------+---------+
                                             |
+------------------+                         v
|   Next.js Web    |              +------------------+
|   (Dashboard)    +------------->|   API Layer      |
+------------------+              |   (REST/tRPC)    |
                                  +--------+---------+
                                           |
         +-------------------+-------------+-------------+-------------------+
         |                   |             |             |                   |
         v                   v             v             v                   v
+--------+--------+ +--------+--------+ +--+----------+ +--------+--------+ +--+------------+
| FRED Cognitive  | | Virtual Team    | | Document   | | SMS/Check-in   | | Analytics     |
| Engine          | | Agents          | | Pipeline   | | Service        | | & Audit       |
+-----------------+ +-----------------+ +-------------+ +----------------+ +---------------+
         |                   |             |             |                   |
         +-------------------+-------------+-------------+-------------------+
                                           |
                                  +--------v---------+
                                  |   Data Layer     |
                                  |   (Supabase)     |
                                  +------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                       |                       |
           +-------v-------+       +-------v-------+       +-------v-------+
           | PostgreSQL    |       | Vector Store  |       | Realtime      |
           | (Core Data)   |       | (pgvector)    |       | (Subscriptions)|
           +---------------+       +---------------+       +---------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Build Priority |
|-----------|---------------|-------------------|----------------|
| API Layer | Request routing, auth, rate limiting | All services | Phase 1 |
| FRED Cognitive Engine | Decision scoring, analysis framework, state machine | API Layer, Data Layer, AI Providers | Phase 1 |
| Memory Persistence | User preferences, past decisions, outcomes | FRED Engine, Data Layer | Phase 1 |
| Virtual Team Agents | Specialized AI assistants (ops, fundraising, growth) | API Layer, FRED Engine, Data Layer | Phase 3 |
| Document Pipeline | PDF extraction, chunking, embedding | API Layer, Vector Store, AI Providers | Phase 2 |
| SMS/Check-in Service | Twilio integration, scheduling, accountability | API Layer, Data Layer | Phase 3 |
| Analytics & Audit | Decision logging, compliance, safety monitoring | All services, Data Layer | Phase 1-3 |

---

## FRED Cognitive Engine Architecture

### State Machine Design

Based on [StateFlow research](https://arxiv.org/html/2403.11322v1), the cognitive engine should use a state machine architecture for deterministic, auditable decision flow.

```
                        +----------------+
                        |   INTAKE       |
                        | Parse request, |
                        | extract intent |
                        +-------+--------+
                                |
                        +-------v--------+
                        |  VALIDATION    |
                        | Check context, |
                        | verify data    |
                        +-------+--------+
                                |
                        +-------v--------+
                        | MENTAL MODELS  |
                        | Apply 7-factor |
                        | scoring        |
                        +-------+--------+
                                |
                        +-------v--------+
                        |  SYNTHESIS     |
                        | Generate       |
                        | recommendation |
                        +-------+--------+
                                |
              +-----------------+-----------------+
              |                                   |
      +-------v--------+                 +--------v-------+
      |  AUTO-DECIDE   |                 |   ESCALATE     |
      | Score >= 0.8   |                 | Score < 0.8    |
      | Low risk       |                 | High stakes    |
      +-------+--------+                 +--------+-------+
              |                                   |
      +-------v--------+                 +--------v-------+
      |   EXECUTE      |                 | HUMAN-IN-LOOP  |
      | Take action,   |                 | Request user   |
      | log outcome    |                 | confirmation   |
      +----------------+                 +----------------+
```

### 7-Factor Scoring Engine

```typescript
interface DecisionScore {
  strategicAlignment: number;  // 0-10: Does this align with stated goals?
  leverage: number;            // 0-10: Multiplier effect on outcomes
  speed: number;               // 0-10: How fast to results?
  revenue: number;             // 0-10: Direct revenue impact
  time: number;                // 0-10: Time investment required
  risk: number;                // 0-10: Downside exposure (inverted)
  relationships: number;       // 0-10: Network/relationship building

  weights: {
    strategicAlignment: 0.20;
    leverage: 0.15;
    speed: 0.10;
    revenue: 0.20;
    time: 0.10;
    risk: 0.15;
    relationships: 0.10;
  };

  composite: number;           // Weighted average
  confidence: number;          // How certain FRED is about the score
}
```

**Pattern:** Based on [weighted scoring model research](https://userpilot.com/blog/weighted-scoring-model/), implement as a pure function that takes inputs and returns a score object. Log all inputs and outputs for audit trail.

### Auto-Decide vs Escalate Logic

Based on [AI agent routing patterns](https://www.patronus.ai/ai-agent-development/ai-agent-routing):

```typescript
interface EscalationPolicy {
  // Confidence thresholds
  autoDecideThreshold: 0.8;      // Composite score >= 0.8 = auto-decide
  escalateThreshold: 0.5;        // Score < 0.5 = always escalate

  // Risk categories that always escalate
  alwaysEscalate: [
    'financial_commitment_over_1000',
    'legal_binding',
    'public_statement',
    'hiring_firing',
    'investor_communication'
  ];

  // Step budgets
  maxRetries: 3;                 // Max clarifying questions before escalate
  maxChainLength: 5;             // Max state transitions per decision
}
```

### Memory Persistence Architecture

Based on [COLMA architecture](https://arxiv.org/html/2509.13235) and [memory research](https://genesishumanexperience.com/2025/11/03/memory-in-agentic-ai-systems-the-cognitive-architecture-behind-intelligent-collaboration/):

```
+------------------+     +------------------+     +------------------+
| Episodic Memory  |     | Semantic Memory  |     | Procedural Memory|
| Recent decisions |     | User preferences |     | Learned patterns |
| Conversation ctx |     | Company context  |     | Successful flows |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                          +-------v-------+
                          | Memory Router |
                          | (Context-aware|
                          |  retrieval)   |
                          +-------+-------+
                                  |
                          +-------v-------+
                          | Vector Store  |
                          | (pgvector)    |
                          +---------------+
```

**Storage Strategy:**
- **Episodic Memory:** Recent conversations, decisions (7-30 day retention)
- **Semantic Memory:** User preferences, company info, outcomes (permanent)
- **Procedural Memory:** What worked, what didn't (consolidated weekly)

**Implementation with Supabase:**
```sql
-- Core memory tables
CREATE TABLE fred_memory_episodic (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id UUID,
  content TEXT,
  embedding vector(1536),
  memory_type TEXT, -- 'conversation', 'decision', 'observation'
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE fred_memory_semantic (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category TEXT, -- 'preference', 'context', 'outcome'
  key TEXT,
  value JSONB,
  embedding vector(1536),
  confidence FLOAT,
  updated_at TIMESTAMPTZ
);

CREATE INDEX ON fred_memory_episodic USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON fred_memory_semantic USING hnsw (embedding vector_cosine_ops);
```

---

## Multi-Agent Architecture (Virtual Team)

### Orchestration Pattern

Based on [Google's multi-agent patterns](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) and [LangGraph research](https://www.langchain.com/langgraph), use an **Orchestrator-Worker** pattern:

```
                        +------------------+
                        | User Request     |
                        +--------+---------+
                                 |
                        +--------v---------+
                        | Router Agent     |
                        | (Intent + Context)|
                        +--------+---------+
                                 |
         +-----------------------+------------------------+
         |                       |                        |
+--------v--------+    +--------v--------+    +----------v--------+
| Founder Ops     |    | Fundraising     |    | Growth Agent      |
| Agent           |    | Agent           |    |                   |
| - Priorities    |    | - Pitch prep    |    | - Market analysis |
| - Calendar      |    | - Investor match|    | - GTM strategy    |
| - Task mgmt     |    | - Due diligence |    | - Channel tactics |
+-----------------+    +-----------------+    +-------------------+
         |                       |                        |
         +-----------------------+------------------------+
                                 |
                        +--------v---------+
                        | FRED Core Engine |
                        | (Synthesis +     |
                        |  Decision)       |
                        +------------------+
```

**Key Design Decisions:**

1. **Specialized Prompts Per Agent:** Each agent has domain-specific system prompts and tools
2. **Shared Memory Access:** All agents read from user's semantic memory
3. **FRED as Final Synthesizer:** All agent outputs route through FRED for consistency
4. **Independent Scaling:** Agents can be added/modified without core changes

### Agent Communication Protocol

```typescript
interface AgentMessage {
  agentId: string;
  threadId: string;
  type: 'query' | 'response' | 'handoff' | 'escalate';
  content: string;
  metadata: {
    confidence: number;
    suggestedActions?: string[];
    requiredContext?: string[];
  };
}

interface AgentState {
  currentAgent: string;
  conversationHistory: AgentMessage[];
  sharedContext: Record<string, any>;
  stepCount: number;
  maxSteps: number;
}
```

---

## Multi-Provider AI Architecture

The existing codebase (`lib/ai/client.ts`) already implements provider fallback. Extend with:

### LLM Gateway Pattern

Based on [multi-provider research](https://www.requesty.ai/blog/implementing-zero-downtime-llm-architecture-beyond-basic-fallbacks):

```
+------------------+
| Application      |
+--------+---------+
         |
+--------v---------+
| LLM Gateway      |
| - Health checks  |
| - Circuit breaker|
| - Rate limiting  |
| - Caching        |
+--------+---------+
         |
+--------+----------+----------+---------+
|                   |          |         |
v                   v          v         v
+--------+  +-------+--+  +----+----+  +-+-------+
| OpenAI |  | Anthropic|  | Google  |  | Local   |
| Primary|  | Fallback1|  | Fallback2| | (future)|
+--------+  +----------+  +---------+  +---------+
```

**Circuit Breaker Configuration:**
```typescript
interface CircuitBreakerConfig {
  openai: {
    failureThreshold: 0.4;        // 40% failure rate triggers circuit
    windowMs: 60000;              // 60-second window
    cooldownMs: 1200000;          // 20-minute cooldown
  };
  anthropic: { /* similar */ };
  google: { /* similar */ };
}
```

### Prompt Compatibility Layer

Based on [Anthropic's OpenAI-compatible API](https://www.anthropic.com), normalize message formats:

```typescript
interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

function toProviderFormat(
  messages: NormalizedMessage[],
  provider: 'openai' | 'anthropic' | 'google'
): ProviderSpecificFormat;
```

---

## Document Processing Pipeline

### PDF Pitch Deck Architecture

Based on [NVIDIA multimodal pipeline](https://developer.nvidia.com/blog/build-an-enterprise-scale-multimodal-document-retrieval-pipeline-with-nvidia-nim-agent-blueprint/) and [RAG best practices](https://mallahyari.github.io/rag-ebook/03_prepare_data.html):

```
+------------------+
| PDF Upload       |
+--------+---------+
         |
+--------v---------+
| Document Ingestion|
| - File validation |
| - Size limits     |
| - Type detection  |
+--------+---------+
         |
+--------v---------+
| Text Extraction   |
| - OCR (if needed) |
| - Layout detection|
| - Table parsing   |
+--------+---------+
         |
+--------v---------+
| Chunking Strategy |
| - Semantic chunks |
| - Slide-aware     |
| - Overlap handling|
+--------+---------+
         |
+--------v---------+
| Embedding Gen     |
| - OpenAI ada-002  |
| - Batch processing|
+--------+---------+
         |
+--------v---------+
| Vector Storage    |
| - pgvector        |
| - HNSW indexing   |
+--------+---------+
         |
+--------v---------+
| RAG Retrieval     |
| - Semantic search |
| - Reranking       |
| - Context assembly|
+------------------+
```

### Chunking Strategy

Based on [2025 document processing research](https://unstract.com/blog/ai-document-processing-with-unstract/):

```typescript
interface ChunkConfig {
  // Pitch deck specific
  chunkSize: 800;           // tokens per chunk
  overlap: 100;             // token overlap
  preserveSlides: true;     // Keep slide boundaries
  extractTables: true;      // Separate table extraction

  // Metadata enrichment
  addSlideNumber: true;
  addSectionHeader: true;
  addDocumentTitle: true;
}
```

### Supabase Vector Storage

Based on [Supabase AI documentation](https://supabase.com/docs/guides/ai):

```sql
-- Pitch deck document chunks
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  chunk_index INT,
  content TEXT,
  embedding vector(1536),
  metadata JSONB, -- slide_number, section, tables, etc.
  created_at TIMESTAMPTZ
);

-- HNSW index for fast similarity search
CREATE INDEX ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Hybrid search function
CREATE FUNCTION search_pitch_deck(
  query_embedding vector(1536),
  user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
  SELECT
    id, content,
    1 - (embedding <=> query_embedding) AS similarity,
    metadata
  FROM document_chunks
  WHERE
    document_chunks.user_id = search_pitch_deck.user_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$ LANGUAGE sql;
```

---

## API-First Design

### REST API Structure

Following [API-first architecture principles](https://makitsol.com/api-first-architecture/):

```
/api/v1/
  /fred/
    POST /chat              # Main FRED interaction
    POST /decide            # Decision with scoring
    GET  /memory            # Retrieve user context

  /agents/
    GET  /                  # List available agents
    POST /:agentId/chat     # Chat with specific agent

  /documents/
    POST /upload            # Upload pitch deck
    GET  /:id/analysis      # Get analysis results
    POST /:id/query         # RAG query against document

  /decisions/
    GET  /                  # Decision history
    GET  /:id               # Specific decision detail
    POST /:id/feedback      # User feedback on decision

  /check-ins/
    GET  /schedule          # View check-in schedule
    POST /respond           # Respond to check-in
```

### Authentication & Authorization

Leverage existing Supabase auth with tier-based access:

```typescript
interface TierAccess {
  free: ['fred.chat', 'documents.view', 'decisions.history'];
  pro: ['fred.*', 'documents.*', 'decisions.*'];
  studio: ['fred.*', 'documents.*', 'decisions.*', 'agents.*', 'check-ins.*'];
}
```

---

## Safety, Audit, and Control Layer

Based on [AI agent security research](https://aws.amazon.com/blogs/security/the-agentic-ai-security-scoping-matrix-a-framework-for-securing-autonomous-ai-systems/) and [three-layer security architecture](https://www.teksystems.com/en/insights/article/safe-ai-implementation-three-layer-architecture):

### Three-Layer Safety Architecture

```
+--------------------+
| Layer 3: Governance|
| - Policy config    |
| - Compliance rules |
| - Audit reporting  |
+----------+---------+
           |
+----------v---------+
| Layer 2: Runtime   |
| - Input validation |
| - Output filtering |
| - Anomaly detection|
+----------+---------+
           |
+----------v---------+
| Layer 1: Infra     |
| - Rate limiting    |
| - Kill switches    |
| - Encryption       |
+--------------------+
```

### Audit Logging Schema

```sql
CREATE TABLE fred_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  action_type TEXT, -- 'decision', 'escalation', 'override', 'error'
  decision_id UUID,
  input_summary TEXT,
  output_summary TEXT,
  score_breakdown JSONB,
  confidence FLOAT,
  was_auto_decided BOOLEAN,
  human_override BOOLEAN,
  provider_used TEXT,
  latency_ms INT,
  tokens_used INT,
  created_at TIMESTAMPTZ,

  -- Compliance fields
  pii_detected BOOLEAN,
  risk_flags TEXT[],
  review_required BOOLEAN
);

CREATE INDEX ON fred_audit_log(user_id, created_at DESC);
CREATE INDEX ON fred_audit_log(review_required) WHERE review_required = true;
```

### Kill Switch Implementation

```typescript
interface KillSwitchConfig {
  global: {
    enabled: boolean;         // Master kill switch
    reason?: string;
  };
  perUser: {
    blockedUsers: string[];   // Specific user blocks
    rateLimitOverrides: Record<string, number>;
  };
  perFeature: {
    autoDecide: boolean;      // Disable auto-decide globally
    agentHandoff: boolean;    // Disable agent system
    documentProcessing: boolean;
  };
  thresholds: {
    errorRateLimit: 0.1;      // 10% error rate triggers alert
    latencyThreshold: 10000;  // 10s latency triggers alert
    anomalyDetection: boolean;
  };
}
```

---

## Patterns to Follow

### Pattern 1: State Machine for Decision Flow

**What:** Use finite state machine to model decision progression
**When:** Any multi-step decision or analysis flow
**Why:** Deterministic, auditable, debuggable

```typescript
import { createMachine, assign } from 'xstate';

const fredDecisionMachine = createMachine({
  id: 'fredDecision',
  initial: 'intake',
  context: {
    input: null,
    validationResult: null,
    scores: null,
    decision: null,
    escalationReason: null,
  },
  states: {
    intake: {
      on: { VALIDATE: 'validation' }
    },
    validation: {
      on: {
        VALID: 'scoring',
        INVALID: 'error'
      }
    },
    scoring: {
      on: {
        HIGH_CONFIDENCE: 'autoDecide',
        LOW_CONFIDENCE: 'escalate',
        ALWAYS_ESCALATE: 'escalate'
      }
    },
    autoDecide: {
      on: { COMPLETE: 'done' }
    },
    escalate: {
      on: {
        USER_APPROVED: 'autoDecide',
        USER_REJECTED: 'cancelled'
      }
    },
    done: { type: 'final' },
    cancelled: { type: 'final' },
    error: { type: 'final' }
  }
});
```

### Pattern 2: Repository Pattern for Memory

**What:** Abstract memory operations behind a clean interface
**When:** Any memory read/write
**Why:** Swappable storage, testable, consistent access patterns

```typescript
interface MemoryRepository {
  // Episodic
  recordConversation(userId: string, content: string): Promise<void>;
  getRecentConversations(userId: string, limit: number): Promise<Memory[]>;

  // Semantic
  setPreference(userId: string, key: string, value: any): Promise<void>;
  getPreference(userId: string, key: string): Promise<any>;

  // Search
  semanticSearch(userId: string, query: string, limit: number): Promise<Memory[]>;
}
```

### Pattern 3: Circuit Breaker for AI Providers

**What:** Fail fast and recover gracefully from provider outages
**When:** Any AI provider call
**Why:** Prevent cascading failures, improve UX during outages

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldReset()) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Prompt

**What:** Putting all FRED logic in a single giant system prompt
**Why bad:**
- Hard to test individual components
- Can't A/B test sections
- Exceeds context limits
- No visibility into which part failed

**Instead:** Decompose into modular prompt components assembled at runtime:
```typescript
const systemPrompt = [
  loadPrompt('fred.core'),
  loadPrompt('fred.scoring'),
  loadPrompt('fred.communication'),
  loadUserContext(userId),
].join('\n\n');
```

### Anti-Pattern 2: Synchronous Everything

**What:** Processing documents and generating embeddings in the request/response cycle
**Why bad:**
- Timeouts on large documents
- Poor UX (long waits)
- Wasted resources on retries

**Instead:** Use job queues for long operations:
```typescript
// Immediate response
POST /documents/upload -> { jobId, status: 'processing' }

// Background worker
processDocument(jobId) -> updates status, emits events

// Client polls or uses realtime
GET /documents/:jobId/status -> { status: 'complete', results: {...} }
```

### Anti-Pattern 3: Raw AI Outputs to Users

**What:** Passing LLM response directly to frontend without validation
**Why bad:**
- Inconsistent formats
- Potential safety issues
- No error handling

**Instead:** Structured output with validation:
```typescript
interface FredResponse {
  type: 'decision' | 'question' | 'information';
  content: string;
  scores?: DecisionScore;
  suggestedActions?: Action[];
  requiresConfirmation: boolean;
}

function validateAndStructure(rawOutput: string): FredResponse;
```

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| Memory Storage | Single Postgres | Postgres + pgvector HNSW | Distributed vector DB |
| AI Requests | Direct calls | Request queue + caching | Multi-region, edge caching |
| Document Processing | Synchronous | Background jobs | Distributed workers |
| Real-time | Supabase Realtime | Supabase Realtime | Dedicated pub/sub |
| Audit Logs | Same DB | Separate DB | Time-series DB (e.g., TimescaleDB) |

---

## Build Order Implications

Based on component dependencies:

```
Phase 1: Core Engine
  FRED Cognitive Engine (state machine, scoring)
    └── Memory Persistence (required for context)
        └── Audit Logging (required for compliance)
            └── API-first endpoints (required for access)

Phase 2: Document Processing
  PDF Pipeline (can run parallel to Virtual Team)
    └── Vector Storage (depends on Supabase setup from Phase 1)
        └── RAG Integration (depends on vector storage)

Phase 3: Virtual Team & Check-ins
  Multi-Agent Router (depends on FRED core)
    └── Specialized Agents (depends on router)
        └── SMS Check-ins (depends on agents for context)
```

**Critical Path:** FRED Core Engine -> Memory -> Scoring -> API endpoints

**Parallel Work:**
- Document Pipeline can start once vector storage schema exists
- Agent prompts can be developed while core engine is built
- SMS integration is independent after API layer exists

---

## Sources

### Memory & Cognitive Architecture
- [AI-Native Memory and Persistent Agents](https://ajithp.com/2025/06/30/ai-native-memory-persistent-agents-second-me/)
- [COLMA: Cognitive Layered Memory Architecture](https://arxiv.org/html/2509.13235)
- [Memory in Agentic AI Systems](https://genesishumanexperience.com/2025/11/03/memory-in-agentic-ai-systems-the-cognitive-architecture-behind-intelligent-collaboration/)

### Multi-Agent Systems
- [Google Multi-Agent Design Patterns](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
- [LangGraph Framework](https://www.langchain.com/langgraph)
- [AI Agent Orchestration Patterns (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

### State Machine & Decision Systems
- [StateFlow: State-Driven LLM Workflows](https://arxiv.org/html/2403.11322v1)
- [Stately Agent (XState)](https://github.com/statelyai/agent)
- [Weighted Scoring Model Guide](https://userpilot.com/blog/weighted-scoring-model/)

### Multi-Provider AI
- [Zero-Downtime LLM Architecture](https://www.requesty.ai/blog/implementing-zero-downtime-llm-architecture-beyond-basic-fallbacks)
- [Multi-Provider LLM Orchestration Guide](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10)

### Document Processing
- [NVIDIA Multimodal PDF Pipeline](https://developer.nvidia.com/blog/build-an-enterprise-scale-multimodal-document-retrieval-pipeline-with-nvidia-nim-agent-blueprint/)
- [RAG Pipeline Implementation](https://mallahyari.github.io/rag-ebook/03_prepare_data.html)
- [Supabase Vector Storage 2025](https://sparkco.ai/blog/mastering-supabase-vector-storage-a-2025-deep-dive)

### Safety & Compliance
- [AWS Agentic AI Security Framework](https://aws.amazon.com/blogs/security/the-agentic-ai-security-scoping-matrix-a-framework-for-securing-autonomous-ai-systems/)
- [Three-Layer AI Security Architecture](https://www.teksystems.com/en/insights/article/safe-ai-implementation-three-layer-architecture)
- [AI Agent Routing Patterns](https://www.patronus.ai/ai-agent-development/ai-agent-routing)
