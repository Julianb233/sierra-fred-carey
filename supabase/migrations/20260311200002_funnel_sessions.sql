-- Funnel session storage for u.joinsahara.com
-- Stores anonymous chat messages and journey progress for later migration
-- to full platform accounts.

CREATE TABLE IF NOT EXISTS funnel_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  chat_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  journey_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  funnel_version TEXT NOT NULL DEFAULT '1.0',
  message_count INTEGER NOT NULL DEFAULT 0,
  migrated_to_user_id UUID REFERENCES auth.users(id),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for finding sessions to migrate
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_unmigrated
  ON funnel_sessions (created_at DESC)
  WHERE migrated_to_user_id IS NULL;

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_session_id
  ON funnel_sessions (session_id);

-- RLS: service role only (no user auth on funnel)
ALTER TABLE funnel_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API route uses service client)
CREATE POLICY funnel_sessions_service_all ON funnel_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
