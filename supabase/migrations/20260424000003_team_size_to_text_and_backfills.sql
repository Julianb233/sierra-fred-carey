-- AI-loop fix: align team_size column type with what onboarding actually
-- writes, and backfill chat memory fields from existing semantic memory.
--
-- Context (Apr 24 2026):
-- - profiles.team_size was INTEGER, but app/get-started/page.tsx and
--   app/api/onboard/route.ts always send strings ("solo", "2-5", "6-10",
--   "11-25", "25+"). Every onboarding write to team_size has been silently
--   failing in production (count(team_size) = 0 across all 92 users).
-- - persistMemoryUpdates() also writes the extracted string straight to the
--   column. That would have failed too the moment any user gave team-size
--   info in chat.
-- - Migrating to TEXT matches both write paths and the read paths (everything
--   already coerces to String for display).
--
-- - funding_history was empty for all users. fred_semantic_memory has 20
--   records under category=startup_facts/key=funding_stage from welcome
--   intake -- backfill from value->>'current_stage' so existing users see
--   continuity instead of FRED re-asking on next session.
--
-- - co_founder backfill is conditional: only fills where currently NULL.
--   No-ops if the column already has a value.

ALTER TABLE profiles ALTER COLUMN team_size TYPE TEXT USING team_size::text;

UPDATE profiles p SET funding_history = sub.val
FROM (
  SELECT DISTINCT ON (user_id) user_id, value->>'current_stage' AS val
  FROM fred_semantic_memory
  WHERE category='startup_facts' AND key='funding_stage'
    AND value->>'current_stage' IS NOT NULL
  ORDER BY user_id, updated_at DESC NULLS LAST
) sub
WHERE p.id = sub.user_id
  AND p.funding_history IS NULL
  AND sub.val IS NOT NULL
  AND sub.val <> '';

UPDATE profiles p SET co_founder = sub.val
FROM (
  SELECT DISTINCT ON (user_id) user_id, value->>'co_founder' AS val
  FROM fred_semantic_memory
  WHERE category='team_info' AND key='co_founder_status'
    AND value->>'co_founder' IS NOT NULL
  ORDER BY user_id, updated_at DESC NULLS LAST
) sub
WHERE p.id = sub.user_id
  AND p.co_founder IS NULL
  AND sub.val IS NOT NULL
  AND sub.val <> '';
