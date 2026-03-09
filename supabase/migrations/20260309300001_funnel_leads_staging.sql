-- Funnel leads staging table
-- Persists data from the funnel (u.joinsahara.com) so it survives
-- browser storage clears and can be migrated when the user signs up
-- for the full Sahara platform.
--
-- Linear: AI-1903

CREATE TABLE IF NOT EXISTS funnel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Funnel session ID (from sessionStorage, NOT a Supabase auth session)
  session_id TEXT NOT NULL UNIQUE,

  -- Links to auth.users once the visitor signs up; NULL for anonymous leads
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Raw funnel data stored as JSONB for flexibility
  chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  journey_progress JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Migration tracking
  migrated BOOLEAN NOT NULL DEFAULT FALSE,
  migrated_at TIMESTAMPTZ,

  -- Metadata
  funnel_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_funnel_leads_session_id ON funnel_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_user_id ON funnel_leads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_leads_not_migrated ON funnel_leads(migrated) WHERE migrated = FALSE;

-- RLS
ALTER TABLE funnel_leads ENABLE ROW LEVEL SECURITY;

-- Service role has full access (migrations run server-side)
CREATE POLICY "Service role full access on funnel_leads"
  ON funnel_leads FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read their own linked leads
CREATE POLICY "Users can view their own funnel leads"
  ON funnel_leads FOR SELECT
  USING (auth.uid() = user_id);

-- Anonymous inserts allowed (funnel visitors aren't authenticated)
CREATE POLICY "Anon can insert funnel leads"
  ON funnel_leads FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_funnel_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER funnel_leads_updated_at
  BEFORE UPDATE ON funnel_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_funnel_leads_updated_at();
