-- Performance indexes for Phase 74: Intelligence & Pattern Detection
-- Supports: daily clustering job queries, top-issues dashboard, dedup checks

-- Index for getRecentNegativeSignals: filter by created_at + negative rating/sentiment
CREATE INDEX IF NOT EXISTS idx_feedback_signals_negative_recent
  ON feedback_signals (created_at DESC)
  WHERE rating = -1 OR sentiment_score < -0.3;

-- Index for getOpenInsights: filter by status + order by created_at
CREATE INDEX IF NOT EXISTS idx_feedback_insights_open_status
  ON feedback_insights (status, created_at DESC)
  WHERE status IN ('new', 'reviewed', 'actioned');

-- Index for getTopInsightsThisWeek: filter by created_at + order by signal_count
CREATE INDEX IF NOT EXISTS idx_feedback_insights_weekly_top
  ON feedback_insights (created_at DESC, signal_count DESC);

-- Index for dedup: category + recent created_at on open insights
CREATE INDEX IF NOT EXISTS idx_feedback_insights_category_recent
  ON feedback_insights (category, created_at DESC)
  WHERE status IN ('new', 'reviewed', 'actioned');
