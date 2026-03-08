-- Phase 75: Add metadata column to ab_experiments for pre-registration storage
-- REQ-A3: Pre-registration template captures hypothesis, metrics, sample size

ALTER TABLE ab_experiments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN ab_experiments.metadata IS 'Stores pre-registration template, experiment context, and analysis parameters';
