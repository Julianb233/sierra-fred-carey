-- Notification Configuration Migration
-- Creates notification_configs and notification_logs tables

-- ============================================
-- Notification Configs Table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Channel type
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'pagerduty', 'email')),

  -- Channel-specific configuration
  webhook_url TEXT, -- For Slack webhooks
  api_key TEXT, -- For PagerDuty API
  email_address TEXT, -- For email notifications
  routing_key TEXT, -- For PagerDuty routing

  -- Notification preferences
  enabled BOOLEAN NOT NULL DEFAULT true,
  alert_levels TEXT[] NOT NULL DEFAULT ARRAY['critical'], -- ['info', 'warning', 'critical']

  -- Metadata for channel-specific settings
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, channel)
);

-- Indexes for notification_configs
CREATE INDEX IF NOT EXISTS idx_notification_configs_user_id ON notification_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_channel ON notification_configs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_configs_enabled ON notification_configs(enabled);

-- Trigger for updated_at
CREATE TRIGGER update_notification_configs_updated_at
  BEFORE UPDATE ON notification_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Notification Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  config_id UUID REFERENCES notification_configs(id) ON DELETE CASCADE,

  -- Notification details
  channel TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  alert_type TEXT NOT NULL, -- 'performance', 'errors', 'traffic', 'significance'

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Metadata
  experiment_name TEXT,
  variant_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,

  -- Response tracking
  response_data JSONB,

  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_config_id ON notification_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Notification configs policies
CREATE POLICY "Users can view own notification configs"
  ON notification_configs FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can create own notification configs"
  ON notification_configs FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own notification configs"
  ON notification_configs FOR UPDATE
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete own notification configs"
  ON notification_configs FOR DELETE
  USING (user_id = current_setting('app.user_id', true));

-- Notification logs policies
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "System can create notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true); -- Allow system to create logs

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE notification_configs IS 'User notification channel configurations for alerts';
COMMENT ON TABLE notification_logs IS 'Audit log of all notifications sent';
COMMENT ON COLUMN notification_configs.channel IS 'Channel types: slack, pagerduty, email';
COMMENT ON COLUMN notification_configs.alert_levels IS 'Alert levels to notify for: info, warning, critical';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status: pending, sent, failed';
