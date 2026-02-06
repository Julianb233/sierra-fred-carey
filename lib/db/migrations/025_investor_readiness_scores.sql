-- Migration: Investor Readiness Scores
-- Phase 03: Pro Tier Features - Task 03-02
-- Created: 2026-02-05

-- IRS assessments table
CREATE TABLE IF NOT EXISTS investor_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  category_scores JSONB NOT NULL,
  -- { team: {score: 75, ...}, market: {score: 80, ...}, ... }
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  -- [{ priority: 1, category: "team", action: "...", difficulty: "medium" }]
  source_documents UUID[] DEFAULT '{}',
  startup_context JSONB DEFAULT '{}',
  -- { name, stage, industry, etc. }
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_irs_user ON investor_readiness_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_irs_created ON investor_readiness_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_irs_score ON investor_readiness_scores(overall_score);

-- Comments
COMMENT ON TABLE investor_readiness_scores IS 'Investor readiness score assessments with 6-category breakdown';
COMMENT ON COLUMN investor_readiness_scores.category_scores IS 'Scores for team, market, product, traction, financials, pitch';
COMMENT ON COLUMN investor_readiness_scores.recommendations IS 'Prioritized recommendations for improvement';
