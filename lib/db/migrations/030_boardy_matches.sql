-- Migration: Boardy Matches
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06
--
-- Stores investor/advisor/mentor matches from Boardy integration.
-- Tracks match lifecycle from suggestion through connection.

CREATE TABLE IF NOT EXISTS boardy_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('investor', 'advisor', 'mentor', 'partner')),
  match_name TEXT,
  match_description TEXT,
  match_score REAL,
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'connected', 'intro_sent', 'meeting_scheduled', 'declined')),
  boardy_reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_boardy_matches_user ON boardy_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_boardy_matches_status ON boardy_matches(status);
CREATE INDEX IF NOT EXISTS idx_boardy_matches_type ON boardy_matches(match_type);

-- Comments
COMMENT ON TABLE boardy_matches IS 'Boardy AI investor/advisor match tracking with status workflow';
COMMENT ON COLUMN boardy_matches.match_score IS 'Relevance score from 0 to 1';
COMMENT ON COLUMN boardy_matches.boardy_reference_id IS 'External Boardy platform reference ID';
COMMENT ON COLUMN boardy_matches.metadata IS 'Additional match context and details';
