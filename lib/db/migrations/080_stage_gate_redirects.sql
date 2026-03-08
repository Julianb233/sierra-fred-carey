-- Phase 80: Stage Gate Enforcement — redirect count persistence
-- Add JSONB column to track per-intent redirect counts
ALTER TABLE fred_conversation_state
  ADD COLUMN IF NOT EXISTS stage_gate_redirects jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN fred_conversation_state.stage_gate_redirects IS
  'Per-intent redirect counts for stage gate enforcement. Key format: "{stage}:{intent}" -> count';
