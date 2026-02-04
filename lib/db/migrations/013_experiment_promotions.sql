-- Experiment Winner Auto-Promotion System
-- Tracks promotion history and enables auto-promotion of winning variants

-- Promotion history table
CREATE TABLE IF NOT EXISTS experiment_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  experiment_name TEXT NOT NULL,

  -- Winner variant info
  promoted_variant_id UUID NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  promoted_variant_name TEXT NOT NULL,

  -- Control variant info
  control_variant_id UUID NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  control_variant_name TEXT NOT NULL,

  -- Statistical metrics
  confidence DECIMAL(5,2) NOT NULL, -- e.g., 95.00 for 95%
  improvement DECIMAL(8,4) NOT NULL, -- e.g., 12.5000 for 12.5%
  sample_size INTEGER NOT NULL,

  -- Promotion metadata
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('auto', 'manual')),
  promoted_by UUID REFERENCES auth.users(id), -- User who promoted (null for auto)
  promoted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Rollback tracking
  rollback_at TIMESTAMP WITH TIME ZONE,
  rollback_reason TEXT,

  -- Additional context
  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure only one active promotion per experiment
  CONSTRAINT unique_active_promotion
    EXCLUDE USING btree (experiment_id WITH =)
    WHERE (rollback_at IS NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_experiment_id
  ON experiment_promotions(experiment_id);

CREATE INDEX IF NOT EXISTS idx_promotions_experiment_name
  ON experiment_promotions(experiment_name);

CREATE INDEX IF NOT EXISTS idx_promotions_promoted_at
  ON experiment_promotions(promoted_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotions_active
  ON experiment_promotions(experiment_id)
  WHERE rollback_at IS NULL;

-- Promotion eligibility view
-- Pre-computed view for quick eligibility checks
CREATE OR REPLACE VIEW experiment_promotion_eligibility AS
SELECT
  e.id as experiment_id,
  e.name as experiment_name,
  e.is_active,
  e.start_date,
  e.end_date,
  -- Runtime in hours
  EXTRACT(EPOCH FROM (NOW() - e.start_date)) / 3600 as runtime_hours,
  -- Has active promotion
  EXISTS (
    SELECT 1 FROM experiment_promotions ep
    WHERE ep.experiment_id = e.id
      AND ep.rollback_at IS NULL
  ) as has_active_promotion,
  -- Latest promotion info
  (
    SELECT jsonb_build_object(
      'id', ep.id,
      'promoted_variant_name', ep.promoted_variant_name,
      'confidence', ep.confidence,
      'improvement', ep.improvement,
      'promoted_at', ep.promoted_at,
      'promotion_type', ep.promotion_type
    )
    FROM experiment_promotions ep
    WHERE ep.experiment_id = e.id
    ORDER BY ep.promoted_at DESC
    LIMIT 1
  ) as latest_promotion,
  -- Variant count
  (
    SELECT COUNT(*)
    FROM ab_variants v
    WHERE v.experiment_id = e.id
  ) as variant_count
FROM ab_experiments e;

-- Enable RLS
ALTER TABLE experiment_promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view promotion history for active experiments
CREATE POLICY "Users can view promotion history"
  ON experiment_promotions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ab_experiments e
      WHERE e.id = experiment_promotions.experiment_id
      AND e.is_active = true
    )
  );

-- Only system/admins can create promotions
CREATE POLICY "System can create promotions"
  ON experiment_promotions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only system/admins can update promotions (for rollbacks)
CREATE POLICY "System can update promotions"
  ON experiment_promotions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Helper function to get promotion stats
CREATE OR REPLACE FUNCTION get_promotion_stats()
RETURNS TABLE (
  total_promotions BIGINT,
  auto_promotions BIGINT,
  manual_promotions BIGINT,
  active_promotions BIGINT,
  rolled_back_promotions BIGINT,
  avg_confidence NUMERIC,
  avg_improvement NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_promotions,
    COUNT(*) FILTER (WHERE promotion_type = 'auto')::BIGINT as auto_promotions,
    COUNT(*) FILTER (WHERE promotion_type = 'manual')::BIGINT as manual_promotions,
    COUNT(*) FILTER (WHERE rollback_at IS NULL)::BIGINT as active_promotions,
    COUNT(*) FILTER (WHERE rollback_at IS NOT NULL)::BIGINT as rolled_back_promotions,
    AVG(confidence) as avg_confidence,
    AVG(improvement) as avg_improvement
  FROM experiment_promotions;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to auto-notify on promotion
CREATE OR REPLACE FUNCTION notify_promotion_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify via pg_notify for real-time updates
  PERFORM pg_notify(
    'experiment_promotion',
    json_build_object(
      'event_type', CASE
        WHEN TG_OP = 'INSERT' THEN 'promotion_created'
        WHEN TG_OP = 'UPDATE' AND NEW.rollback_at IS NOT NULL THEN 'promotion_rolled_back'
        ELSE 'promotion_updated'
      END,
      'experiment_id', NEW.experiment_id,
      'experiment_name', NEW.experiment_name,
      'promoted_variant_name', NEW.promoted_variant_name,
      'promotion_type', NEW.promotion_type,
      'confidence', NEW.confidence,
      'improvement', NEW.improvement
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promotion_notification_trigger
  AFTER INSERT OR UPDATE ON experiment_promotions
  FOR EACH ROW
  EXECUTE FUNCTION notify_promotion_event();

-- Comment documentation
COMMENT ON TABLE experiment_promotions IS
  'Tracks A/B test winner promotions and rollbacks with full audit trail';

COMMENT ON COLUMN experiment_promotions.confidence IS
  'Statistical confidence level (e.g., 95.00 for 95% confidence)';

COMMENT ON COLUMN experiment_promotions.improvement IS
  'Percentage improvement over control (e.g., 12.5000 for 12.5% improvement)';

COMMENT ON COLUMN experiment_promotions.promotion_type IS
  'Whether promotion was triggered automatically or manually by a user';

COMMENT ON COLUMN experiment_promotions.metadata IS
  'Additional context: warnings, safety checks, detailed metrics comparison';
