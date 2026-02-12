-- Phase 42: Multi-Channel FRED Access
-- Add channel column to fred_episodic_memory for cross-channel context tracking.
-- Defaults to 'chat' for all existing records.

-- Add channel column with default
ALTER TABLE fred_episodic_memory
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'chat';

-- Create index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_fred_episodic_memory_channel
  ON fred_episodic_memory (user_id, channel, created_at DESC);

-- Add comment
COMMENT ON COLUMN fred_episodic_memory.channel IS 'Communication channel: chat, voice, or sms';
