-- Migration: Strategy Documents
-- Phase 03: Pro Tier Features - Task 03-07
-- Created: 2026-02-05

-- Strategy documents table for AI-generated strategy documents
CREATE TABLE IF NOT EXISTS strategy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  -- Document type: executive_summary, market_analysis, 30_60_90_plan, competitive_analysis, gtm_plan
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  -- Full markdown content of the generated document
  content TEXT NOT NULL,
  -- Array of section objects: [{ title, content, wordCount }]
  sections JSONB NOT NULL DEFAULT '[]',
  -- Additional metadata: { wordCount, generatedAt, sectionCount }
  metadata JSONB DEFAULT '{}',
  -- Version number, incremented on each update
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_strategy_docs_user ON strategy_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_docs_type ON strategy_documents(type);
CREATE INDEX IF NOT EXISTS idx_strategy_docs_created ON strategy_documents(created_at DESC);

-- Comments
COMMENT ON TABLE strategy_documents IS 'AI-generated strategy documents (executive summaries, market analyses, etc.)';
COMMENT ON COLUMN strategy_documents.type IS 'Document type: executive_summary, market_analysis, 30_60_90_plan, competitive_analysis, gtm_plan';
COMMENT ON COLUMN strategy_documents.sections IS 'Array of generated sections with title, content, and wordCount';
COMMENT ON COLUMN strategy_documents.metadata IS 'Generation metadata including wordCount, generatedAt, sectionCount';
COMMENT ON COLUMN strategy_documents.version IS 'Document version, incremented on each update';
