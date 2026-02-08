-- Phase 31-01: Email Engagement
-- Tracks sent emails for history, analytics, and idempotency.
-- Follows the RLS pattern from 044_push_notification_logs.sql.

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  email_subtype TEXT,
  week_number INTEGER,
  year INTEGER,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user + type lookups
CREATE INDEX idx_email_sends_user_type ON email_sends(user_id, email_type);

-- Index for digest idempotency checks (user + type + week + year)
CREATE INDEX idx_email_sends_week ON email_sends(user_id, email_type, week_number, year);

-- Index for time-based queries and cleanup
CREATE INDEX idx_email_sends_created ON email_sends(created_at);

-- Unique constraint to prevent duplicate weekly digests per user per week
CREATE UNIQUE INDEX idx_email_sends_digest_unique
  ON email_sends(user_id, email_type, week_number, year)
  WHERE email_type = 'weekly_digest';

-- RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Users can read their own email history
CREATE POLICY email_sends_select_own ON email_sends FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Service role has full access (for cron jobs and background operations)
CREATE POLICY email_sends_service_role ON email_sends FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
