-- ============================================================================
-- Migration 042: Coaching Sessions
-- Phase 29-01: Video Coaching Sessions with FRED Sidebar
-- ============================================================================

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user-scoped queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_created
  ON coaching_sessions (user_id, created_at DESC);

-- Index for room lookup
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_room_name
  ON coaching_sessions (room_name);

-- Enable Row-Level Security
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY coaching_sessions_select_own
  ON coaching_sessions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can only insert their own sessions
CREATE POLICY coaching_sessions_insert_own
  ON coaching_sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can only update their own sessions
CREATE POLICY coaching_sessions_update_own
  ON coaching_sessions
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can only delete their own sessions
CREATE POLICY coaching_sessions_delete_own
  ON coaching_sessions
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Auto-update updated_at via trigger
CREATE OR REPLACE FUNCTION update_coaching_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coaching_sessions_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_sessions_updated_at();
