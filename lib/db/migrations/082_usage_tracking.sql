-- Migration 082: Internal token/credit usage tracking (AI-6487)
-- Underpins throttling + tiered pricing and the VC success metrics Fred outlined:
--   - users spending 10+ minutes per session
--   - users returning within 48 hours
-- Referenced by: lib/db/usage.ts, lib/usage/credits.ts, app/api/usage/*, app/api/admin/usage

-- ============================================================================
-- usage_records — one row per credit-consuming user action
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_consumed INTEGER NOT NULL DEFAULT 0 CHECK (credits_consumed >= 0),
  -- Optional context: model, token counts, related entity id, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-user period rollups (remaining-credit checks) — the hot path.
CREATE INDEX IF NOT EXISTS idx_usage_records_user_created
  ON usage_records(user_id, created_at DESC);

-- Aggregations by action type (admin breakdowns).
CREATE INDEX IF NOT EXISTS idx_usage_records_action
  ON usage_records(action_type);

-- ============================================================================
-- usage_sessions — session-duration + return-frequency tracking
-- A session is opened on first activity and "touched" on each subsequent
-- action; duration_seconds is maintained from started_at..last_activity_at.
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Find the user's currently-open session quickly (heartbeat path).
CREATE INDEX IF NOT EXISTS idx_usage_sessions_user_open
  ON usage_sessions(user_id, last_activity_at DESC);

-- Return-within-48h metric scans by start time.
CREATE INDEX IF NOT EXISTS idx_usage_sessions_user_started
  ON usage_sessions(user_id, started_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;

-- Service role has full access (server-side recording + admin aggregation).
CREATE POLICY "service_role_full_access_usage_records"
  ON usage_records FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_usage_sessions"
  ON usage_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read their own usage (history / remaining credits UI).
CREATE POLICY "users_read_own_usage_records"
  ON usage_records FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_usage_sessions"
  ON usage_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
