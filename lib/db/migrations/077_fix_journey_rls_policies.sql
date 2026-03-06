-- Fix RLS policies on journey_events, milestones, and notification tables
--
-- Root cause: The original policies in 009_journey_tables.sql and
-- 012_notification_configs.sql used current_setting('app.user_id', true)
-- to match the user_id column. The Supabase JavaScript client authenticates
-- via JWT and exposes the user ID through auth.uid(), NOT through PostgreSQL
-- session variables. current_setting('app.user_id', true) always returns NULL
-- when called from the JS client, causing all user-scoped queries to silently
-- return zero rows.
--
-- The stats route (app/api/journey/stats/route.ts) uses createClient() which
-- goes through RLS, so all journey_events and milestones queries via that
-- route have been returning empty results.
--
-- Fix: Replace current_setting('app.user_id', true) with auth.uid()::text
-- (cast to text because user_id columns are TEXT, while auth.uid() returns UUID).
--
-- Related: Linear PERS-52 "Journey analyzer scores not saving properly"

BEGIN;

-- ============================================
-- Fix journey_events RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can create own journey events" ON journey_events;

CREATE POLICY "Users can view own journey events"
  ON journey_events FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create own journey events"
  ON journey_events FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- ============================================
-- Fix milestones RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can create own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;

CREATE POLICY "Users can view own milestones"
  ON milestones FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create own milestones"
  ON milestones FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own milestones"
  ON milestones FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own milestones"
  ON milestones FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================
-- Fix notification_configs RLS policies
-- (Same bug from 012_notification_configs.sql)
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
-- Fix notification_logs RLS policy
-- (Same bug from 012_notification_configs.sql)
-- ============================================

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid()::text);

COMMIT;
