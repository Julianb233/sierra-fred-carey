-- Migration: founder_reports table
-- Phase 91: Foundation Schema for v9.0 Founder Journey Report
-- Stores versioned AI-synthesized reports per founder

CREATE TABLE IF NOT EXISTS founder_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | generating | complete | failed
  report_data     JSONB NOT NULL DEFAULT '{}',
  step_snapshot   JSONB NOT NULL DEFAULT '{}',
  pdf_blob_url    TEXT,
  pdf_size_bytes  INTEGER,
  email_sent_at   TIMESTAMPTZ,
  email_status    TEXT,
  model_used      TEXT,
  generation_ms   INTEGER,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);

-- Index for fast lookup of latest report per user
CREATE INDEX IF NOT EXISTS idx_founder_reports_user_version
  ON founder_reports(user_id, version DESC);

-- Enable Row Level Security
ALTER TABLE founder_reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own reports
CREATE POLICY "Users read own reports"
  ON founder_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access for server-side writes
CREATE POLICY "Service role full access founder_reports"
  ON founder_reports FOR ALL
  USING (auth.role() = 'service_role');
