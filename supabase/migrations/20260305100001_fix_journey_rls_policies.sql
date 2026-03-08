-- Fix broken RLS policies for milestones and journey_events
-- Linear: PERS-52
--
-- ROOT CAUSE: Migration 009 created RLS policies using
--   current_setting('app.user_id', true)
-- but the application NEVER sets this PostgreSQL session variable.
-- Result: all user-scoped reads/writes are silently blocked by RLS.
--
-- FIX: Replace current_setting-based policies with auth.uid()::text
-- (cast needed because user_id is TEXT, auth.uid() returns UUID).
-- Also adds missing UPDATE/DELETE policies on journey_events.
--
-- Date: 2026-03-05

BEGIN;

-- ============================================================================
-- 1. Fix milestones RLS policies
-- ============================================================================

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

-- ============================================================================
-- 2. Fix journey_events RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can create own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can update own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can delete own journey events" ON journey_events;

CREATE POLICY "Users can view own journey events"
  ON journey_events FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create own journey events"
  ON journey_events FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own journey events"
  ON journey_events FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own journey events"
  ON journey_events FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================================================
-- 3. Add NOT NULL constraint on investor_readiness_scores.created_at
--    (has DEFAULT NOW() but was missing NOT NULL, allowing explicit NULL inserts)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE investor_readiness_scores
    ALTER COLUMN created_at SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;
