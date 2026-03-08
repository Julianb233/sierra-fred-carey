-- Oases progress tracking: records step completion within each stage
-- Depends on: 20260308000001 (oases_stage column on profiles)

CREATE TABLE IF NOT EXISTS oases_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('clarity', 'validation', 'build', 'launch', 'grow')),
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, stage, step_id)
);

ALTER TABLE oases_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own oases_progress"
  ON oases_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own oases_progress"
  ON oases_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own oases_progress"
  ON oases_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access oases_progress"
  ON oases_progress FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_oases_progress_user_stage
  ON oases_progress(user_id, stage);
