-- Phase 76: Close-the-Loop — Feedback improvement tracking and digest preferences
-- Supports REQ-L1 (signal-to-improvement traceability) and REQ-L4 (opt-in notifications)

-- ============================================================================
-- Feedback improvements: links feedback signals to resolved improvements
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_type TEXT NOT NULL CHECK (improvement_type IN ('prompt_patch', 'bug_fix', 'feature')),
  title TEXT NOT NULL,
  description TEXT,
  patch_id UUID REFERENCES prompt_patches(id) ON DELETE SET NULL,
  insight_id UUID REFERENCES feedback_insights(id) ON DELETE SET NULL,
  signal_ids UUID[] NOT NULL DEFAULT '{}',
  user_ids UUID[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_improvements_resolved ON feedback_improvements(resolved_at);
CREATE INDEX IF NOT EXISTS idx_feedback_improvements_notified ON feedback_improvements(notified_at) WHERE notified_at IS NULL;

-- ============================================================================
-- Digest preferences: opt-in tracking for feedback digest notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_digest_preferences (
  user_id UUID PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE feedback_improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on feedback_improvements"
  ON feedback_improvements FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE feedback_digest_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on feedback_digest_preferences"
  ON feedback_digest_preferences FOR ALL
  USING (auth.role() = 'service_role');
