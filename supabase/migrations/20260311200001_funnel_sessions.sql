-- Funnel Sessions staging table
-- Stores synced data from the funnel (u.joinsahara.com) before users sign up.
-- Data is migrated to full platform tables when the user creates an account.
-- Linear: AI-2276

CREATE TABLE IF NOT EXISTS funnel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL UNIQUE,
  chat_messages JSONB NOT NULL DEFAULT '[]',
  journey_progress JSONB NOT NULL DEFAULT '{}',
  funnel_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  migrated_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_funnel_sessions_session_id ON funnel_sessions(session_id);
CREATE INDEX idx_funnel_sessions_migrated ON funnel_sessions(migrated_to_user_id) WHERE migrated_to_user_id IS NOT NULL;
CREATE INDEX idx_funnel_sessions_pending ON funnel_sessions(created_at) WHERE migrated_to_user_id IS NULL;

-- RLS: service role only (no user auth in funnel)
ALTER TABLE funnel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on funnel_sessions"
  ON funnel_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_funnel_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER funnel_sessions_updated_at
  BEFORE UPDATE ON funnel_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_funnel_sessions_updated_at();
