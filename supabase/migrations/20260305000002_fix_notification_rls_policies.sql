-- Fix broken RLS policies for notification_configs and notification_logs
-- Original policies used current_setting('app.user_id', true) which is never set by the app
-- Replacing with auth.uid()::text which works with Supabase Auth
-- Date: 2026-03-05

BEGIN;

-- ============================================
-- Fix notification_configs RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can create own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can update own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can delete own notification configs" ON notification_configs;

CREATE POLICY "Users can view own notification configs"
  ON notification_configs FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create own notification configs"
  ON notification_configs FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own notification configs"
  ON notification_configs FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own notification configs"
  ON notification_configs FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================
-- Fix notification_logs RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid()::text);

-- Keep existing system INSERT policy (allows service to create logs)
-- "System can create notification logs" WITH CHECK (true) remains unchanged

COMMIT;
