-- ============================================================================
-- Migration 052: Wave 3 Schema — Reality Lens Gate + Diagnostic Mode Persistence
-- Phase 37: Reality Lens Gate & Decision Sequencing
-- Phase 38: Framework & Mode Integration
--
-- Adds 3 columns to fred_conversation_state:
--   1. reality_lens_gate  JSONB  — per-dimension validation status for 5 RL dimensions
--   2. active_mode        TEXT   — persists current diagnostic mode across messages
--   3. mode_context       JSONB  — signal history, introduction state, assessment tracking
--
-- Design rationale:
--   - The 9-step process and 5 Reality Lens dimensions are ORTHOGONAL concerns.
--     A founder can validate step 1 (problem) without fully validating "demand".
--     They need independent tracking structures.
--   - active_mode + mode_context replace the legacy diagnostic_states table (019)
--     which uses VARCHAR user_id. This consolidates into UUID-based state.
--   - reality_lens_gate is the CONVERSATIONAL gate (lightweight, updated during chat).
--     reality_lens_analyses (003) remains the FORMAL assessment (heavyweight, explicit).
-- ============================================================================

-- ============================================================================
-- 1. Add reality_lens_gate column
--    Tracks validation status of each Reality Lens dimension:
--    {
--      "feasibility":  { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
--      "economics":    { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
--      "demand":       { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
--      "distribution": { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
--      "timing":       { "status": "not_assessed", "blockers": [], "last_assessed_at": null }
--    }
--    Status values: not_assessed | assumed | weak | validated
-- ============================================================================

ALTER TABLE fred_conversation_state
  ADD COLUMN IF NOT EXISTS reality_lens_gate JSONB NOT NULL DEFAULT '{
    "feasibility":  { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
    "economics":    { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
    "demand":       { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
    "distribution": { "status": "not_assessed", "blockers": [], "last_assessed_at": null },
    "timing":       { "status": "not_assessed", "blockers": [], "last_assessed_at": null }
  }'::jsonb;

-- ============================================================================
-- 2. Add active_mode column
--    Persists the current diagnostic mode so FRED doesn't recompute from scratch.
--    Values match DiagnosticMode type in lib/ai/diagnostic-engine.ts:
--      founder-os | positioning | investor-readiness
-- ============================================================================

ALTER TABLE fred_conversation_state
  ADD COLUMN IF NOT EXISTS active_mode TEXT NOT NULL DEFAULT 'founder-os'
    CHECK (active_mode IN ('founder-os', 'positioning', 'investor-readiness'));

-- ============================================================================
-- 3. Add mode_context column
--    Stores diagnostic mode metadata:
--    {
--      "activated_at": "2026-01-15T...",
--      "activated_by": "signal_detected",
--      "introduction_state": {
--        "positioning": { "introduced": false, "introduced_at": null, "trigger": null },
--        "investor":    { "introduced": false, "introduced_at": null, "trigger": null }
--      },
--      "signal_history": [
--        { "signal": "icp_vague", "framework": "positioning", "detected_at": "...", "context": "..." }
--      ],
--      "formal_assessments": { "offered": false, "accepted": false }
--    }
--    NOTE: signal_history should be capped at 20 entries by the application layer.
-- ============================================================================

ALTER TABLE fred_conversation_state
  ADD COLUMN IF NOT EXISTS mode_context JSONB NOT NULL DEFAULT '{
    "activated_at": null,
    "activated_by": null,
    "introduction_state": {
      "positioning": { "introduced": false, "introduced_at": null, "trigger": null },
      "investor":    { "introduced": false, "introduced_at": null, "trigger": null }
    },
    "signal_history": [],
    "formal_assessments": { "offered": false, "accepted": false }
  }'::jsonb;

-- ============================================================================
-- Indexes for query performance
-- ============================================================================

-- Index on active_mode for filtering founders by current diagnostic mode
CREATE INDEX IF NOT EXISTS idx_conv_state_active_mode
  ON fred_conversation_state(active_mode);

-- GIN index on reality_lens_gate for JSONB queries
-- e.g., finding founders with weak feasibility: WHERE reality_lens_gate->'feasibility'->>'status' = 'weak'
CREATE INDEX IF NOT EXISTS idx_conv_state_rl_gate
  ON fred_conversation_state USING gin(reality_lens_gate);
