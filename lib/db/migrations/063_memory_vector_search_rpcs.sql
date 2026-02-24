-- Migration 063: Vector search RPCs for FRED memory
-- Phase 63-01: Embedding-based episodic and semantic memory retrieval
--
-- These functions use pgvector cosine distance (<=> operator) to find
-- semantically similar memories. They are called via Supabase RPC from
-- the TypeScript memory layer (lib/db/fred-memory.ts).
--
-- SECURITY DEFINER allows the function to bypass RLS (called with service role).

-- ============================================================================
-- search_episodic_memory
-- ============================================================================
-- Finds episodic memory rows most similar to the query embedding.
-- Only returns rows that have a non-null embedding and meet the threshold.

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
  embedding vector(1536),
  importance_score float,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fem.id,
    fem.user_id,
    fem.session_id,
    fem.event_type,
    fem.content,
    fem.embedding,
    fem.importance_score,
    fem.created_at,
    fem.metadata,
    (1 - (fem.embedding <=> query_embedding))::float AS similarity
  FROM fred_episodic_memory fem
  WHERE fem.user_id = match_user_id
    AND fem.embedding IS NOT NULL
    AND (1 - (fem.embedding <=> query_embedding)) > match_threshold
  ORDER BY fem.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- search_semantic_memory
-- ============================================================================
-- Finds semantic memory (facts) most similar to the query embedding.
-- Optional category filter narrows results to a specific fact category.

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
  embedding vector(1536),
  confidence float,
  source text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fsm.id,
    fsm.user_id,
    fsm.category,
    fsm.key,
    fsm.value,
    fsm.embedding,
    fsm.confidence,
    fsm.source,
    fsm.created_at,
    fsm.updated_at,
    (1 - (fsm.embedding <=> query_embedding))::float AS similarity
  FROM fred_semantic_memory fsm
  WHERE fsm.user_id = match_user_id
    AND fsm.embedding IS NOT NULL
    AND (1 - (fsm.embedding <=> query_embedding)) > match_threshold
    AND (match_category IS NULL OR fsm.category = match_category)
  ORDER BY fsm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
