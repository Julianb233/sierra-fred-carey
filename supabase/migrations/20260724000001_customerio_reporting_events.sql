-- Redacted Customer.io reporting-webhook evidence.
-- Stores provider event/campaign references and one-way identifier hashes only.
-- Raw payloads, recipients, message bodies, email addresses, and phone numbers
-- are deliberately excluded.

CREATE TABLE IF NOT EXISTS customerio_reporting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  object_type TEXT NOT NULL,
  metric TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  delivery_id_hash TEXT,
  subject_id_hash TEXT,
  campaign_id TEXT,
  action_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customerio_reporting_metric_time
  ON customerio_reporting_events(metric, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_customerio_reporting_campaign_time
  ON customerio_reporting_events(campaign_id, occurred_at DESC)
  WHERE campaign_id IS NOT NULL;

ALTER TABLE customerio_reporting_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_full_access_customerio_reporting_events"
    ON customerio_reporting_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE customerio_reporting_events IS
  'Redacted, idempotent Customer.io delivery evidence keyed by reporting event_id.';
