-- Migration: 036_red_flags
-- Description: Create fred_red_flags table for persisting detected business risks

CREATE TABLE IF NOT EXISTS fred_red_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('market', 'financial', 'team', 'product', 'legal', 'competitive')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  source_message_id UUID,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient dashboard queries (active flags per user)
CREATE INDEX IF NOT EXISTS idx_fred_red_flags_user_status ON fred_red_flags(user_id, status);

-- Enable Row Level Security
ALTER TABLE fred_red_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rows
CREATE POLICY "Users can select their own red flags"
  ON fred_red_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own red flags"
  ON fred_red_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own red flags"
  ON fred_red_flags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own red flags"
  ON fred_red_flags FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_fred_red_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fred_red_flags_updated_at
  BEFORE UPDATE ON fred_red_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_fred_red_flags_updated_at();
