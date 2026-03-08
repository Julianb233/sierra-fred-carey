-- Phase 75: Link feedback signals to A/B test variants
-- Enables feedback-aware experiment metrics (REQ-A1, REQ-A2)

-- 1. Add variant_id FK column to feedback_signals
ALTER TABLE feedback_signals ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES ab_variants(id) ON DELETE SET NULL;

-- 2. Index for efficient variant-level feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_signals_variant_id ON feedback_signals(variant_id) WHERE variant_id IS NOT NULL;

-- 3. Index for efficient thumbs ratio computation per variant
CREATE INDEX IF NOT EXISTS idx_feedback_signals_variant_rating ON feedback_signals(variant_id, signal_type, rating) WHERE variant_id IS NOT NULL;

-- 4. Helper view for quick variant-level feedback summary
CREATE OR REPLACE VIEW variant_feedback_summary AS
SELECT
  fs.variant_id,
  v.variant_name,
  v.experiment_id,
  e.name as experiment_name,
  COUNT(*) FILTER (WHERE fs.signal_type IN ('thumbs_up', 'thumbs_down')) as total_feedback,
  COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_up') as thumbs_up_count,
  COUNT(*) FILTER (WHERE fs.signal_type = 'thumbs_down') as thumbs_down_count,
  AVG(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as avg_sentiment,
  STDDEV(fs.sentiment_score) FILTER (WHERE fs.sentiment_score IS NOT NULL) as sentiment_stddev,
  COUNT(DISTINCT fs.session_id) as total_sessions,
  COUNT(DISTINCT fs.session_id) FILTER (
    WHERE fs.session_id IN (
      SELECT id FROM feedback_sessions WHERE ended_at IS NOT NULL AND sentiment_trend != 'spike_negative'
    )
  ) as completed_sessions
FROM feedback_signals fs
JOIN ab_variants v ON fs.variant_id = v.id
JOIN ab_experiments e ON v.experiment_id = e.id
WHERE fs.variant_id IS NOT NULL
GROUP BY fs.variant_id, v.variant_name, v.experiment_id, e.name;
