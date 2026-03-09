-- Enrich fred_audit_log with additional columns for deeper analytics.
-- NOTE: Most columns (oases_stage, detected_intent, active_mode, page_context,
-- reality_lens_score, irs_score, tools_used, wellness_alert_triggered, etc.)
-- are already defined in the CREATE TABLE migration (20260309000003).
-- This migration only adds the columns NOT present in the original schema.

ALTER TABLE fred_audit_log
  ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days');

-- Additional indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_fred_audit_oases_stage ON fred_audit_log(oases_stage) WHERE oases_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fred_audit_session ON fred_audit_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fred_audit_active_mode ON fred_audit_log(active_mode) WHERE active_mode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fred_audit_expires ON fred_audit_log(expires_at) WHERE expires_at IS NOT NULL;
