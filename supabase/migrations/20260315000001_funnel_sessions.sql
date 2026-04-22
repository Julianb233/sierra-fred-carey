-- Funnel session data from u.joinsahara.com
-- Stores chat messages and journey progress for migration to full platform
-- Linear: AI-2228

CREATE TABLE IF NOT EXISTS funnel_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  chat_messages jsonb DEFAULT '[]'::jsonb,
  journey_progress jsonb DEFAULT '{}'::jsonb,
  funnel_version text DEFAULT '1.0',
  last_synced_at timestamptz DEFAULT now(),
  migrated_to_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index for lookup during migration
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_session_id ON funnel_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_migrated ON funnel_sessions(migrated_to_user_id) WHERE migrated_to_user_id IS NOT NULL;

-- Allow service role full access (no RLS needed — only server-side writes)
ALTER TABLE funnel_sessions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, but add a policy for read access during migration
CREATE POLICY "Users can read their migrated funnel data"
  ON funnel_sessions FOR SELECT
  USING (migrated_to_user_id = auth.uid());
