-- Migration: Pitch Reviews
-- Phase 03: Pro Tier Features - Task 03-06
-- Created: 2026-02-05

-- Pitch deck review results table
CREATE TABLE IF NOT EXISTS pitch_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL,
  structure_score DECIMAL(5,2) NOT NULL,
  content_score DECIMAL(5,2) NOT NULL,
  slides JSONB NOT NULL,
  -- [{ pageNumber, type, typeConfidence, score, feedback, strengths, suggestions }]
  missing_sections TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pitch_reviews_user ON pitch_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_reviews_document ON pitch_reviews(document_id);
CREATE INDEX IF NOT EXISTS idx_pitch_reviews_created ON pitch_reviews(created_at DESC);

-- Comments
COMMENT ON TABLE pitch_reviews IS 'AI-powered pitch deck review results with slide-by-slide analysis';
COMMENT ON COLUMN pitch_reviews.slides IS 'Per-slide analysis: type classification, score, feedback, strengths, suggestions';
COMMENT ON COLUMN pitch_reviews.missing_sections IS 'Required slide types not found in the deck';
