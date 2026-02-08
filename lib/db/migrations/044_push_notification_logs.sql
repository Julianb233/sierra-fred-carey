-- Phase 28-02: Push Notification Logs
-- Tracks sent push notifications for history and delivery analytics.

CREATE TABLE IF NOT EXISTS push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ
);

-- Index for user notification history (most recent first)
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_user_sent
  ON push_notification_logs (user_id, sent_at DESC);

-- RLS
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own notification logs
CREATE POLICY push_notification_logs_select_own
  ON push_notification_logs FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role can insert/update
CREATE POLICY push_notification_logs_service_all
  ON push_notification_logs FOR ALL
  USING (auth.role() = 'service_role');
