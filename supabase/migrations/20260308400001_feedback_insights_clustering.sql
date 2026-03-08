-- Phase 74: Feedback Intelligence & Pattern Detection
-- Adds clustering metadata to feedback_insights and processing state to feedback_signals

-- Add clustering columns to feedback_insights
ALTER TABLE feedback_insights
  ADD COLUMN IF NOT EXISTS cluster_embedding_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_window_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_feedback_insights_cluster_hash
  ON feedback_insights(cluster_embedding_hash) WHERE cluster_embedding_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_insights_created_at
  ON feedback_insights(created_at);

-- Track processing state on signals for clustering job
ALTER TABLE feedback_signals
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'new';

-- Add check constraint separately (compatible with IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_signals_processing_status_check'
  ) THEN
    ALTER TABLE feedback_signals
      ADD CONSTRAINT feedback_signals_processing_status_check
      CHECK (processing_status IN ('new', 'processed', 'excluded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_signals_processing_status
  ON feedback_signals(processing_status) WHERE processing_status = 'new';
