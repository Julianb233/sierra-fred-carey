-- Migration 083: Daily free-plan throttle index (AI-6486)
-- Builds on migration 082 (usage_records). Daily throttling counts a user's
-- actions of a given type since the start of the UTC day — this composite index
-- makes that per-(user, action) daily count a fast range scan instead of a
-- filter over the user's whole history.
--
-- Referenced by: lib/db/usage.ts (getActionCountToday / getActionCountsToday /
-- getDailyThrottleStatus / checkDailyAction), app/api/usage/throttle,
-- app/api/usage/track, lib/usage/throttle.ts.
--
-- No new tables or columns: daily throttling reuses usage_records.action_type
-- and usage_records.created_at recorded by the AI-6487 foundation.

CREATE INDEX IF NOT EXISTS idx_usage_records_user_action_created
  ON usage_records(user_id, action_type, created_at DESC);
