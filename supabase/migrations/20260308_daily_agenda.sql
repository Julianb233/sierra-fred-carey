-- Phase 84: Daily Mentor Guidance
-- Stores AI-generated daily agendas per user per day

CREATE TABLE IF NOT EXISTS daily_agendas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tasks jsonb NOT NULL DEFAULT '[]',
  completed_tasks text[] DEFAULT '{}',
  oases_stage text,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_agendas_user_date ON daily_agendas(user_id, date DESC);

ALTER TABLE daily_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own agendas" ON daily_agendas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service manages agendas" ON daily_agendas FOR ALL USING (true);
