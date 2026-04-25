-- Add profiles.key_decisions text column so persistMemoryUpdates can store
-- chat-extracted "key_decisions" values for Free/Builder tier users
-- (Pro+ already persists via semantic memory).
--
-- Without this column, key_decisions extracted from conversation was silently
-- dropped for Free/Builder tier, causing FRED to re-ask the same question
-- every turn (one of the loop modes reported by Fred Cary).
--
-- See lib/fred/active-memory.ts PROFILE_COLUMN_MAP and the buildActiveFounderMemory
-- read block for the corresponding read path.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS key_decisions TEXT;

-- Continuity backfill: existing users had primary_constraint = NULL so FRED
-- couldn't read back their challenge after persistMemoryUpdates wrote it
-- there. Populate from semantic memory (richest source) first, then fall
-- back to challenges[0] jsonb. Without this, users would see FRED re-ask
-- "what's your biggest challenge?" on first interaction post-deploy.

UPDATE profiles p SET primary_constraint = sub.chal
FROM (
  SELECT DISTINCT ON (user_id) user_id, value->>'biggest_challenge' AS chal
  FROM fred_semantic_memory
  WHERE category='challenges' AND key='primary_challenge'
    AND value->>'biggest_challenge' IS NOT NULL
  ORDER BY user_id, updated_at DESC NULLS LAST
) sub
WHERE p.id = sub.user_id
  AND p.primary_constraint IS NULL
  AND sub.chal IS NOT NULL
  AND sub.chal <> '';

UPDATE profiles
SET primary_constraint = CASE
    WHEN jsonb_typeof(challenges->0) = 'object' THEN challenges->0->>'description'
    WHEN jsonb_typeof(challenges->0) = 'string' THEN challenges->>0
  END
WHERE primary_constraint IS NULL
  AND jsonb_array_length(COALESCE(challenges,'[]'::jsonb)) > 0
  AND CASE
    WHEN jsonb_typeof(challenges->0) = 'object' THEN challenges->0->>'description'
    WHEN jsonb_typeof(challenges->0) = 'string' THEN challenges->>0
  END IS NOT NULL;
