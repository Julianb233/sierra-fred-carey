-- AI-910: Fred Memory Storage Schema Optimization
-- Non-breaking migration: adds missing columns, indexes, FKs, RLS, constraints
-- No drops, no renames, no data loss

BEGIN;

-- ============================================================================
-- 1. fred_episodic_memory: Add missing columns referenced by code
-- ============================================================================

-- content_hash column for dedup (fred-memory.ts storeEpisode uses this)
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- channel column for cross-channel tracking (fred-memory.ts storeEpisode uses this)
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'chat';

-- Unique partial index for dedup on content_hash (NULLs exempt)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fred_episodic_content_hash_dedup
  ON fred_episodic_memory (user_id, session_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Index for channel-based queries (cross-channel context loader)
CREATE INDEX IF NOT EXISTS idx_fred_episodic_channel
  ON fred_episodic_memory (user_id, channel, created_at DESC);

-- ============================================================================
-- 2. Missing foreign key constraints to auth.users
-- ============================================================================

-- fred_episodic_memory.user_id -> auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fred_episodic_memory_user_id_fkey'
  ) THEN
    ALTER TABLE fred_episodic_memory
      ADD CONSTRAINT fred_episodic_memory_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- fred_semantic_memory.user_id -> auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fred_semantic_memory_user_id_fkey'
  ) THEN
    ALTER TABLE fred_semantic_memory
      ADD CONSTRAINT fred_semantic_memory_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- fred_decision_log.user_id -> auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fred_decision_log_user_id_fkey'
  ) THEN
    ALTER TABLE fred_decision_log
      ADD CONSTRAINT fred_decision_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 3. Missing composite indexes for common query patterns
-- ============================================================================

-- fred_decision_log: getRecentDecisions queries by (user_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_fred_decision_user_created
  ON fred_decision_log (user_id, created_at DESC);

-- fred_decision_log: queries with decision_type filter
CREATE INDEX IF NOT EXISTS idx_fred_decision_user_type
  ON fred_decision_log (user_id, decision_type);

-- fred_semantic_memory: getFactsByCategory orders by updated_at
CREATE INDEX IF NOT EXISTS idx_fred_semantic_user_category_updated
  ON fred_semantic_memory (user_id, category, updated_at DESC);

-- fred_episodic_memory: retrieveRecentEpisodes with eventType filter
CREATE INDEX IF NOT EXISTS idx_fred_episodic_user_type_created
  ON fred_episodic_memory (user_id, event_type, created_at DESC);

-- fred_episodic_memory: queries by importance score for retention
CREATE INDEX IF NOT EXISTS idx_fred_episodic_user_importance
  ON fred_episodic_memory (user_id, importance_score DESC);

-- ============================================================================
-- 4. Enable RLS on fred_procedural_memory (has policies but RLS is disabled)
-- ============================================================================

ALTER TABLE fred_procedural_memory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Add check constraint for decision_type on fred_decision_log
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fred_decision_log_decision_type_check'
  ) THEN
    ALTER TABLE fred_decision_log
      ADD CONSTRAINT fred_decision_log_decision_type_check
      CHECK (decision_type IN ('auto', 'recommended', 'escalated'));
  END IF;
END $$;

-- ============================================================================
-- 6. Add check constraint for channel on fred_episodic_memory
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fred_episodic_memory_channel_check'
  ) THEN
    ALTER TABLE fred_episodic_memory
      ADD CONSTRAINT fred_episodic_memory_channel_check
      CHECK (channel IN ('chat', 'voice', 'sms'));
  END IF;
END $$;

-- ============================================================================
-- 7. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN fred_episodic_memory.content_hash IS 'MD5 hash of event_type+content for deduplication';
COMMENT ON COLUMN fred_episodic_memory.channel IS 'Communication channel: chat, voice, or sms';

COMMIT;
