-- AI-4111: Add sender_role to feedback_signals for product owner weighting
-- Fred Cary's feedback gets 5x priority as product owner

ALTER TABLE feedback_signals
  ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'user';

-- Index for filtering by role (e.g., finding all product_owner feedback)
CREATE INDEX IF NOT EXISTS idx_feedback_signals_sender_role
  ON feedback_signals(sender_role);

COMMENT ON COLUMN feedback_signals.sender_role IS
  'Sender role: user (default), team, or product_owner. Product owner feedback is weighted 5x.';
