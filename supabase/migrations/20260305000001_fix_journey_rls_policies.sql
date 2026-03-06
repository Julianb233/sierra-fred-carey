-- Migration: Fix journey_events & milestones RLS policies
-- Linear: AI-1418
--
-- ROOT CAUSE: Migration 009 created RLS policies using
--   current_setting('app.user_id', true)
-- but the application NEVER sets this PostgreSQL session variable.
-- Result: all user-scoped reads/writes are silently blocked by RLS.
--
-- FIX: Replace current_setting-based policies with auth.uid()::text
-- (cast needed because user_id is TEXT, auth.uid() returns UUID).
-- Also adds NOT NULL constraint on investor_readiness_scores.created_at.

BEGIN;

-- ============================================================================
-- 1. Drop broken journey_events user policies (current_setting-based)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own journey events" ON journey_events;
DROP POLICY IF EXISTS "Users can create own journey events" ON journey_events;

-- ============================================================================
-- 2. Create correct journey_events user policies (auth.uid()-based)
-- ============================================================================

CREATE POLICY "Users can view own journey events"
  ON journey_events FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create own journey events"
  ON journey_events FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- ============================================================================
-- 3. Drop broken milestones user policies (current_setting-based)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can create own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;

-- ============================================================================
-- 4. Create correct milestones user policies (auth.uid()-based)
-- ============================================================================

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
-- 5. Add NOT NULL constraint on investor_readiness_scores.created_at
--    (has DEFAULT NOW() but was missing NOT NULL, allowing explicit NULL inserts)
-- ============================================================================

ALTER TABLE investor_readiness_scores
  ALTER COLUMN created_at SET NOT NULL;

-- ============================================================================
-- 6. Add missing UPDATE/DELETE policies for journey_events
--    (only SELECT and INSERT existed; needed for future edit/cleanup features)
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY "Users can update own journey events"
    ON journey_events FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own journey events"
    ON journey_events FOR DELETE
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
