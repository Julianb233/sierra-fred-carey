-- ============================================================================
-- Migration 062: Call Recording & Transcript Columns
-- Phase 62: Voice Agent Production Hardening
-- ============================================================================

-- Add recording and transcript columns to coaching_sessions
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript_json JSONB,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS decisions JSONB,
  ADD COLUMN IF NOT EXISTS next_actions JSONB,
  ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'on-demand'
    CHECK (call_type IN ('on-demand', 'scheduled'));

-- Add unique constraint on room_name for upsert operations
-- (may already exist from webhook handler, use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coaching_sessions_room_name_unique'
  ) THEN
    ALTER TABLE coaching_sessions
      ADD CONSTRAINT coaching_sessions_room_name_unique UNIQUE (room_name);
  END IF;
END $$;
