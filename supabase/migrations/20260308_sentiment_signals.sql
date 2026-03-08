-- Phase 83: Founder Mindset Monitor — sentiment_signals table
-- Stores per-message sentiment signals for stress pattern detection

CREATE TABLE IF NOT EXISTS sentiment_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id text,
  label text NOT NULL CHECK (label IN ('positive','neutral','negative','frustrated')),
  confidence real NOT NULL DEFAULT 0,
  stress_level real NOT NULL DEFAULT 0,
  topics text[],
  intervention_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_signals_user_time ON sentiment_signals(user_id, created_at DESC);

ALTER TABLE sentiment_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own signals" ON sentiment_signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service inserts signals" ON sentiment_signals FOR INSERT WITH CHECK (true);
