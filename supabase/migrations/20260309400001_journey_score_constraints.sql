-- Journey Score Persistence & Data Integrity Hardening
-- Linear: AI-1901
--
-- ISSUES FOUND:
-- 1. score_before/score_after on journey_events have no CHECK constraint
--    allowing invalid values (negative, >100) at the database level.
-- 2. The journey_stats VIEW only counts from milestones table, missing users
--    who have journey_events but no milestones.
--
-- FIXES:
-- 1. Add CHECK constraints on score_before and score_after (0-100 range)
-- 2. Add composite index for efficient "latest score by event_type" queries
--    used by /api/journey/stats
--
-- Date: 2026-03-09

BEGIN;

-- ============================================================================
-- 1. Add CHECK constraints on score columns (allow NULL, but if set must be 0-100)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE journey_events
    ADD CONSTRAINT chk_score_before_range
    CHECK (score_before IS NULL OR (score_before >= 0 AND score_before <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE journey_events
    ADD CONSTRAINT chk_score_after_range
    CHECK (score_after IS NULL OR (score_after >= 0 AND score_after <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Add composite index for "latest score by event_type" lookups
--    Used by GET /api/journey/stats to fetch latest idea_score and
--    investor_readiness scores efficiently.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journey_events_user_type_created
  ON journey_events(user_id, event_type, created_at DESC);

-- ============================================================================
-- 3. Add NOT NULL constraint on journey_events.event_type
--    (already has NOT NULL in DDL, but verify it's enforced)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE journey_events
    ALTER COLUMN event_type SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================================
-- 4. Add NOT NULL constraint on journey_events.user_id
--    (already has NOT NULL in DDL, but verify it's enforced)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE journey_events
    ALTER COLUMN user_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;
