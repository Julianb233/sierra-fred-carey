-- Add missing indexes for next_steps query performance
-- Covers sorting by priority and by creation date per user

CREATE INDEX IF NOT EXISTS idx_next_steps_user_priority ON next_steps (user_id, priority);
CREATE INDEX IF NOT EXISTS idx_next_steps_user_created ON next_steps (user_id, created_at DESC);
