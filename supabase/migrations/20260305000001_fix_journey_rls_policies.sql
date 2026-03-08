-- Fix broken RLS policies for milestones and journey_events
-- Original policies used current_setting('app.user_id', true) which is never set by the app
-- Replacing with auth.uid()::text which works with Supabase Auth
-- Date: 2026-03-05

BEGIN;

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

-- Add missing UPDATE and DELETE policies
CREATE POLICY "Users can update own journey events"
  ON journey_events FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own journey events"
  ON journey_events FOR DELETE
  USING (user_id = auth.uid()::text);

COMMIT;
