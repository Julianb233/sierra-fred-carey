-- Migration: Add content_hash column and unique constraint to fred_episodic_memory
-- Fixes duplicate episodes bug (AI-2210)
--
-- Strategy:
-- 1. Add a content_hash column for deterministic dedup
-- 2. Backfill hashes for existing rows
-- 3. Remove existing duplicates (keep earliest)
-- 4. Add unique index to prevent future duplicates

-- Step 1: Add content_hash column
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Step 2: Backfill content_hash for existing rows
-- Hash is computed from event_type + content role + content text
UPDATE fred_episodic_memory
SET content_hash = md5(
  event_type || ':' ||
  COALESCE(content->>'role', '') || ':' ||
  COALESCE(content->>'content', content::text)
)
WHERE content_hash IS NULL;

-- Step 3: Delete duplicates, keeping the earliest row per (user_id, session_id, content_hash)
DELETE FROM fred_episodic_memory
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, session_id, content_hash
        ORDER BY created_at ASC
      ) AS rn
    FROM fred_episodic_memory
    WHERE content_hash IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 4: Add unique index for dedup constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_fred_episodic_memory_dedup
  ON fred_episodic_memory (user_id, session_id, content_hash);
