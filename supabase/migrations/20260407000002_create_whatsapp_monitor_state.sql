-- Create whatsapp_monitor_state table for Trigger.dev WhatsApp monitor
-- Tracks last check timestamp per group to avoid duplicate message processing
-- Referenced by: trigger/sahara-whatsapp-monitor.ts

CREATE TABLE IF NOT EXISTS whatsapp_monitor_state (
  group_name    TEXT PRIMARY KEY,
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context_id    TEXT,
  error_count   INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  last_error_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (service role only — no client access needed)
ALTER TABLE whatsapp_monitor_state ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_whatsapp_monitor_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_monitor_state_updated_at
  BEFORE UPDATE ON whatsapp_monitor_state
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_monitor_state_updated_at();

COMMENT ON TABLE whatsapp_monitor_state IS 'Tracks WhatsApp monitor state per group for the Trigger.dev scheduled task';
