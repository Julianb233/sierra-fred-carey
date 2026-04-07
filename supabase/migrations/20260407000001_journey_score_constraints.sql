-- Add CHECK constraints on journey_events score columns
--
-- Ensures score_before and score_after are in valid range [0, 100]
-- when not null. These columns are intentionally nullable because
-- not all event types carry scores.
--
-- Also adds UPDATE/DELETE RLS policies on journey_events that were
-- missing from both the original migration (009) and the RLS fix (077).
--
-- Linear: AI-909

BEGIN;

-- ============================================
-- Score range constraints
-- ============================================

ALTER TABLE journey_events
  ADD CONSTRAINT journey_events_score_before_range
  CHECK (score_before IS NULL OR (score_before >= 0 AND score_before <= 100));

ALTER TABLE journey_events
  ADD CONSTRAINT journey_events_score_after_range
  CHECK (score_after IS NULL OR (score_after >= 0 AND score_after <= 100));

-- ============================================
-- Missing RLS policies: UPDATE and DELETE on journey_events
-- Migration 077 added these for milestones but not journey_events
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'journey_events'
      AND policyname = 'Users can update own journey events'
  ) THEN
    CREATE POLICY "Users can update own journey events"
      ON journey_events FOR UPDATE
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'journey_events'
      AND policyname = 'Users can delete own journey events'
  ) THEN
    CREATE POLICY "Users can delete own journey events"
      ON journey_events FOR DELETE
      USING (user_id = auth.uid()::text);
  END IF;
END
$$;

COMMIT;
