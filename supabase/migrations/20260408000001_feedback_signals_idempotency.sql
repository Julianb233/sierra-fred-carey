-- AI-4120: Add idempotency guards to prevent duplicate feedback signal processing
--
-- Problem: If a task retries after partial completion, duplicate signals are created.
-- Solution: Add a unique index on (user_id, message_id, signal_type) for signals
-- that have a message_id, preventing exact duplicate submissions.
-- Sentiment signals (message_id IS NULL) are excluded since they are fire-and-forget
-- and naturally deduplicated by session aggregation.

-- Unique index: only one signal per user+message+type combination
-- Partial index excludes NULL message_id (sentiment auto-signals)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_signals_user_message_type_dedup
  ON feedback_signals(user_id, message_id, signal_type)
  WHERE message_id IS NOT NULL;

-- Index on message_id for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_feedback_signals_message_id
  ON feedback_signals(message_id)
  WHERE message_id IS NOT NULL;
