-- Structured goal sets by funding stage
-- Stores personalized goal roadmaps generated after onboarding.
-- Linear: AI-1283

CREATE TABLE IF NOT EXISTS founder_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'strategy' CHECK (category IN ('validation', 'product', 'growth', 'fundraising', 'strategy')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_founder_goals_user_id ON founder_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_goals_user_active ON founder_goals(user_id, completed);

-- RLS
ALTER TABLE founder_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON founder_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON founder_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON founder_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on founder_goals"
  ON founder_goals FOR ALL
  USING (auth.role() = 'service_role');
