-- Enrich fred_audit_log with additional context columns for deeper analytics
-- These columns capture OASES stage, page context, IRS/Reality Lens scores, etc.

ALTER TABLE fred_audit_log
  ADD COLUMN IF NOT EXISTS oases_stage TEXT,
  ADD COLUMN IF NOT EXISTS startup_process_step TEXT,
  ADD COLUMN IF NOT EXISTS is_first_conversation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_persistent_memory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS detected_intent TEXT,
  ADD COLUMN IF NOT EXISTS active_mode TEXT,
  ADD COLUMN IF NOT EXISTS page_context TEXT,
  ADD COLUMN IF NOT EXISTS reality_lens_score FLOAT,
  ADD COLUMN IF NOT EXISTS irs_score FLOAT,
  ADD COLUMN IF NOT EXISTS tools_used TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
  ADD COLUMN IF NOT EXISTS wellness_alert_triggered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days');

-- Additional indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_fred_audit_oases_stage ON fred_audit_log(oases_stage) WHERE oases_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fred_audit_session ON fred_audit_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fred_audit_active_mode ON fred_audit_log(active_mode) WHERE active_mode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fred_audit_expires ON fred_audit_log(expires_at) WHERE expires_at IS NOT NULL;
