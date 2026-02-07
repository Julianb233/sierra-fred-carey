-- Migration 039: Investor Pipeline & Outreach Tables
-- Phase 20: Investor Targeting, Outreach & Pipeline (Plan 20-02)
-- Created: 2026-02-07
--
-- Creates 2 tables for outreach sequences and pipeline tracking.

-- ============================================================================
-- Table 1: investor_outreach_sequences
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors ON DELETE CASCADE,
  sequence_type TEXT NOT NULL DEFAULT 'cold', -- 'cold', 'warm_intro', 'follow_up'
  emails JSONB NOT NULL DEFAULT '[]', -- array of { subject, body, send_day, status }
  timing_notes TEXT, -- Fred's advice on when to send
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, investor_id, sequence_type)
);

-- ============================================================================
-- Table 2: investor_pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors ON DELETE CASCADE,
  match_id UUID REFERENCES investor_matches,
  stage TEXT NOT NULL DEFAULT 'identified', -- 'identified', 'contacted', 'meeting', 'due_diligence', 'term_sheet', 'committed', 'passed'
  notes TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, investor_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_user_investor
  ON investor_outreach_sequences(user_id, investor_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_user_stage
  ON investor_pipeline(user_id, stage);

CREATE INDEX IF NOT EXISTS idx_pipeline_user_investor
  ON investor_pipeline(user_id, investor_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE investor_outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_pipeline ENABLE ROW LEVEL SECURITY;

-- investor_outreach_sequences: users can only access their own sequences
DROP POLICY IF EXISTS "Users can view own outreach sequences" ON investor_outreach_sequences;
CREATE POLICY "Users can view own outreach sequences" ON investor_outreach_sequences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outreach sequences" ON investor_outreach_sequences;
CREATE POLICY "Users can insert own outreach sequences" ON investor_outreach_sequences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own outreach sequences" ON investor_outreach_sequences;
CREATE POLICY "Users can update own outreach sequences" ON investor_outreach_sequences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outreach sequences" ON investor_outreach_sequences;
CREATE POLICY "Users can delete own outreach sequences" ON investor_outreach_sequences
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access outreach sequences" ON investor_outreach_sequences;
CREATE POLICY "Service role full access outreach sequences" ON investor_outreach_sequences
  FOR ALL USING (auth.role() = 'service_role');

-- investor_pipeline: users can only access their own pipeline entries
DROP POLICY IF EXISTS "Users can view own pipeline entries" ON investor_pipeline;
CREATE POLICY "Users can view own pipeline entries" ON investor_pipeline
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pipeline entries" ON investor_pipeline;
CREATE POLICY "Users can insert own pipeline entries" ON investor_pipeline
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pipeline entries" ON investor_pipeline;
CREATE POLICY "Users can update own pipeline entries" ON investor_pipeline
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pipeline entries" ON investor_pipeline;
CREATE POLICY "Users can delete own pipeline entries" ON investor_pipeline
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access pipeline" ON investor_pipeline;
CREATE POLICY "Service role full access pipeline" ON investor_pipeline
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE investor_outreach_sequences IS 'AI-generated personalized email sequences for investor outreach';
COMMENT ON TABLE investor_pipeline IS 'CRM-lite pipeline tracking investors through conversation stages';
COMMENT ON COLUMN investor_outreach_sequences.sequence_type IS 'cold, warm_intro, or follow_up sequence type';
COMMENT ON COLUMN investor_outreach_sequences.emails IS 'JSON array of { subject, body, send_day, status } objects';
COMMENT ON COLUMN investor_pipeline.stage IS 'Pipeline stage: identified, contacted, meeting, due_diligence, term_sheet, committed, passed';
