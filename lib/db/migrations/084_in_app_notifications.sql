-- Migration 084: In-app notifications (AI-7368)
-- Founder-facing in-app notification store. Backs the milestone-reminder
-- fallback channel: every founder gets an in-app notification for milestone
-- reminders (cheap), while only paid-plan founders with a verified phone also
-- get a Twilio SMS.
--
-- Referenced by: lib/db/in-app-notifications.ts (createInAppNotification /
-- getUnreadInAppNotifications / markInAppNotificationRead),
-- lib/milestone-reminders/service.ts, app/api/notifications/in-app.
--
-- dedup_key gives cheap idempotency: the weekly milestone cron upserts with
-- ignoreDuplicates so re-runs in the same ISO week never double-notify (and
-- never double-text).

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Notification kind (e.g. 'milestone_reminder', 'system', 'digest')
  type TEXT NOT NULL DEFAULT 'system',

  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',

  -- Optional deep link into the app (e.g. '/dashboard/journey')
  link TEXT,

  -- Arbitrary structured payload (milestone ids, counts, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Idempotency key. When set, a UNIQUE constraint prevents duplicate inserts
  -- so cron re-runs are safe. NULL keys are always allowed (ad-hoc notices).
  dedup_key TEXT,

  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fast "my unread notifications, newest first"
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created
  ON in_app_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
  ON in_app_notifications(user_id)
  WHERE read_at IS NULL;

-- Idempotency: at most one row per non-null dedup_key
CREATE UNIQUE INDEX IF NOT EXISTS uq_in_app_notifications_dedup_key
  ON in_app_notifications(dedup_key)
  WHERE dedup_key IS NOT NULL;

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own in-app notifications" ON in_app_notifications;
CREATE POLICY "Users can view own in-app notifications"
  ON in_app_notifications FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS "Users can update own in-app notifications" ON in_app_notifications;
CREATE POLICY "Users can update own in-app notifications"
  ON in_app_notifications FOR UPDATE
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

-- Inserts are performed by the service role (cron / server), which bypasses RLS.

COMMENT ON TABLE in_app_notifications IS 'Founder-facing in-app notifications (AI-7368). Fallback channel for milestone reminders.';
COMMENT ON COLUMN in_app_notifications.dedup_key IS 'Optional idempotency key; UNIQUE when non-null so cron re-runs never duplicate.';
