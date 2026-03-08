-- AI-894: Fix duplicate episodes in Fred AI
-- Adds content_hash column and unique constraint to prevent duplicate episodic memories.
-- Also cleans up existing duplicates (keeps oldest row per duplicate group).

-- Step 1: Add content_hash column
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Step 2: Backfill content_hash for existing rows using MD5 of content JSONB
UPDATE fred_episodic_memory
SET content_hash = md5(content::text)
WHERE content_hash IS NULL;

-- Step 3: Remove existing duplicates (keep the earliest row per group)
DELETE FROM fred_episodic_memory
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, session_id, event_type, content_hash
             ORDER BY created_at ASC
           ) AS rn
    FROM fred_episodic_memory
  ) ranked
  WHERE rn > 1
);

-- Step 4: Create unique index for deduplication
-- Using a partial index (content_hash IS NOT NULL) so rows without hash aren't constrained
CREATE UNIQUE INDEX IF NOT EXISTS idx_fred_episodic_dedup
  ON fred_episodic_memory (user_id, session_id, event_type, content_hash)
  WHERE content_hash IS NOT NULL;

-- Step 5: content_hash stays nullable — the application always sets it,
-- and the partial index (WHERE content_hash IS NOT NULL) handles dedup correctly.
-- No DEFAULT needed: setting DEFAULT '' would cause all un-hashed rows to collide
-- on the unique index, breaking normal multi-message conversations.

COMMENT ON COLUMN fred_episodic_memory.content_hash IS 'MD5 hash of content JSONB for deduplication. Set by application, nullable for legacy rows.';
