-- Feedback system data model
-- Three tables: feedback_sessions, feedback_signals, feedback_insights
-- Supports thumbs up/down, sentiment analysis, GDPR retention, tier weighting

-- ============================================================================
-- Table 1: feedback_sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'sms', 'whatsapp')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  sentiment_avg NUMERIC(3,2),
  sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'degrading', 'spike_negative')),
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 2: feedback_signals
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES feedback_sessions(id) ON DELETE SET NULL,
  message_id TEXT,
  channel TEXT NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'sms', 'whatsapp')),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('thumbs_up', 'thumbs_down', 'sentiment', 'implicit')),
  rating INTEGER CHECK (rating BETWEEN -1 AND 1),
  category TEXT CHECK (category IN ('irrelevant', 'incorrect', 'too_vague', 'too_long', 'wrong_tone', 'coaching_discomfort', 'helpful', 'other')),
  comment TEXT,
  sentiment_score NUMERIC(3,2),
  sentiment_confidence NUMERIC(3,2),
  user_tier TEXT NOT NULL DEFAULT 'free' CHECK (user_tier IN ('free', 'pro', 'studio')),
  weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 3: feedback_insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'cluster', 'trend', 'anomaly')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  signal_count INTEGER NOT NULL DEFAULT 0,
  signal_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'resolved', 'communicated')),
  linear_issue_id TEXT,
  actioned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_signals_user_id ON feedback_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_session_id ON feedback_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_created_at ON feedback_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_signal_type ON feedback_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_expires_at ON feedback_signals(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_user_id ON feedback_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sessions_flagged ON feedback_sessions(flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_feedback_insights_status ON feedback_insights(status);
CREATE INDEX IF NOT EXISTS idx_feedback_insights_severity ON feedback_insights(severity);

-- ============================================================================
-- RLS — feedback_sessions
-- ============================================================================

ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON feedback_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON feedback_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on feedback_sessions"
  ON feedback_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS — feedback_signals
-- ============================================================================

ALTER TABLE feedback_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signals"
  ON feedback_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signals"
  ON feedback_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on feedback_signals"
  ON feedback_signals FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS — feedback_insights (service-role only)
-- ============================================================================

ALTER TABLE feedback_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on feedback_insights"
  ON feedback_insights FOR ALL
  USING (auth.role() = 'service_role');
