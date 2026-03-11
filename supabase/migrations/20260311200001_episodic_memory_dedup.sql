-- Migration: Add content_hash column and unique constraint to fred_episodic_memory
-- Fixes duplicate episodes bug (AI-2210)
--
-- Strategy:
-- 1. Add a content_hash column for future dedup (NULL for existing rows)
-- 2. Remove existing duplicates by comparing actual content (keep earliest)
-- 3. Add unique index on content_hash (NULLs are exempt from uniqueness in PG)
-- 4. Going forward, TypeScript computes content_hash on insert

-- Step 1: Add content_hash column (nullable — existing rows stay NULL)
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Step 2: Delete existing duplicates by content identity, keeping the earliest row
DELETE FROM fred_episodic_memory
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, session_id, event_type, content::text
        ORDER BY created_at ASC
      ) AS rn
    FROM fred_episodic_memory
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add unique index for future dedup (only applies to non-NULL content_hash)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fred_episodic_memory_dedup
  ON fred_episodic_memory (user_id, session_id, content_hash)
  WHERE content_hash IS NOT NULL;
