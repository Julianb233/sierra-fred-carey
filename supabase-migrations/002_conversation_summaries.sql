-- Migration: conversation_summaries (AI-3522)
-- Stores AI-generated summaries of each founder's recent conversation history.
-- Feeds two internal routines:
--   1. Prioritization — priority_score / sentiment surface who needs attention
--   2. Upselling — engagement_signals + upsell_* drive free -> paid nudges
--
-- Written by lib/ai/conversation-summarizer.ts (saveSummary) via the service
-- role; read by app/api/ai/conversation-summary and the daily cron.

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core summary
  headline TEXT NOT NULL DEFAULT '',
  key_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_focus TEXT NOT NULL DEFAULT '',
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment TEXT NOT NULL DEFAULT 'neutral',          -- positive|neutral|frustrated|at_risk
  priority_score INTEGER NOT NULL DEFAULT 1,          -- 1-10, higher = needs attention
  engagement_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  upsell JSONB NOT NULL DEFAULT '{}'::jsonb,           -- AI first-pass upsell read
  source_episodes INTEGER NOT NULL DEFAULT 0,

  -- Upsell engine output (denormalized for cheap filtering / dashboards)
  upsell_recommended BOOLEAN,
  upsell_target_tier INTEGER,                          -- UserTier enum (0-3)
  upsell_urgency TEXT,                                 -- none|low|medium|high
  upsell_confidence NUMERIC(4, 2),                     -- 0.00-1.00

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest-summary-per-user lookups + prioritization queries
CREATE INDEX IF NOT EXISTS idx_conv_summaries_user_created
  ON conversation_summaries (user_id, created_at DESC);

-- Prioritization queue: highest-priority, most-recent first
CREATE INDEX IF NOT EXISTS idx_conv_summaries_priority
  ON conversation_summaries (priority_score DESC, created_at DESC);

-- Upsell candidate scans
CREATE INDEX IF NOT EXISTS idx_conv_summaries_upsell
  ON conversation_summaries (upsell_recommended, upsell_confidence DESC)
  WHERE upsell_recommended = TRUE;

-- Row Level Security
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Users can read their own summaries
CREATE POLICY "Users can view own conversation summaries"
  ON conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (API + cron) has full access
CREATE POLICY "Service role full access conversation summaries"
  ON conversation_summaries FOR ALL
  USING (auth.role() = 'service_role');
