# Founder Data Lake -- Schema Design

**Author:** Schema Architect
**Date:** 2026-02-11
**Status:** DESIGN (not yet implemented)
**Target Migration:** 052_founder_data_lake.sql (after 051_founder_communities.sql)

---

## 1. Executive Summary

The Founder Data Lake centralizes every meaningful business fact shared by a founder -- through chat, voice calls, intake forms, or document uploads -- into a structured, versioned, queryable data store. This enables:

- **Living documents** that regenerate automatically when underlying data changes
- **Historical tracking** of how founder data evolves over time
- **Chat and voice agents** that both READ and WRITE to the same structured data
- **Change detection** for staleness scoring on generated documents
- **Complete founder profiles** assembled from multiple data sources

---

## 2. Gap Analysis: What Exists vs. What's Missing

### 2.1 Current Data Sources (What Exists)

| Table | What it stores | Structured? | Versioned? | Queryable fields? |
|---|---|---|---|---|
| `profiles` | name, stage, industry, revenue_range, team_size, funding_history, product_status, traction, runway, primary_constraint, ninety_day_goal | Partially | No (overwritten) | Yes |
| `fred_semantic_memory` | Learned facts (key/value pairs by category) | Yes (category+key+value JSONB) | No (UPSERT overwrites) | By category+key |
| `fred_conversation_state` | Current step, step_statuses, diagnostic_tags, founder_snapshot JSONB | Partially | No (overwritten) | Step + JSONB |
| `fred_step_evidence` | Evidence per step (required_output, supporting_fact, kill_signal) | Yes | No (append-only, soft-delete) | By step+type |
| `fred_episodic_memory` | Conversation events + embeddings | Raw JSONB | No | By user+session |
| `chat_messages` | Raw chat messages | No (plain text) | No | None |
| `voice_calls` | Call metadata + transcript | Minimal (transcript TEXT) | No | topics_detected TEXT[] |
| `startup_processes` | 9-step progress with per-step text fields | Yes | No (overwritten) | By step columns |
| `enrichment/extractor.ts` | Heuristic extraction (industry, revenue, team, funding, challenges, competitors, metrics) | In-memory only | No | N/A (not persisted structured) |
| `strategy_documents` | Generated strategy docs (markdown) | No (TEXT blob) | version INTEGER | By type |
| `investor_readiness_scores` | IRS assessment results | JSONB category_scores | No (append-only) | overall_score |
| `reality_lens_analyses` | Reality Lens results | Denormalized columns | No (append-only) | Score columns |
| `positioning_assessments` | Positioning results | Denormalized columns | No (append-only) | Grade/score columns |
| `investor_lens_evaluations` | Investor Lens results | Denormalized columns + JSONB | No (append-only) | Score columns |

### 2.2 Critical Gaps

1. **No versioning on structured founder data.** When a founder says "our revenue is now $50k/mo" (up from $10k), `fred_semantic_memory` UPSERTS and loses the old value. `profiles` columns are overwritten. There is zero historical tracking.

2. **Chat extraction is heuristic-only and partial.** The `enrichment/extractor.ts` uses regex patterns and only extracts 7 field types. It writes to `profiles.enrichment_data` (JSONB blob) and scattered profile columns. No structured field_key taxonomy.

3. **Voice agent captures NOTHING back to the DB.** The voice agent (`workers/voice-agent/agent.ts`) has no data persistence at all -- no transcript saving, no fact extraction, no memory writes. It builds a prompt from `fred-brain` constants and logs to console only.

4. **Documents regenerate from scratch every time.** Strategy documents, Reality Lens, IRS, etc. all re-prompt the AI with raw user input. They don't read from a structured data store. There is no way to know "what changed since the last generation."

5. **No document-data dependency tracking.** When `monthly_revenue` changes, there is no way to know which documents (strategy, IRS, etc.) are now stale and need regeneration.

6. **`fred_semantic_memory` is close but insufficient.** It has category/key/value/confidence/source -- but no versioning, no history, no `is_current` flag, no `source_reference_id` linking to the conversation that produced it.

---

## 3. New Tables

### 3.1 `founder_data_points` -- The Core Living Data Store

Every structured business fact extracted from any source. Versioned with `is_current` for point-in-time queries.

```sql
CREATE TABLE IF NOT EXISTS founder_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What this data point is
  -- NOTE: CHECK constraint chosen over a reference table for simplicity at beta.
  -- If category additions become frequent, migrate to a founder_data_categories
  -- reference table (INSERT to add categories vs ALTER TABLE). For now, adding
  -- a category requires a migration, which is acceptable given the taxonomy is
  -- stable and curated.
  category TEXT NOT NULL CHECK (category IN (
    'business_model', 'market', 'financials', 'team', 'product',
    'customers', 'competition', 'fundraising', 'gtm',
    'legal_regulatory', 'milestones', 'challenges', 'metrics'
  )),
  field_key TEXT NOT NULL,
  -- e.g., "target_market", "monthly_revenue", "team_size", "runway_months"

  -- Flexible value storage
  field_value JSONB NOT NULL,
  -- { "value": "B2B SaaS founders", "raw": "we target B2B SaaS founders" }
  -- OR { "value": 50000, "unit": "USD", "period": "monthly" }

  -- Extraction metadata
  confidence FLOAT NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL CHECK (source IN (
    'chat', 'voice', 'intake', 'manual', 'document', 'system', 'onboarding'
  )),
  source_reference_id UUID,
  -- Links to: chat_messages.session_id, voice_calls.id, or uploaded_documents.id

  -- Versioning (auto-incrementing per user_id + category + field_key)
  version INTEGER NOT NULL DEFAULT 1
    CHECK (version >= 1),
  is_current BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ,
  -- Set when a newer version replaces this one

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: only one current value per user+category+field_key
CREATE UNIQUE INDEX idx_fdp_current_unique
  ON founder_data_points(user_id, category, field_key)
  WHERE is_current = true;

-- Fast lookup for current data points
CREATE INDEX idx_fdp_user_current
  ON founder_data_points(user_id, is_current)
  WHERE is_current = true;

-- History queries: all versions for a field
CREATE INDEX idx_fdp_user_field_history
  ON founder_data_points(user_id, category, field_key, version DESC);

-- Source-based queries (e.g., "what did we extract from this conversation?")
CREATE INDEX idx_fdp_source_ref
  ON founder_data_points(source_reference_id)
  WHERE source_reference_id IS NOT NULL;

-- Category browsing
CREATE INDEX idx_fdp_user_category
  ON founder_data_points(user_id, category);
```

**Versioning logic (implemented as a database function with serialized writes):**

Per reviewer audit (B1): The check-then-act versioning has a race condition when heuristic + AI extractors write concurrently for the same field. Two threads could both read `version=1` as current and both try to insert `version=2`. The fix is a database function that uses `SELECT ... FOR UPDATE` to serialize writes per field.

```sql
CREATE OR REPLACE FUNCTION upsert_data_point(
  p_user_id UUID,
  p_category TEXT,
  p_field_key TEXT,
  p_field_value JSONB,
  p_confidence FLOAT,
  p_source TEXT,
  p_source_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  existing RECORD;
  new_id UUID;
BEGIN
  -- Lock the current row for this user+category+field_key to serialize concurrent writes
  SELECT id, field_value, confidence, version
  INTO existing
  FROM founder_data_points
  WHERE user_id = p_user_id
    AND category = p_category
    AND field_key = p_field_key
    AND is_current = true
  FOR UPDATE;

  IF FOUND THEN
    -- Same value: skip insertion, optionally update confidence
    IF existing.field_value = p_field_value THEN
      IF p_confidence > existing.confidence THEN
        UPDATE founder_data_points
        SET confidence = p_confidence, extracted_at = now()
        WHERE id = existing.id;
      END IF;
      RETURN existing.id;
    END IF;

    -- Different value: supersede the old row
    UPDATE founder_data_points
    SET is_current = false, superseded_at = now()
    WHERE id = existing.id;

    -- Insert new version
    INSERT INTO founder_data_points (
      user_id, category, field_key, field_value, confidence,
      source, source_reference_id, version, is_current
    ) VALUES (
      p_user_id, p_category, p_field_key, p_field_value, p_confidence,
      p_source, p_source_reference_id, existing.version + 1, true
    )
    RETURNING id INTO new_id;

    -- Log the change
    INSERT INTO founder_data_history (
      user_id, category, field_key, old_value, new_value,
      change_source, old_data_point_id, new_data_point_id
    ) VALUES (
      p_user_id, p_category, p_field_key, existing.field_value, p_field_value,
      p_source, existing.id, new_id
    );

    RETURN new_id;
  ELSE
    -- No existing row: insert as version 1
    INSERT INTO founder_data_points (
      user_id, category, field_key, field_value, confidence,
      source, source_reference_id, version, is_current
    ) VALUES (
      p_user_id, p_category, p_field_key, p_field_value, p_confidence,
      p_source, p_source_reference_id, 1, true
    )
    RETURNING id INTO new_id;

    -- Log as new data point (no old value)
    INSERT INTO founder_data_history (
      user_id, category, field_key, old_value, new_value,
      change_source, new_data_point_id
    ) VALUES (
      p_user_id, p_category, p_field_key, NULL, p_field_value,
      p_source, new_id
    );

    RETURN new_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Why `SELECT ... FOR UPDATE`:** When two extractors (heuristic + AI) try to write to the same `(user_id, category, field_key)` concurrently, the `FOR UPDATE` lock ensures the second writer waits for the first to commit. The second writer then sees the updated `version` and `is_current` state, preventing duplicate version numbers.

**Application-layer call:**
```typescript
// In lib/fred/data-lake/writer.ts
const { data } = await supabase.rpc('upsert_data_point', {
  p_user_id: userId,
  p_category: category,
  p_field_key: fieldKey,
  p_field_value: fieldValue,
  p_confidence: confidence,
  p_source: source,
  p_source_reference_id: sourceReferenceId,
});
```

### 3.2 `founder_data_history` -- Change Log

Immutable audit trail of every data point change. Powers "what changed since last doc generation?"

```sql
CREATE TABLE IF NOT EXISTS founder_data_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What changed
  category TEXT NOT NULL,
  field_key TEXT NOT NULL,
  old_value JSONB,       -- null for first-time data points
  new_value JSONB NOT NULL,

  -- Context
  change_source TEXT NOT NULL CHECK (change_source IN (
    'chat', 'voice', 'intake', 'manual', 'document', 'system', 'onboarding'
  )),
  change_context TEXT,
  -- e.g., "User said 'we now have 12 people on the team' in chat session abc-123"

  -- Reference to the data point versions
  old_data_point_id UUID REFERENCES founder_data_points(id) ON DELETE SET NULL,
  new_data_point_id UUID NOT NULL REFERENCES founder_data_points(id) ON DELETE CASCADE,

  -- Timestamps
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query changes since a specific timestamp (for staleness detection)
CREATE INDEX idx_fdh_user_changed
  ON founder_data_history(user_id, changed_at DESC);

-- Query changes for a specific field
CREATE INDEX idx_fdh_user_field
  ON founder_data_history(user_id, category, field_key, changed_at DESC);
```

### 3.3 `living_documents` -- Documents That Auto-Update

Replaces/extends `strategy_documents` for documents that track their data dependencies and staleness.

```sql
CREATE TABLE IF NOT EXISTS living_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Document identity
  document_type TEXT NOT NULL CHECK (document_type IN (
    'strategy', 'reality_lens', 'irs', 'pitch_review', 'gtm_plan',
    'competitive_analysis', 'executive_summary', '30_60_90_plan',
    'market_analysis', 'investor_lens'
  )),
  title TEXT NOT NULL,

  -- Content: structured JSONB (sections, scores, etc.) + rendered markdown
  content JSONB NOT NULL,
  -- { sections: [...], metadata: {...}, renderedMarkdown: "..." }
  rendered_content TEXT,
  -- Pre-rendered markdown for display

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  data_snapshot_version INTEGER NOT NULL DEFAULT 0,
  -- Monotonic counter: incremented each time a data point used by this doc changes

  -- Staleness tracking
  last_generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  staleness_score FLOAT NOT NULL DEFAULT 0.0
    CHECK (staleness_score >= 0 AND staleness_score <= 1),
  -- 0.0 = fresh, 1.0 = very stale
  -- Computed: count(data changes since last_generated_at) / total_data_dependencies

  stale_fields TEXT[] DEFAULT '{}',
  -- Which specific fields changed since last generation
  -- e.g., ARRAY['financials.monthly_revenue', 'team.team_size']

  -- Auto-refresh config
  auto_refresh BOOLEAN NOT NULL DEFAULT false,
  auto_refresh_threshold FLOAT DEFAULT 0.3,
  -- If staleness_score exceeds this and auto_refresh is true, trigger regen

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active document per user+type (latest version)
CREATE INDEX idx_ld_user_type
  ON living_documents(user_id, document_type, version DESC);

-- Staleness queries (find documents that need regeneration)
CREATE INDEX idx_ld_stale
  ON living_documents(staleness_score DESC)
  WHERE staleness_score > 0;

-- Auto-refresh eligible documents
CREATE INDEX idx_ld_auto_refresh
  ON living_documents(auto_refresh, staleness_score DESC)
  WHERE auto_refresh = true;

-- Updated_at trigger
CREATE TRIGGER trg_living_documents_updated_at
  BEFORE UPDATE ON living_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3.4 `document_data_dependencies` -- Which Data Points a Document Uses

Enables: "when `monthly_revenue` changes, which documents are affected?"

```sql
CREATE TABLE IF NOT EXISTS document_data_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES living_documents(id) ON DELETE CASCADE,
  data_point_category TEXT NOT NULL,
  data_point_field_key TEXT NOT NULL,

  -- How important is this field to the document? (for staleness weighting)
  weight FLOAT NOT NULL DEFAULT 1.0
    CHECK (weight >= 0 AND weight <= 1),
  -- e.g., monthly_revenue has weight 1.0 for IRS, 0.3 for competitive_analysis

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(document_id, data_point_category, data_point_field_key)
);

-- Fast lookup: "which documents depend on this field?"
CREATE INDEX idx_ddd_field_lookup
  ON document_data_dependencies(data_point_category, data_point_field_key);

-- Fast lookup: "what fields does this document depend on?"
CREATE INDEX idx_ddd_document
  ON document_data_dependencies(document_id);
```

### 3.5 `data_extraction_queue` -- Async Extraction Pipeline

Chat/voice content goes through AI extraction asynchronously to avoid blocking the response.

```sql
CREATE TABLE IF NOT EXISTS data_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('chat', 'voice', 'document')),
  source_id TEXT NOT NULL,
  -- chat: session_id, voice: voice_call.id, document: uploaded_document.id

  -- Content to extract from
  raw_content TEXT NOT NULL,
  -- For chat: last N user messages concatenated
  -- For voice: full transcript
  -- For document: chunked text

  -- Processing state
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Results
  extracted_data JSONB,
  -- Array of { category, field_key, field_value, confidence }
  -- Populated by the extraction worker after AI processing

  data_points_created INTEGER DEFAULT 0,
  -- Count of NEW founder_data_points rows created from this extraction
  data_points_updated INTEGER DEFAULT 0,
  -- Count of EXISTING data points that were versioned (value changed)
  data_points_skipped INTEGER DEFAULT 0,
  -- Count of extractions that matched existing current values (no change)
  -- These three counters help monitor extraction quality and deduplication effectiveness.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- NOTE on raw_content size: Voice transcripts can be 10,000+ words.
-- TEXT has no practical size limit in PostgreSQL, but very large transcripts
-- should be chunked before enqueuing (e.g., 5,000 words per queue item).
-- The extraction worker can process multiple queue items for the same source_id.

-- Pending items for the extraction worker
CREATE INDEX idx_deq_pending
  ON data_extraction_queue(extraction_status, created_at ASC)
  WHERE extraction_status = 'pending';

-- User's extraction history
CREATE INDEX idx_deq_user
  ON data_extraction_queue(user_id, created_at DESC);

-- Source lookup (deduplicate re-extraction of same conversation)
CREATE INDEX idx_deq_source
  ON data_extraction_queue(source_type, source_id);
```

### 3.6 Modifications to Existing Tables

#### `profiles` -- Add data completeness score

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_completeness_score FLOAT DEFAULT 0.0;
  -- 0.0 = no data, 1.0 = all expected fields populated
  -- Computed: count(current_data_points) / count(expected_fields_for_stage)
```

#### `fred_semantic_memory` -- Add cross-reference to data lake

```sql
ALTER TABLE fred_semantic_memory
  ADD COLUMN IF NOT EXISTS data_point_id UUID REFERENCES founder_data_points(id) ON DELETE SET NULL;
  -- When a semantic memory fact has a corresponding founder_data_point, link them.
  -- This enables: "this fact in FRED's memory is backed by this structured data point."
```

#### `voice_calls` -- Add user_id column for RLS

```sql
ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  -- Currently voice_calls has caller_id TEXT but no user_id UUID.
  -- Needed for the data lake to link voice call extractions to a user.

ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS extracted_data_at TIMESTAMPTZ;
  -- Timestamp of last data extraction from this call's transcript.
  -- NULL means extraction hasn't run yet.
```

**Backfill note (per db-specialist review):** Existing `voice_calls` rows will have `user_id = NULL` after the migration. A best-effort backfill should attempt to map `caller_id TEXT` to `user_id UUID` where possible:

```sql
-- Best-effort backfill: map caller_id to user_id via profiles.phone or profiles.email
-- This depends on what caller_id actually contains (phone number, email, or opaque ID)
UPDATE voice_calls vc
SET user_id = p.id
FROM profiles p
WHERE vc.user_id IS NULL
  AND vc.caller_id IS NOT NULL
  AND (vc.caller_id = p.email OR vc.caller_id = p.id::TEXT);
-- If caller_id is a phone number, add: OR vc.caller_id = p.phone
```

Rows that can't be mapped will remain with `user_id = NULL` and won't be eligible for data extraction. Future voice calls will have `user_id` set at call initiation time (via LiveKit join token metadata).

---

## 4. Row Level Security (RLS)

All new tables follow the established Sahara pattern: user-scoped access + service_role bypass.

### 4.1 `founder_data_points`

```sql
ALTER TABLE founder_data_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data points"
  ON founder_data_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data points"
  ON founder_data_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data points"
  ON founder_data_points FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data points"
  ON founder_data_points FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages founder_data_points"
  ON founder_data_points FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 4.2 `founder_data_history`

```sql
ALTER TABLE founder_data_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data history"
  ON founder_data_history FOR SELECT
  USING (auth.uid() = user_id);

-- History is insert-only from the service layer; users don't write directly
CREATE POLICY "Service role manages founder_data_history"
  ON founder_data_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 4.3 `living_documents`

```sql
ALTER TABLE living_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own living documents"
  ON living_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own living documents"
  ON living_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own living documents"
  ON living_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own living documents"
  ON living_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages living_documents"
  ON living_documents FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 4.4 `document_data_dependencies`

```sql
ALTER TABLE document_data_dependencies ENABLE ROW LEVEL SECURITY;

-- Users can see dependencies for their own documents
CREATE POLICY "Users can view own document dependencies"
  ON document_data_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM living_documents ld
      WHERE ld.id = document_data_dependencies.document_id
      AND ld.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages document_data_dependencies"
  ON document_data_dependencies FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### 4.5 `data_extraction_queue`

```sql
ALTER TABLE data_extraction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extraction queue"
  ON data_extraction_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role enqueues and processes extractions
CREATE POLICY "Service role manages data_extraction_queue"
  ON data_extraction_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

---

## 5. Data Flow Architecture

### 5.0 XState Integration Overview

The FRED cognitive pipeline uses XState v5 with the following state flow:

```
idle → loading_memory → intake → validation → mental_models → synthesis → decide → execute → complete
```

**The `execute` actor (`lib/fred/actors/execute.ts`) is the canonical hook point for data extraction.**

The execute actor already performs fire-and-forget side effects after the decision is made:
- `logDecisionToMemory()` -- stores episodic + decision log entries
- `updateConversationState()` -- updates 9-step progress (Phase 36)

Data lake extraction becomes the third fire-and-forget side effect in the execute actor. This is architecturally correct because:
1. The execute actor has access to `userId`, `sessionId`, `validatedInput`, and `decision`
2. The `validatedInput` contains parsed entities, detected intent, extracted topics, and sentiment
3. Extraction happens AFTER the response is generated -- zero latency impact on the user
4. Errors in extraction never block the response (existing fire-and-forget pattern)

**Current state (to be refactored):** The heuristic enrichment extractor (`lib/fred/enrichment/extractor.ts`) is currently called from the chat route (`app/api/fred/chat/route.ts` line ~332) as a standalone fire-and-forget. This should move INTO the execute actor to consolidate all post-response side effects.

### 5.0.1 High-Level Data Flow Diagram

```
                              +-----------------------+
                              |   FOUNDER DATA LAKE   |
                              |  founder_data_points  |
                              |   (versioned, live)   |
                              +----------+------------+
                                    ^          |
                                    |          |  READ (current data)
                                    |          v
                                    |   +------+-------+
                                    |   | context-     |  Reads data lake as
                                    |   | builder.ts   |  primary source for
                                    |   | (Phase 34)   |  FRED's system prompt
                                    |   +------+-------+
                                    |          |
                     WRITE          |          v
                     (versioned)    |   [FRED System Prompt]
                                    |
                     +--------------+--+-------------------+
                     |                 |                    |
              [Execute Actor]   [Voice Agent]       [Intake/Onboarding]
              XState pipeline   After call ends     On form submit
              (post-response)                       (direct write)
                     |                 |                    |
          +----------+----------+     |                    |
          |                     |     |                    |
    [Heuristic          [Enqueue  [Enqueue voice    [Direct write
     Extractor]          AI job]   transcript]       to data points]
    (sync, ~5ms)        (async)   (async)
          |                     |     |
          v                     v     v
    [Write to            +------+-----+------+
     data points          | data_extraction   |
     immediately]         | _queue            |
                          | (pending → AI →   |
                          |  completed)       |
                          +------+------------+
                                 |
                                 v
                          +------+------------+
                          | Extraction Worker  |
                          | (AI-powered)       |
                          +------+------------+
                                 |
                     +-----------+------------+
                     |           |            |
                     v           v            v
              [New/Updated  [Change      [Staleness
               data point]   logged to    check on
                             history]     documents]
                                              |
                                              v
                                   +----------+----------+
                                   | document_data_deps  |
                                   +----------+----------+
                                              |
                                              v
                                   +----------+----------+
                                   | Update staleness    |
                                   | on living_documents |
                                   +----------+----------+
                                              |
                                              v
                                   (auto_refresh &&
                                    staleness > threshold?)
                                              |
                                              v
                                   +----------+----------+
                                   | Regenerate document |
                                   | from CURRENT data   |
                                   +----------+----------+
```

### 5.1 Chat Flow (XState Execute Actor Integration)

The chat flow hooks into the XState pipeline at the execute actor. This is the precise integration point.

**Current code path:**
```
POST /api/fred/chat
  → FredService.process(input)
    → XState: idle → loading_memory → intake → validation → mental_models → synthesis → decide → execute → complete
      → execute actor:
          1. logDecisionToMemory()          [existing]
          2. updateConversationState()      [existing, Phase 36]
          3. fireEnrichment()              [existing, but in chat route -- MOVE HERE]
  → Chat route: fireEnrichment() called    [REMOVE from here]
```

**Target code path:**
```
POST /api/fred/chat
  → FredService.process(input)
    → XState: idle → loading_memory → intake → validation → mental_models → synthesis → decide → execute → complete
      → execute actor:
          1. logDecisionToMemory()                 [existing]
          2. updateConversationState()             [existing, Phase 36]
          3. extractAndPersistDataPoints()         [NEW -- replaces fireEnrichment]
             a. Heuristic extraction (sync, ~5ms):
                - Run existing enrichment/extractor.ts patterns
                - ALSO run validate-input entity extraction (money, dates, metrics)
                - Map extracted fields to (category, field_key, field_value)
                - Write directly to founder_data_points with confidence 0.4-0.6
                - Write to profiles table for backward compat
             b. AI extraction enqueue (async, fire-and-forget):
                - Insert row into data_extraction_queue
                - source_type='chat', source_id=sessionId
                - raw_content = last N user messages from this session
                - Extraction worker picks this up asynchronously
          4. syncSemanticMemory()                  [NEW -- optional]
             - For each new/updated data point, UPSERT corresponding
               fred_semantic_memory row (keeps FRED's working memory in sync)
```

**Detailed extraction flow within execute actor:**
```
executeActor(decision, validatedInput, userId, sessionId)
  │
  ├─ logDecisionToMemory()              // existing
  ├─ updateConversationState()          // existing
  │
  ├─ extractAndPersistDataPoints()      // NEW
  │   │
  │   ├─ [SYNC] Heuristic Extraction
  │   │   ├─ enrichment/extractor.ts: extractProfileEnrichment(messages)
  │   │   │   → industry, revenue, team_size, funding, challenges, competitors, metrics
  │   │   ├─ validate-input entities: validatedInput.entities
  │   │   │   → money amounts, dates, metrics (already parsed)
  │   │   ├─ validate-input topics: validatedInput.topics
  │   │   │   → fundraising, pitchReview, strategy, positioning, mindset
  │   │   │
  │   │   ├─ Map to data points:
  │   │   │   enrichment.industry    → (market, industry, {value: "SaaS"}, 0.5, chat)
  │   │   │   enrichment.revenueHint → (financials, monthly_revenue, {value: "$50k"}, 0.4, chat)
  │   │   │   entity[money]          → (financials, *, depends on context, 0.4, chat)
  │   │   │   topic[fundraising]     → flag session for fundraising-focused AI extraction
  │   │   │
  │   │   └─ upsertDataPoint() for each extracted fact
  │   │       → Version check, dedup, insert/update, log to history
  │   │
  │   └─ [ASYNC] Enqueue AI Extraction (fire-and-forget)
  │       └─ INSERT INTO data_extraction_queue (
  │            user_id, source_type='chat', source_id=sessionId,
  │            raw_content=<last N user messages>, extraction_status='pending'
  │          )
  │
  └─ return response                    // existing
```

### 5.1.1 Tier Gating for Data Extraction

Tier gating MUST be respected throughout the data pipeline, consistent with existing patterns in `loadMemoryActor` and `context-builder.ts`.

| Tier | Heuristic Extraction | AI Extraction | Data Point Storage | Data Point Retention | Context Reading |
|------|---------------------|---------------|-------------------|---------------------|-----------------|
| **Free** | Yes (basic fields only) | No | Last 30 data points | 90 days | Current data points only, no history |
| **Pro** | Yes (full taxonomy) | Yes (async) | Unlimited | Unlimited | Full data + history |
| **Studio** | Yes (full taxonomy) | Yes (priority queue) | Unlimited | Unlimited | Full data + history + cross-session |

**Implementation:** The execute actor already receives `userId` -- look up the user's tier from `profiles.tier` (or accept it as a parameter from FredService). Gate extraction depth and queue priority based on tier.

```typescript
// In execute actor:
const tier = await getUserTier(userId); // existing function from lib/api/tier-middleware

// Heuristic extraction: always runs (lightweight)
const heuristicResults = extractProfileEnrichment(messages);

// AI extraction: Pro+ only
if (tier !== 'free') {
  await enqueueAIExtraction(userId, sessionId, messages, {
    priority: tier === 'studio' ? 'high' : 'normal'
  });
}

// Data retention: enforced on read, not write
// Free tier: context-builder limits to most recent 30 data points
```

### 5.1.2 Context Builder Integration (READ path)

`lib/fred/context-builder.ts` currently reads from:
- `profiles` table (name, stage, industry, etc.)
- `fred_semantic_memory` (category/key/value facts)

**With the data lake, the read path becomes:**

```
buildFounderContext(userId, hasPersistentMemory)
  │
  ├─ loadFounderProfile(userId)           // existing -- reads profiles table
  │   → Still needed for backward compat and non-data-lake fields (email, tier, etc.)
  │
  ├─ loadDataLakeSnapshot(userId, tier)   // NEW
  │   → SELECT * FROM founder_data_points WHERE user_id = $1 AND is_current = true
  │   → Free tier: LIMIT 30, ORDER BY confidence DESC, extracted_at DESC
  │   → Pro+: no limit
  │   → Groups by category, builds structured snapshot
  │   → Returns: Map<category, Array<{field_key, field_value, confidence, source}>>
  │
  ├─ loadSemanticFacts(userId, ...)       // existing -- still used for non-data-lake facts
  │   → Facts NOT in the data lake (e.g., user preferences, procedural memory)
  │
  ├─ checkIsFirstConversation(userId)     // existing
  │
  └─ buildContextBlock(profile, dataLake, facts, isFirstConversation)
      → Data lake snapshot takes PRIORITY over profile fields when both exist
      → Profile fields used as fallback for fields not yet in the data lake
      → Semantic memory facts used for non-structured context only
```

### 5.2 Voice Flow (Detailed)

```
1. Voice call occurs via LiveKit voice agent (workers/voice-agent/agent.ts)
2. CURRENT STATE: Voice agent persists NOTHING -- this is the biggest data gap.
3. TARGET STATE: After call ends:
   a. Save transcript to voice_calls.transcript (already exists)
   b. Set voice_calls.user_id (NEW -- requires caller-to-user resolution, see below)
   c. Enqueue transcript to data_extraction_queue:
      - source_type = 'voice'
      - source_id = voice_calls.id
      - raw_content = full transcript text
   d. Extraction worker processes the transcript through the same AI pipeline as chat
   e. Extracted data points written to founder_data_points with source='voice'
```

#### 5.2.1 Voice Caller-to-User Resolution Strategy (BLOCKER B3)

Per reviewer audit: the design adds `user_id` to `voice_calls` but needs a concrete strategy for mapping `caller_id TEXT` (LiveKit participant identity) to `auth.users.id UUID`. Without this, voice extractions can't be linked to founders. This is a **hard prerequisite** for the voice extraction pipeline.

**Recommended approach: LiveKit room join token metadata**

When a user initiates a voice call from the frontend, the client requests a LiveKit join token from the backend. The backend already knows the authenticated user's ID (from the Supabase session). Include the `user_id` in the token's participant metadata:

```typescript
// In the voice call initiation API route (e.g., POST /api/voice/token)
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(apiKey, apiSecret, {
  identity: userId,  // Use Supabase auth.users.id as LiveKit identity
  metadata: JSON.stringify({ userId, tier: userTier }),
});
token.addGrant({ roomJoin: true, room: roomName });
```

```typescript
// In workers/voice-agent/agent.ts -- on participant connected
session.on('participantConnected', (participant) => {
  const metadata = JSON.parse(participant.metadata || '{}');
  const userId = metadata.userId; // Supabase auth.users UUID

  // Store on the voice_calls row immediately
  await supabase.from('voice_calls').update({ user_id: userId }).eq('id', callId);
});
```

**Fallback for unresolved callers:** If metadata is missing (e.g., phone-based PSTN calls without auth), `user_id` stays NULL. These calls are saved but NOT eligible for data extraction. The extraction pipeline filters on `voice_calls.user_id IS NOT NULL`.

**Alternative approaches (not recommended for v1):**
- Mapping table (`caller_identities`) linking phone numbers or external IDs to user UUIDs -- adds complexity, needed only for PSTN/SIP calls
- Post-call resolution via voice matching or transcript analysis -- too speculative for v1

### 5.3 Onboarding Flow (Detailed)

```
1. User completes onboarding form (stage, challenges, industry, etc.)
2. On submit: write structured data directly to founder_data_points
   - category='team', field_key='stage', field_value={ value: 'idea' }, source='onboarding', confidence=1.0
   - category='market', field_key='industry', field_value={ value: 'SaaS' }, source='onboarding', confidence=1.0
   - category='challenges', field_key='primary_challenge', etc.
3. No extraction queue needed -- data is already structured
4. Also write to profiles table (for backward compatibility with existing reads)
5. Confidence = 1.0 for direct user input (highest priority in conflict resolution)
```

### 5.4 Document Generation Flow (Detailed)

```
1. User requests a strategy document / IRS / Reality Lens / etc.
2. Load all current founder_data_points for the user
3. Group by category, build structured context for AI prompt
4. Generate document content using AI + structured data
5. Save to living_documents with:
   - data_snapshot_version = current max version across all data points
   - staleness_score = 0.0
   - stale_fields = '{}'
6. Record document_data_dependencies:
   - For IRS: depends on team.*, market.*, financials.*, product.*, etc.
   - For GTM plan: depends on gtm.*, customers.*, market.*
7. Future data changes trigger staleness updates automatically
```

---

## 6. Migration Plan

### Single Migration File

Per db-specialist recommendation: use a single `052_founder_data_lake.sql` file with comment blocks for logical sections (consistent with migrations 049 and 051). Supabase migration runner handles one file per migration number, and if any section fails the whole migration rolls back anyway.

### Section Order within `052_founder_data_lake.sql`

| Section | Description |
|---------|-------------|
| 1 | Create `founder_data_points` table + indexes |
| 2 | Create `founder_data_history` table + indexes |
| 3 | Create `living_documents` table + indexes + trigger |
| 4 | Create `document_data_dependencies` table + indexes |
| 5 | Create `data_extraction_queue` table + indexes |
| 6 | ALTER existing tables: profiles, fred_semantic_memory, voice_calls |
| 7 | RLS policies for all new tables |
| 8 | Functions: `update_data_completeness()`, `compute_document_staleness()` |
| 9 | Views: `founder_current_data`, `founder_data_summary`, `stale_documents` |
| 10 | Backfill from profiles + fred_semantic_memory into founder_data_points |
| 11 | Table comments |

### Backfill Strategy

On deployment, populate `founder_data_points` from existing data.

**Important:** The unique constraint on `founder_data_points` is a partial unique index (`WHERE is_current = true`). The `ON CONFLICT` clause MUST reference the constraint explicitly, otherwise PostgreSQL won't match against the partial index.

**Idempotent backfill:** Per architect recommendation, uses `DO UPDATE` instead of `DO NOTHING` so that re-running the backfill picks up profile changes since the first run. The `WHERE` clause on the UPDATE ensures we only overwrite if the value actually changed.

```sql
-- Backfill from profiles
INSERT INTO founder_data_points (user_id, category, field_key, field_value, confidence, source, version, is_current)
SELECT
  id,
  'team',
  'stage',
  jsonb_build_object('value', stage),
  1.0,
  'system',
  1,
  true
FROM profiles
WHERE stage IS NOT NULL
ON CONFLICT (user_id, category, field_key) WHERE is_current = true
DO UPDATE SET
  field_value = EXCLUDED.field_value,
  confidence = GREATEST(founder_data_points.confidence, EXCLUDED.confidence),
  extracted_at = now()
WHERE founder_data_points.field_value IS DISTINCT FROM EXCLUDED.field_value;

-- Similar for: industry, revenue_range, team_size, funding_history,
-- product_status, traction, runway, primary_constraint, ninety_day_goal
-- Each uses the same ON CONFLICT ... DO UPDATE pattern.

-- Backfill from fred_semantic_memory (map categories)
-- NOTE (W5): fred_semantic_memory stores values as JSONB but the shape varies.
-- Some values may be: { "value": "SaaS" }, others may be plain: "SaaS" or { "text": "..." }
-- The CASE expression normalizes all values to the { "value": ... } wrapper that
-- the data lake taxonomy expects.
INSERT INTO founder_data_points (user_id, category, field_key, field_value, confidence, source, version, is_current)
SELECT
  user_id,
  CASE category
    WHEN 'startup_facts' THEN 'business_model'
    WHEN 'user_preferences' THEN 'business_model'
    WHEN 'market_knowledge' THEN 'market'
    WHEN 'team_info' THEN 'team'
    WHEN 'investor_info' THEN 'fundraising'
    WHEN 'product_details' THEN 'product'
    WHEN 'metrics' THEN 'metrics'
    WHEN 'goals' THEN 'milestones'
    WHEN 'challenges' THEN 'challenges'
    WHEN 'decisions' THEN 'business_model'
    ELSE 'business_model'
  END,
  key,
  -- Normalize JSONB value shape: ensure { "value": ... } wrapper
  CASE
    WHEN value ? 'value' THEN value                          -- Already has "value" key
    WHEN value ? 'text' THEN jsonb_build_object('value', value ->> 'text')  -- Has "text" key
    WHEN jsonb_typeof(value) = 'string' THEN jsonb_build_object('value', value #>> '{}')  -- Plain string
    WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('value', value)  -- Plain number
    ELSE jsonb_build_object('value', value)                  -- Wrap anything else
  END,
  confidence,
  COALESCE(source, 'system'),
  1,
  true
FROM fred_semantic_memory
ON CONFLICT (user_id, category, field_key) WHERE is_current = true
DO UPDATE SET
  field_value = EXCLUDED.field_value,
  confidence = GREATEST(founder_data_points.confidence, EXCLUDED.confidence),
  extracted_at = now()
WHERE founder_data_points.field_value IS DISTINCT FROM EXCLUDED.field_value;
```

**Note:** The idempotent backfill updates `field_value` and takes the higher confidence, but does NOT increment `version` or create history entries. This is intentional -- backfill corrections are treated as the same logical version, not a business-data change. True version increments only happen through the extraction pipeline.

---

## 7. Relationship to Existing Tables

### 7.1 `fred_semantic_memory` Coexistence

`fred_semantic_memory` continues to serve as FRED's real-time fact store for prompt building. The data lake is the source of truth; semantic memory is a cache/index optimized for AI context.

**Flow:**
```
founder_data_points (source of truth, versioned)
       |
       +--> fred_semantic_memory (FRED's working memory, UPSERT'd)
       |    Used by load-memory actor and context-builder
       |
       +--> founder_data_history (audit trail)
```

When a new `founder_data_point` is created, also UPSERT the corresponding `fred_semantic_memory` row (mapping category/key). The `data_point_id` foreign key on `fred_semantic_memory` links back.

### 7.2 `fred_conversation_state` Coexistence

The `founder_snapshot` JSONB in `fred_conversation_state` remains as a quick-access cache of key snapshot fields. It is populated FROM `founder_data_points` and kept in sync.

### 7.3 Backward Compatibility

- `profiles` columns continue to be written for backward compatibility
- Existing document generation routes continue to work (they read from profiles + semantic_memory)
- New data lake becomes the ADDITIONAL source, with gradual migration of generators to read from `founder_data_points`

---

## 8. Computed Fields and Functions

### 8.1 Staleness Score Computation (Lazy / On-Demand)

Per db-specialist recommendation: staleness is computed **lazily on read** (when the user opens a document) or via a **periodic cron job**, rather than via a trigger on `founder_data_history` INSERT.

**Rationale:** A trigger-based approach would execute a multi-table JOIN (across `document_data_dependencies`, `founder_data_history`, and `living_documents`) on every data point change. For a user with 10+ documents each with 15+ dependencies, this adds significant overhead to the data extraction pipeline. Since staleness is only meaningful when a user views a document, lazy computation is both simpler and more performant.

```sql
-- Function to compute staleness for a specific document (called on read or by cron)
CREATE OR REPLACE FUNCTION compute_document_staleness(doc_id UUID)
RETURNS TABLE(staleness_score FLOAT, stale_fields TEXT[]) AS $$
DECLARE
  doc_user_id UUID;
  doc_generated_at TIMESTAMPTZ;
  total_deps INTEGER;
  stale_deps INTEGER;
  stale_field_list TEXT[];
BEGIN
  -- Get document metadata
  SELECT user_id, last_generated_at
  INTO doc_user_id, doc_generated_at
  FROM living_documents
  WHERE id = doc_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0.0::FLOAT, ARRAY[]::TEXT[];
    RETURN;
  END IF;

  -- Count total dependencies
  SELECT COUNT(*) INTO total_deps
  FROM document_data_dependencies
  WHERE document_id = doc_id;

  IF total_deps = 0 THEN
    RETURN QUERY SELECT 0.0::FLOAT, ARRAY[]::TEXT[];
    RETURN;
  END IF;

  -- Find dependencies where the underlying data changed after doc was generated
  SELECT
    COUNT(DISTINCT ddd.data_point_category || '.' || ddd.data_point_field_key),
    ARRAY_AGG(DISTINCT ddd.data_point_category || '.' || ddd.data_point_field_key)
  INTO stale_deps, stale_field_list
  FROM document_data_dependencies ddd
  WHERE ddd.document_id = doc_id
    AND EXISTS (
      SELECT 1 FROM founder_data_history fdh
      WHERE fdh.user_id = doc_user_id
        AND fdh.category = ddd.data_point_category
        AND fdh.field_key = ddd.data_point_field_key
        AND fdh.changed_at > doc_generated_at
    );

  RETURN QUERY SELECT
    LEAST(stale_deps::FLOAT / total_deps::FLOAT, 1.0),
    COALESCE(stale_field_list, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage patterns:**

1. **On document view (lazy):** When a user opens a living document, call `compute_document_staleness(doc_id)` and update the cached `staleness_score` and `stale_fields` columns on `living_documents`. This is a single query per document view.

2. **Periodic cron (batch):** A cron job runs every 15-30 minutes, iterating over `living_documents WHERE auto_refresh = true` and recomputing staleness. Documents exceeding their `auto_refresh_threshold` are flagged for regeneration.

```sql
-- Cron-friendly: recompute staleness for all auto-refresh documents
-- (runs as a Supabase Edge Function or pg_cron job)
UPDATE living_documents ld
SET
  staleness_score = result.staleness_score,
  stale_fields = result.stale_fields
FROM compute_document_staleness(ld.id) AS result
WHERE ld.auto_refresh = true;
```

**Note:** The trigger-based approach is preserved as a commented-out alternative in the migration file in case the team decides trigger-based is preferable for specific use cases (e.g., real-time staleness badges in the UI). But the default implementation is lazy.

### 8.2 Data Completeness Score

```sql
-- Update data completeness on profiles when data points change
CREATE OR REPLACE FUNCTION update_data_completeness()
RETURNS TRIGGER AS $$
DECLARE
  point_count INTEGER;
  -- Expected minimum fields for a "complete" profile
  expected_count INTEGER := 15;
BEGIN
  SELECT COUNT(DISTINCT category || '.' || field_key)
  INTO point_count
  FROM founder_data_points
  WHERE user_id = NEW.user_id AND is_current = true;

  UPDATE profiles
  SET data_completeness_score = LEAST(point_count::FLOAT / expected_count::FLOAT, 1.0)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_completeness
  AFTER INSERT OR UPDATE ON founder_data_points
  FOR EACH ROW
  EXECUTE FUNCTION update_data_completeness();
```

---

## 9. Views

### 9.1 Current Founder Data (Materialized for performance)

```sql
CREATE OR REPLACE VIEW founder_current_data AS
SELECT
  user_id,
  category,
  field_key,
  field_value,
  confidence,
  source,
  version,
  extracted_at
FROM founder_data_points
WHERE is_current = true;
```

### 9.2 Founder Data Summary

Per db-specialist recommendation: uses a CTE approach instead of correlated subqueries to avoid N+1 query patterns when scanning multiple users.

```sql
CREATE OR REPLACE VIEW founder_data_summary AS
WITH category_counts AS (
  SELECT
    user_id,
    category,
    COUNT(*) as cnt,
    MIN(extracted_at) as earliest,
    MAX(extracted_at) as latest,
    AVG(confidence) as avg_conf
  FROM founder_data_points
  WHERE is_current = true
  GROUP BY user_id, category
)
SELECT
  user_id,
  SUM(cnt) as total_data_points,
  COUNT(DISTINCT category) as categories_populated,
  MIN(earliest) as earliest_data,
  MAX(latest) as latest_data,
  AVG(avg_conf) as avg_confidence,
  jsonb_object_agg(category, cnt) as points_per_category
FROM category_counts
GROUP BY user_id;
```

### 9.3 Stale Documents View

```sql
CREATE OR REPLACE VIEW stale_documents AS
SELECT
  ld.id,
  ld.user_id,
  ld.document_type,
  ld.title,
  ld.staleness_score,
  ld.stale_fields,
  ld.last_generated_at,
  ld.auto_refresh,
  p.name as founder_name,
  p.email as founder_email
FROM living_documents ld
JOIN profiles p ON p.id = ld.user_id
WHERE ld.staleness_score > 0
ORDER BY ld.staleness_score DESC;
```

---

## 10. Performance Considerations

1. **Partial indexes on `is_current = true`** -- Most queries only need current data points. The unique partial index on `(user_id, category, field_key) WHERE is_current = true` is critical.

2. **History table is append-only** -- No updates or deletes, so index maintenance is minimal. The `changed_at DESC` index supports "changes since X" queries.

3. **Extraction queue is transient** -- Processed items can be archived/deleted after 30 days. The `pending` partial index keeps the worker fast.

4. **Staleness trigger fires on history INSERT** -- This is per-change, not per-query. Documents cache their staleness score.

5. **Expected scale:** ~50-200 data points per user, ~5-20 documents per user, ~1-5 changes per conversation session. This is well within PostgreSQL's comfort zone without partitioning.

---

## 11. Security Considerations

1. **RLS on every table** -- All 5 new tables have user-scoped RLS + service_role bypass, matching the pattern from `040_rls_hardening.sql`.

2. **No cross-user data leakage** -- The `user_id` column on every table ensures strict isolation. The `idx_fdp_current_unique` constraint prevents duplicate current records.

3. **Extraction queue contains raw text** -- RLS ensures users can only see their own queue items. The service role processes them.

4. **JSONB `field_value` is user-controlled content** -- All values must be sanitized before injection into AI prompts, using the existing `sanitizeUserInput()` from `lib/ai/guards/prompt-guard.ts`.

5. **Confidence scores are system-set** -- Users cannot directly set confidence via RLS policies (INSERT/UPDATE policies use service_role for the extraction pipeline).
