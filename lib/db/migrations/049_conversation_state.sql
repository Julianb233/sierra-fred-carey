-- ============================================================================
-- Migration 049: Conversation State Tracking
-- Phase 34: System Prompt Overhaul - Structured Mentoring State
--
-- Tracks where each founder is in the 9-Step Startup Process so FRED can
-- deliver step-appropriate mentoring. Replaces the rigid boolean columns
-- in startup_processes with flexible JSONB state per step.
--
-- Tables created:
--   1. fred_conversation_state  - one row per user, tracks current step + per-step status
--   2. fred_step_evidence       - evidence/facts established per step
-- ============================================================================

-- ============================================================================
-- 1. fred_conversation_state
--    One row per user. Tracks which step they're on and the status of each step.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fred_conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current position in the 9-step process
  current_step TEXT NOT NULL DEFAULT 'problem'
    CHECK (current_step IN (
      'problem', 'buyer', 'founder-edge', 'solution',
      'validation', 'gtm', 'execution', 'pilot', 'scale-decision'
    )),

  -- Per-step status as JSONB: { "problem": "validated", "buyer": "in_progress", ... }
  -- Each key maps to: not_started | in_progress | validated | skipped
  step_statuses JSONB NOT NULL DEFAULT '{
    "problem": "in_progress",
    "buyer": "not_started",
    "founder-edge": "not_started",
    "solution": "not_started",
    "validation": "not_started",
    "gtm": "not_started",
    "execution": "not_started",
    "pilot": "not_started",
    "scale-decision": "not_started"
  }'::jsonb,

  -- Overall process status
  process_status TEXT NOT NULL DEFAULT 'active'
    CHECK (process_status IN ('active', 'paused', 'completed', 'abandoned')),

  -- Blockers on the current step (FRED sets these when it detects issues)
  current_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Silent diagnostic tags (Section 5.2 of Operating Bible)
  -- Set during early messages: positioning_clarity, investor_readiness_signal, stage, primary_constraint
  diagnostic_tags JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Founder snapshot (Section 12 of Operating Bible)
  -- Canonical fields: stage, product_status, traction, runway, primary_constraint, ninety_day_goal
  founder_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Last step transition metadata
  last_transition_at TIMESTAMPTZ,
  last_transition_from TEXT,
  last_transition_to TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One conversation state per user
  UNIQUE(user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conv_state_user ON fred_conversation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_state_step ON fred_conversation_state(current_step);
CREATE INDEX IF NOT EXISTS idx_conv_state_status ON fred_conversation_state(process_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_conv_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conv_state_updated_at
  BEFORE UPDATE ON fred_conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_conv_state_updated_at();

-- ============================================================================
-- 2. fred_step_evidence
--    Evidence and facts established per step. Links back to semantic memory
--    where relevant. This is the structured record of "what FRED knows this
--    founder has proven at each step."
-- ============================================================================

CREATE TABLE IF NOT EXISTS fred_step_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which step this evidence relates to
  step TEXT NOT NULL
    CHECK (step IN (
      'problem', 'buyer', 'founder-edge', 'solution',
      'validation', 'gtm', 'execution', 'pilot', 'scale-decision'
    )),

  -- What kind of evidence this is
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN (
      'required_output',   -- The step's required deliverable (e.g., problem statement)
      'supporting_fact',   -- A fact that supports step completion
      'kill_signal',       -- A red flag / do-not-advance signal detected
      'blocker',           -- Something blocking step advancement
      'user_statement',    -- Direct quote or claim from the founder
      'validation_result'  -- Result from a validation exercise
    )),

  -- The evidence content
  content TEXT NOT NULL,

  -- Optional structured metadata (scores, dates, sources, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Optional link to a semantic memory fact
  semantic_memory_id UUID REFERENCES fred_semantic_memory(id) ON DELETE SET NULL,

  -- Confidence that this evidence is accurate/current (0-1)
  confidence FLOAT NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),

  -- Source of the evidence
  source TEXT NOT NULL DEFAULT 'conversation'
    CHECK (source IN ('conversation', 'document', 'inferred', 'user_confirmed')),

  -- Is this evidence still considered current/valid?
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_step_evidence_user ON fred_step_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_step_evidence_step ON fred_step_evidence(user_id, step);
CREATE INDEX IF NOT EXISTS idx_step_evidence_type ON fred_step_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_step_evidence_active ON fred_step_evidence(user_id, step, is_active)
  WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER trg_step_evidence_updated_at
  BEFORE UPDATE ON fred_step_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_conv_state_updated_at();

-- ============================================================================
-- 3. Helper view: Step summary per user
--    Gives a quick snapshot of each user's progress with evidence counts
-- ============================================================================

CREATE OR REPLACE VIEW fred_step_progress AS
SELECT
  cs.user_id,
  cs.current_step,
  cs.process_status,
  cs.step_statuses,
  cs.current_blockers,
  cs.updated_at as state_updated_at,
  COALESCE(ev.evidence_counts, '{}'::jsonb) as evidence_counts
FROM fred_conversation_state cs
LEFT JOIN LATERAL (
  SELECT jsonb_object_agg(step, cnt) as evidence_counts
  FROM (
    SELECT step, COUNT(*) as cnt
    FROM fred_step_evidence
    WHERE fred_step_evidence.user_id = cs.user_id
      AND is_active = true
    GROUP BY step
  ) sub
) ev ON true;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

-- fred_conversation_state RLS
ALTER TABLE fred_conversation_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own conversation state"
    ON fred_conversation_state FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own conversation state"
    ON fred_conversation_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own conversation state"
    ON fred_conversation_state FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own conversation state"
    ON fred_conversation_state FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages conversation state"
    ON fred_conversation_state FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- fred_step_evidence RLS
ALTER TABLE fred_step_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own step evidence"
    ON fred_step_evidence FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own step evidence"
    ON fred_step_evidence FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own step evidence"
    ON fred_step_evidence FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own step evidence"
    ON fred_step_evidence FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages step evidence"
    ON fred_step_evidence FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. Comments
-- ============================================================================

COMMENT ON TABLE fred_conversation_state IS
  'Tracks each founder''s position in the 9-Step Startup Process. One row per user. Used by FRED to deliver step-appropriate mentoring.';

COMMENT ON TABLE fred_step_evidence IS
  'Evidence and facts established per startup process step. Records what FRED has confirmed about each founder''s progress through the methodology.';

COMMENT ON VIEW fred_step_progress IS
  'Summary view joining conversation state with evidence counts per step for quick progress snapshots.';

COMMENT ON COLUMN fred_conversation_state.step_statuses IS
  'JSONB map of step_key -> status. Valid statuses: not_started, in_progress, validated, skipped.';

COMMENT ON COLUMN fred_conversation_state.current_blockers IS
  'Array of blocker strings on the current step. FRED populates these when it detects do-not-advance conditions.';

COMMENT ON COLUMN fred_conversation_state.diagnostic_tags IS
  'Silent diagnosis tags from early messages (Operating Bible 5.2): positioning_clarity (low/med/high), investor_readiness_signal (low/med/high), stage (idea/pre-seed/seed/growth), primary_constraint (demand/distribution/product_depth/execution/team/focus).';

COMMENT ON COLUMN fred_conversation_state.founder_snapshot IS
  'Founder context snapshot (Operating Bible 12): stage, product_status, traction, runway {time, money, energy}, primary_constraint, ninety_day_goal. Updated after check-ins and major changes.';

COMMENT ON COLUMN fred_step_evidence.evidence_type IS
  'Type of evidence: required_output (deliverable), supporting_fact, kill_signal (red flag), blocker, user_statement, validation_result.';
