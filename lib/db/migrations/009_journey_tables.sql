-- Journey Tables Migration
-- Creates milestones and journey_events tables for the Journey Dashboard

-- ============================================
-- Milestones Table
-- ============================================

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('fundraising', 'product', 'team', 'growth', 'legal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),

  -- Dates
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Extensible metadata
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for milestones
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_category ON milestones(category);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_created_at ON milestones(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Journey Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Event details
  event_type TEXT NOT NULL,
  -- Common types: 'analysis_completed', 'milestone_achieved', 'insight_discovered',
  --               'score_improved', 'document_created', 'milestone_created'
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Score tracking (for score change events)
  score_before INTEGER,
  score_after INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for journey_events
CREATE INDEX IF NOT EXISTS idx_journey_events_user_id ON journey_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_event_type ON journey_events(event_type);
CREATE INDEX IF NOT EXISTS idx_journey_events_created_at ON journey_events(created_at);
CREATE INDEX IF NOT EXISTS idx_journey_events_user_created ON journey_events(user_id, created_at DESC);

-- ============================================
-- Add is_pinned column to ai_insights if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE ai_insights ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_ai_insights_pinned ON ai_insights(is_pinned);
  END IF;
END
$$;

-- ============================================
-- Stats View for Journey Dashboard
-- ============================================

CREATE OR REPLACE VIEW journey_stats AS
SELECT
  user_id,
  -- Milestone counts
  COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones,
  COUNT(*) FILTER (WHERE status = 'in_progress') as active_milestones,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_milestones,
  COUNT(*) as total_milestones,
  -- Streak calculation (consecutive days with activity)
  -- Simplified version - counts events in last 7 days
  (
    SELECT COUNT(DISTINCT DATE(created_at))
    FROM journey_events je
    WHERE je.user_id = m.user_id
      AND je.created_at > NOW() - INTERVAL '7 days'
  ) as activity_days_last_week
FROM milestones m
GROUP BY user_id;

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;

-- Milestone policies
CREATE POLICY "Users can view own milestones"
  ON milestones FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can create own milestones"
  ON milestones FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own milestones"
  ON milestones FOR UPDATE
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete own milestones"
  ON milestones FOR DELETE
  USING (user_id = current_setting('app.user_id', true));

-- Journey events policies
CREATE POLICY "Users can view own journey events"
  ON journey_events FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can create own journey events"
  ON journey_events FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE milestones IS 'Startup milestones tracked in Journey Dashboard';
COMMENT ON TABLE journey_events IS 'Unified timeline of all journey events';
COMMENT ON COLUMN milestones.category IS 'Categories: fundraising, product, team, growth, legal';
COMMENT ON COLUMN milestones.status IS 'Status: pending, in_progress, completed, skipped';
COMMENT ON COLUMN journey_events.event_type IS 'Event types: analysis_completed, milestone_achieved, insight_discovered, score_improved, document_created, milestone_created';
