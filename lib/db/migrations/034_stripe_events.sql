-- Migration 034: Stripe Events table
-- Stores processed webhook events for idempotency
-- Referenced by: lib/db/subscriptions.ts (recordStripeEvent, getStripeEventById, markEventAsProcessed)

-- ============================================================================
-- Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('processed', 'pending', 'failed')),
  payload JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Idempotency check: quickly find if event was already processed
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id
  ON stripe_events(stripe_event_id);

-- Filter by event type for debugging and analytics
CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON stripe_events(type);

-- Find events by customer for troubleshooting
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_customer_id
  ON stripe_events(stripe_customer_id);

-- Find pending/failed events for retry processing
CREATE INDEX IF NOT EXISTS idx_stripe_events_status
  ON stripe_events(status);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (webhook processing)
CREATE POLICY "service_role_full_access_stripe_events"
  ON stripe_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No authenticated user access -- stripe events are internal only
