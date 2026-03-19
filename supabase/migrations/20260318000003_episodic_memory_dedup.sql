-- Phase AI-2213: Add content_hash and channel columns to fred_episodic_memory
-- for deduplication and cross-channel tracking.
-- Also add a unique index to prevent duplicate episodes.

-- Add content_hash column for dedup (nullable for existing rows)
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'chat';

-- Composite index for dedup lookups
CREATE UNIQUE INDEX IF NOT EXISTS fred_episodic_dedup_idx
  ON fred_episodic_memory (user_id, session_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Index for channel-based queries
CREATE INDEX IF NOT EXISTS fred_episodic_channel_idx
  ON fred_episodic_memory (user_id, channel);
