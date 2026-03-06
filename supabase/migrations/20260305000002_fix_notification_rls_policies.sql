-- Migration: Fix notification_configs & notification_logs RLS policies
-- Linear: AI-1418
--
-- ROOT CAUSE: Same bug as journey_events/milestones (fixed in 20260305000001).
-- Migration 012 created RLS policies using current_setting('app.user_id', true)
-- but the application NEVER sets this PostgreSQL session variable.
-- Result: all user-scoped reads/writes are silently blocked by RLS.
--
-- FIX: Replace current_setting-based policies with auth.uid()::text
-- (cast needed because user_id is TEXT, auth.uid() returns UUID).

BEGIN;

-- ============================================================================
-- 1. Drop broken notification_configs user policies (current_setting-based)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can create own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can update own notification configs" ON notification_configs;
DROP POLICY IF EXISTS "Users can delete own notification configs" ON notification_configs;

-- ============================================================================
-- 2. Create correct notification_configs user policies (auth.uid()-based)
-- ============================================================================

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

-- ============================================================================
-- 3. Drop broken notification_logs user policy (current_setting-based)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;

-- ============================================================================
-- 4. Create correct notification_logs user policy (auth.uid()-based)
-- ============================================================================

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid()::text);

COMMIT;
