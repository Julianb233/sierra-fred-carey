-- ============================================================================
-- Migration 055: Next Steps Table
-- Phase 43: Next Steps Hub & Readiness Tab
--
-- Persisted next steps extracted from FRED conversations, with priority
-- categorization and completion tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS next_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  why_it_matters TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'important', 'optional')),
  source_conversation_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for efficient dashboard queries
CREATE INDEX IF NOT EXISTS idx_next_steps_user_completed_priority
  ON next_steps(user_id, completed, priority);

CREATE INDEX IF NOT EXISTS idx_next_steps_user_created
  ON next_steps(user_id, created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_next_steps_updated_at
  BEFORE UPDATE ON next_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS: Users can only see/modify their own rows
-- ============================================================================

ALTER TABLE next_steps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own next steps"
    ON next_steps FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own next steps"
    ON next_steps FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own next steps"
    ON next_steps FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own next steps"
    ON next_steps FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages next steps"
    ON next_steps FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE next_steps IS
  'Persisted next steps from FRED conversations with priority categorization. Phase 43.';
