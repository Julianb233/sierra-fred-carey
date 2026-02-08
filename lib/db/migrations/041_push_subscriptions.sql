-- Migration 041: Push Subscriptions
-- Web push notification subscription storage for browser push notifications.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User can read their own subscriptions
CREATE POLICY push_subscriptions_select_own
  ON push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- User can insert their own subscriptions
CREATE POLICY push_subscriptions_insert_own
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- User can delete their own subscriptions
CREATE POLICY push_subscriptions_delete_own
  ON push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid()::TEXT);

-- Service role has full access (for background jobs, cleanup)
CREATE POLICY push_subscriptions_service_role
  ON push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();
