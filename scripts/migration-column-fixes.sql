-- ============================================================================
-- Migration: Fix database column mismatches causing Fred AI latency (AI-1940)
-- ============================================================================
-- This migration adds missing columns that code references but never had
-- a migration for, and documents column name corrections applied in code.
-- ============================================================================

-- 1. Event registration columns (used by app/api/event/register/route.ts)
--    These columns are written during event registration but had no migration.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_eligible BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_source TEXT;

-- Indexes for event analytics queries that filter on event_source
CREATE INDEX IF NOT EXISTS idx_profiles_event_source
  ON profiles(event_source) WHERE event_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at
  ON profiles(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

COMMENT ON COLUMN profiles.event_source IS 'Event slug that drove this signup (e.g. "palo-alto-2026"). Set by event/register route.';
COMMENT ON COLUMN profiles.trial_ends_at IS 'When the event-triggered Pro trial expires. Set by event/register route.';
COMMENT ON COLUMN profiles.trial_eligible IS 'Whether user is eligible for an event trial. Set by event/register route.';
COMMENT ON COLUMN profiles.trial_source IS 'Source of the trial activation (e.g. "palo-alto-2026-event"). Set by event/register route.';

-- 2. Profile metadata column (used by wellbeing check-in and feedback consent routes)
--    Stores arbitrary JSONB metadata including wellbeing scores and consent timestamps.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.metadata IS 'Arbitrary metadata: wellbeing scores, feedback consent timestamps, etc.';

-- 3. Performance indexes for Fred AI chat context loading
--    These queries run on every chat message and benefit from targeted indexes.

-- fred_episodic_memory: the history route loads ALL episodes for a user to group by session.
-- A composite index on (user_id, created_at DESC) speeds up the ordered scan.
CREATE INDEX IF NOT EXISTS idx_fred_episodic_memory_user_created
  ON fred_episodic_memory(user_id, created_at DESC);

-- fred_episodic_memory: session detail lookups filter by user_id + session_id
CREATE INDEX IF NOT EXISTS idx_fred_episodic_memory_session
  ON fred_episodic_memory(user_id, session_id, created_at ASC);

-- fred_semantic_memory: context builder loads all facts ordered by category + updated_at
CREATE INDEX IF NOT EXISTS idx_fred_semantic_memory_user_category
  ON fred_semantic_memory(user_id, category, updated_at DESC);

-- reality_lens_analyses: chat route loads latest assessment per user
CREATE INDEX IF NOT EXISTS idx_reality_lens_analyses_user_created
  ON reality_lens_analyses(user_id, created_at DESC);

-- next_steps: chat route loads outstanding steps filtered by completed + dismissed
CREATE INDEX IF NOT EXISTS idx_next_steps_user_outstanding
  ON next_steps(user_id, created_at DESC)
  WHERE completed = false AND dismissed = false;

-- ============================================================================
-- COLUMN NAME CORRECTIONS (applied in code, documented here for reference)
-- ============================================================================
-- The following column name mismatches were fixed in application code:
--
-- 1. boardy/intro-prep/route.ts:
--    - startup_stage -> stage (profiles table uses "stage", not "startup_stage")
--    - sector -> industry (profiles table uses "industry", not "sector")
--
-- 2. admin/event-analytics/route.ts:
--    - fred_memories -> fred_episodic_memory (table was renamed/never existed as fred_memories)
--
-- 3. sms/daily-guidance.ts:
--    - profiles.phone -> user_sms_preferences.phone_number
--    - profiles.sms_notifications_enabled -> user_sms_preferences.checkin_enabled
--    (phone data lives in user_sms_preferences, not profiles)
--
-- 4. fred/history/route.ts + fred/export/route.ts:
--    - Replaced SELECT * with specific column lists to reduce payload size
--    - Excludes large embedding vectors from transfers
