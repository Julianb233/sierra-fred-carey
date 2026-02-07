-- Migration 038: Investor Targeting Tables
-- Phase 20: Investor Targeting, Outreach & Pipeline
-- Created: 2026-02-07
--
-- Creates 4 tables for investor list upload, matching, and scoring.

-- ============================================================================
-- Table 1: investor_lists (one per upload)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload', -- 'upload', 'admin', 'manual'
  investor_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Table 2: investors (individual investor records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES investor_lists ON DELETE CASCADE,
  name TEXT NOT NULL,
  firm TEXT,
  email TEXT,
  website TEXT,
  stage_focus TEXT[], -- e.g., ARRAY['pre-seed', 'seed']
  sector_focus TEXT[], -- e.g., ARRAY['SaaS', 'FinTech']
  check_size_min INTEGER, -- in dollars
  check_size_max INTEGER, -- in dollars
  location TEXT,
  notes TEXT,
  raw_data JSONB, -- original CSV row for reference
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Table 3: investor_matches (match results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  stage_score INTEGER CHECK (stage_score BETWEEN 0 AND 100),
  sector_score INTEGER CHECK (sector_score BETWEEN 0 AND 100),
  size_score INTEGER CHECK (size_score BETWEEN 0 AND 100),
  reasoning TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'passed', 'interested')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, investor_id)
);

-- ============================================================================
-- Table 4: investor_match_scores (score breakdown for transparency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES investor_matches ON DELETE CASCADE,
  dimension TEXT NOT NULL, -- 'stage', 'sector', 'size', 'location', 'track_record'
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_investor_lists_user_id ON investor_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_list_id ON investors(list_id);
CREATE INDEX IF NOT EXISTS idx_investor_matches_user_score ON investor_matches(user_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_investor_matches_investor ON investor_matches(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_match_scores_match ON investor_match_scores(match_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE investor_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_match_scores ENABLE ROW LEVEL SECURITY;

-- investor_lists: users can only access their own lists
DROP POLICY IF EXISTS "Users can view own investor lists" ON investor_lists;
CREATE POLICY "Users can view own investor lists" ON investor_lists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own investor lists" ON investor_lists;
CREATE POLICY "Users can insert own investor lists" ON investor_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own investor lists" ON investor_lists;
CREATE POLICY "Users can update own investor lists" ON investor_lists
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own investor lists" ON investor_lists;
CREATE POLICY "Users can delete own investor lists" ON investor_lists
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access investor lists" ON investor_lists;
CREATE POLICY "Service role full access investor lists" ON investor_lists
  FOR ALL USING (auth.role() = 'service_role');

-- investors: users can access investors via list ownership
DROP POLICY IF EXISTS "Users can view investors in own lists" ON investors;
CREATE POLICY "Users can view investors in own lists" ON investors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investor_lists
      WHERE investor_lists.id = investors.list_id
      AND investor_lists.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert investors in own lists" ON investors;
CREATE POLICY "Users can insert investors in own lists" ON investors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investor_lists
      WHERE investor_lists.id = investors.list_id
      AND investor_lists.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete investors in own lists" ON investors;
CREATE POLICY "Users can delete investors in own lists" ON investors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM investor_lists
      WHERE investor_lists.id = investors.list_id
      AND investor_lists.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access investors" ON investors;
CREATE POLICY "Service role full access investors" ON investors
  FOR ALL USING (auth.role() = 'service_role');

-- investor_matches: users can only access their own matches
DROP POLICY IF EXISTS "Users can view own investor matches" ON investor_matches;
CREATE POLICY "Users can view own investor matches" ON investor_matches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own investor matches" ON investor_matches;
CREATE POLICY "Users can insert own investor matches" ON investor_matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own investor matches" ON investor_matches;
CREATE POLICY "Users can update own investor matches" ON investor_matches
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own investor matches" ON investor_matches;
CREATE POLICY "Users can delete own investor matches" ON investor_matches
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access investor matches" ON investor_matches;
CREATE POLICY "Service role full access investor matches" ON investor_matches
  FOR ALL USING (auth.role() = 'service_role');

-- investor_match_scores: users can access scores for their own matches
DROP POLICY IF EXISTS "Users can view own match scores" ON investor_match_scores;
CREATE POLICY "Users can view own match scores" ON investor_match_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investor_matches
      WHERE investor_matches.id = investor_match_scores.match_id
      AND investor_matches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert scores for own matches" ON investor_match_scores;
CREATE POLICY "Users can insert scores for own matches" ON investor_match_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investor_matches
      WHERE investor_matches.id = investor_match_scores.match_id
      AND investor_matches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete scores for own matches" ON investor_match_scores;
CREATE POLICY "Users can delete scores for own matches" ON investor_match_scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM investor_matches
      WHERE investor_matches.id = investor_match_scores.match_id
      AND investor_matches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access match scores" ON investor_match_scores;
CREATE POLICY "Service role full access match scores" ON investor_match_scores
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE investor_lists IS 'Uploaded or manually created investor lists, one per upload per user';
COMMENT ON TABLE investors IS 'Individual investor records parsed from CSV uploads';
COMMENT ON TABLE investor_matches IS 'AI-scored match results between founders and investors';
COMMENT ON TABLE investor_match_scores IS 'Per-dimension score breakdown for match transparency';
COMMENT ON COLUMN investors.raw_data IS 'Original CSV row preserved as JSONB for reference';
COMMENT ON COLUMN investor_matches.overall_score IS 'Weighted composite: stage 35% + sector 35% + size 30% + location bonus';
