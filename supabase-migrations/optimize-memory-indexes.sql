-- AI-910: Optimize Fred memory storage schema
-- Adds composite indexes for common query patterns and RPC for atomic procedure updates

-- 1. Composite index for "recent facts by user" queries
-- Used by getAllUserFacts() which orders by (category, updated_at DESC)
CREATE INDEX IF NOT EXISTS fred_semantic_user_updated_idx
  ON fred_semantic_memory(user_id, updated_at DESC);

-- 2. Composite index for "recent episodes by user" queries
-- Used by retrieveRecentEpisodes() and enforceRetentionLimits()
CREATE INDEX IF NOT EXISTS fred_episodic_user_created_idx
  ON fred_episodic_memory(user_id, created_at DESC);

-- 3. Composite index for "recent decisions by user" queries
-- Used by getRecentDecisions()
CREATE INDEX IF NOT EXISTS fred_decision_user_created_idx
  ON fred_decision_log(user_id, created_at DESC);

-- 4. Atomic procedure usage update (eliminates N+1 fetch-then-update)
CREATE OR REPLACE FUNCTION update_procedure_usage(
  proc_name TEXT,
  was_success BOOLEAN
) RETURNS VOID AS $$
DECLARE
  alpha FLOAT := 0.1;
BEGIN
  UPDATE fred_procedural_memory
  SET
    usage_count = usage_count + 1,
    success_rate = COALESCE(success_rate, 0.5) * (1 - alpha) + (CASE WHEN was_success THEN 1 ELSE 0 END) * alpha,
    updated_at = NOW()
  WHERE name = proc_name;
END;
$$ LANGUAGE plpgsql;
