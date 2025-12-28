-- Migration: AB Test Auto-Promotion Audit Log
-- Creates table for tracking experiment promotions and rollbacks
-- with comprehensive audit trail

CREATE TABLE IF NOT EXISTS ab_promotion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Experiment reference
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  experiment_name TEXT NOT NULL,

  -- Variant information
  winning_variant_id UUID NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  winning_variant_name TEXT NOT NULL,
  previous_winner_id UUID REFERENCES ab_variants(id) ON DELETE SET NULL,

  -- Action tracking
  action TEXT NOT NULL CHECK (action IN ('promoted', 'rolled_back', 'promotion_attempted')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('auto', 'manual')),
  user_id TEXT,

  -- Statistical data
  confidence_level NUMERIC(5, 2), -- e.g., 95.00, 99.90
  improvement NUMERIC(10, 6), -- Relative improvement (e.g., 0.05 = 5%)
  sample_size INTEGER,

  -- Safety checks (JSON array of check results)
  safety_checks_json JSONB,

  -- Reasoning and notes
  reason TEXT NOT NULL,

  -- Timestamps
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_ab_promotion_experiment ON ab_promotion_audit_log(experiment_id);
CREATE INDEX idx_ab_promotion_experiment_name ON ab_promotion_audit_log(experiment_name);
CREATE INDEX idx_ab_promotion_winning_variant ON ab_promotion_audit_log(winning_variant_id);
CREATE INDEX idx_ab_promotion_action ON ab_promotion_audit_log(action);
CREATE INDEX idx_ab_promotion_timestamp ON ab_promotion_audit_log(promoted_at DESC);
CREATE INDEX idx_ab_promotion_active ON ab_promotion_audit_log(experiment_id, promoted_at DESC)
  WHERE rolled_back_at IS NULL;

-- Index for safety checks JSON queries
CREATE INDEX idx_ab_promotion_safety_checks ON ab_promotion_audit_log USING GIN(safety_checks_json);

-- Comments for documentation
COMMENT ON TABLE ab_promotion_audit_log IS 'Audit trail for A/B test variant promotions and rollbacks';
COMMENT ON COLUMN ab_promotion_audit_log.action IS 'Type of action: promoted, rolled_back, or promotion_attempted';
COMMENT ON COLUMN ab_promotion_audit_log.triggered_by IS 'Whether promotion was triggered automatically or manually';
COMMENT ON COLUMN ab_promotion_audit_log.confidence_level IS 'Statistical confidence level at time of promotion (e.g., 95.00 for 95%)';
COMMENT ON COLUMN ab_promotion_audit_log.improvement IS 'Relative improvement over control (e.g., 0.05 = 5% improvement)';
COMMENT ON COLUMN ab_promotion_audit_log.safety_checks_json IS 'JSON array of safety check results at promotion time';
COMMENT ON COLUMN ab_promotion_audit_log.rolled_back_at IS 'Timestamp when promotion was rolled back (NULL if still active)';
