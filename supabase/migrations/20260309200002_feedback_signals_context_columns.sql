-- Enrich feedback_signals with context from the FRED interaction
-- so feedback can be correlated with specific topics, stages, and models.

ALTER TABLE feedback_signals
  ADD COLUMN IF NOT EXISTS detected_topic TEXT,
  ADD COLUMN IF NOT EXISTS oases_stage TEXT,
  ADD COLUMN IF NOT EXISTS model_used TEXT,
  ADD COLUMN IF NOT EXISTS response_latency_ms INT,
  ADD COLUMN IF NOT EXISTS page_context TEXT,
  ADD COLUMN IF NOT EXISTS audit_log_id UUID REFERENCES fred_audit_log(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_signals_audit ON feedback_signals(audit_log_id) WHERE audit_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_signals_topic ON feedback_signals(detected_topic) WHERE detected_topic IS NOT NULL;
