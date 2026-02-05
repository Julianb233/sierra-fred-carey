-- FRED Calibration Records Schema
-- Tracks predicted scores vs actual outcomes for calibration measurement
-- Part of Plan 01-03: 7-Factor Scoring Engine

-- ============================================================================
-- Calibration Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS fred_calibration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  decision_id UUID NOT NULL REFERENCES fred_decision_log(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prediction data
  predicted_score DECIMAL(4, 3) NOT NULL CHECK (predicted_score >= 0 AND predicted_score <= 1),
  predicted_confidence DECIMAL(4, 3) NOT NULL CHECK (predicted_confidence >= 0 AND predicted_confidence <= 1),
  predicted_range DECIMAL(4, 3)[] NOT NULL, -- [low, high] uncertainty bounds
  decision_type TEXT NOT NULL,
  factors JSONB NOT NULL, -- Full FactorScores object

  -- Outcome data (null until recorded)
  actual_outcome DECIMAL(4, 3) CHECK (actual_outcome IS NULL OR (actual_outcome >= 0 AND actual_outcome <= 1)),
  outcome_notes TEXT,

  -- Timestamps
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome_recorded_at TIMESTAMPTZ,

  -- Ensure outcome timestamp only set when outcome recorded
  CONSTRAINT outcome_timestamp_check CHECK (
    (actual_outcome IS NULL AND outcome_recorded_at IS NULL) OR
    (actual_outcome IS NOT NULL AND outcome_recorded_at IS NOT NULL)
  )
);

-- ============================================================================
-- Indexes for Calibration Queries
-- ============================================================================

-- Query by user
CREATE INDEX idx_calibration_user_id ON fred_calibration_records(user_id);

-- Query by decision
CREATE INDEX idx_calibration_decision_id ON fred_calibration_records(decision_id);

-- Query outcomes for metrics (filter to only records with outcomes)
CREATE INDEX idx_calibration_with_outcomes ON fred_calibration_records(actual_outcome)
  WHERE actual_outcome IS NOT NULL;

-- Query by decision type for type-specific calibration
CREATE INDEX idx_calibration_type ON fred_calibration_records(decision_type);

-- Query recent predictions
CREATE INDEX idx_calibration_predicted_at ON fred_calibration_records(predicted_at DESC);

-- Query pending outcomes (predictions without outcomes)
CREATE INDEX idx_calibration_pending ON fred_calibration_records(user_id, predicted_at)
  WHERE actual_outcome IS NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE fred_calibration_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own calibration records
CREATE POLICY "Users can view own calibration records"
  ON fred_calibration_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert calibration records
CREATE POLICY "Service role can insert calibration records"
  ON fred_calibration_records
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own records (for recording outcomes)
CREATE POLICY "Users can update own calibration records"
  ON fred_calibration_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Aggregate Views for Calibration Metrics
-- ============================================================================

-- View for overall calibration metrics
CREATE OR REPLACE VIEW fred_calibration_metrics AS
SELECT
  COUNT(*) as total_predictions,
  COUNT(actual_outcome) as predictions_with_outcomes,
  AVG(CASE WHEN actual_outcome IS NOT NULL
      THEN POWER(predicted_score - actual_outcome, 2)
      ELSE NULL END) as brier_score,
  AVG(CASE WHEN actual_outcome IS NOT NULL
      THEN ABS(predicted_score - actual_outcome)
      ELSE NULL END) as mean_absolute_error,
  AVG(CASE WHEN actual_outcome IS NOT NULL
      AND actual_outcome >= predicted_range[1]
      AND actual_outcome <= predicted_range[2]
      THEN 1 ELSE 0 END) as within_range_rate
FROM fred_calibration_records;

-- View for calibration by decision type
CREATE OR REPLACE VIEW fred_calibration_by_type AS
SELECT
  decision_type,
  COUNT(*) as total_predictions,
  COUNT(actual_outcome) as predictions_with_outcomes,
  AVG(CASE WHEN actual_outcome IS NOT NULL
      THEN POWER(predicted_score - actual_outcome, 2)
      ELSE NULL END) as brier_score,
  AVG(CASE WHEN actual_outcome IS NOT NULL
      THEN ABS(predicted_score - actual_outcome)
      ELSE NULL END) as mean_absolute_error
FROM fred_calibration_records
GROUP BY decision_type;

-- ============================================================================
-- Helper Function: Request Outcome Recording
-- ============================================================================

-- Function to get predictions that need outcome recording
CREATE OR REPLACE FUNCTION get_pending_outcomes(
  p_user_id UUID,
  p_days_old INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  decision_id UUID,
  predicted_score DECIMAL,
  predicted_confidence DECIMAL,
  decision_type TEXT,
  predicted_at TIMESTAMPTZ,
  days_since_prediction INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.decision_id,
    cr.predicted_score,
    cr.predicted_confidence,
    cr.decision_type,
    cr.predicted_at,
    (CURRENT_DATE - cr.predicted_at::DATE) as days_since_prediction
  FROM fred_calibration_records cr
  WHERE cr.user_id = p_user_id
    AND cr.actual_outcome IS NULL
    AND cr.predicted_at < NOW() - (p_days_old || ' days')::INTERVAL
  ORDER BY cr.predicted_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Validate Factors JSON
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_calibration_factors()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure factors contains required keys
  IF NOT (
    NEW.factors ? 'strategicAlignment' AND
    NEW.factors ? 'leverage' AND
    NEW.factors ? 'speed' AND
    NEW.factors ? 'revenue' AND
    NEW.factors ? 'time' AND
    NEW.factors ? 'risk' AND
    NEW.factors ? 'relationships'
  ) THEN
    RAISE EXCEPTION 'factors must contain all 7 factor scores';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calibration_factors_validation
  BEFORE INSERT OR UPDATE ON fred_calibration_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_calibration_factors();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE fred_calibration_records IS 'Tracks FRED scoring predictions and actual outcomes for calibration measurement';
COMMENT ON COLUMN fred_calibration_records.predicted_score IS 'Predicted composite score (0-1)';
COMMENT ON COLUMN fred_calibration_records.predicted_confidence IS 'Model confidence in prediction (0-1)';
COMMENT ON COLUMN fred_calibration_records.predicted_range IS 'Uncertainty range [low, high]';
COMMENT ON COLUMN fred_calibration_records.actual_outcome IS 'Actual outcome rating (0-1), null until recorded';
COMMENT ON VIEW fred_calibration_metrics IS 'Aggregate calibration metrics across all predictions';
COMMENT ON VIEW fred_calibration_by_type IS 'Calibration metrics broken down by decision type';
