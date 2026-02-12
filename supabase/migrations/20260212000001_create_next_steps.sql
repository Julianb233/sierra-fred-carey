-- Phase 43: Next Steps Hub table
-- Stores actionable next steps extracted from FRED conversations.

CREATE TABLE IF NOT EXISTS next_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  why_it_matters TEXT,
  priority TEXT NOT NULL DEFAULT 'optional' CHECK (priority IN ('critical', 'important', 'optional')),
  source_conversation_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_next_steps_user_id ON next_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_next_steps_user_active ON next_steps(user_id, completed, dismissed);

-- RLS
ALTER TABLE next_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own next steps"
  ON next_steps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own next steps"
  ON next_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own next steps"
  ON next_steps FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for server-side operations
CREATE POLICY "Service role full access on next_steps"
  ON next_steps FOR ALL
  USING (auth.role() = 'service_role');
