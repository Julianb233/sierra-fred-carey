-- Migration 033: User Subscriptions table
-- Stores Stripe subscription data for tier determination
-- Referenced by: lib/db/subscriptions.ts (getUserSubscription, createOrUpdateSubscription)

-- ============================================================================
-- Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One subscription per user; enables ON CONFLICT (user_id) upsert in lib/db/subscriptions.ts
  CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id
  ON user_subscriptions(stripe_customer_id);

-- Webhook lookups by Stripe subscription ID
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id
  ON user_subscriptions(stripe_subscription_id);

-- Status filtering for active subscription queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions(status);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role has full access (webhooks, server-side operations)
CREATE POLICY "service_role_full_access_user_subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own subscription
CREATE POLICY "users_read_own_subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();
