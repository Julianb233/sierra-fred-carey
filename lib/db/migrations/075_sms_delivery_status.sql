-- Migration: SMS Delivery Status Tracking
-- Phase 61: Twilio SMS Activation - Plan 01
-- Created: 2026-02-19

-- Add delivery status columns to sms_checkins
ALTER TABLE sms_checkins ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE sms_checkins ADD COLUMN IF NOT EXISTS delivery_error_code TEXT;
ALTER TABLE sms_checkins ADD COLUMN IF NOT EXISTS delivery_error_message TEXT;
ALTER TABLE sms_checkins ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE sms_checkins ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Indexes for delivery status queries
CREATE INDEX IF NOT EXISTS idx_sms_checkins_status ON sms_checkins(status);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_delivery ON sms_checkins(delivery_status);

-- Add consent tracking to user_sms_preferences (needed by Task 2)
ALTER TABLE user_sms_preferences ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN sms_checkins.delivery_status IS 'Raw Twilio delivery status (delivered, undelivered, failed, etc.)';
COMMENT ON COLUMN sms_checkins.delivery_error_code IS 'Twilio error code when delivery fails';
COMMENT ON COLUMN sms_checkins.delivery_error_message IS 'Human-readable error message from Twilio';
COMMENT ON COLUMN sms_checkins.delivered_at IS 'Timestamp when message was confirmed delivered';
COMMENT ON COLUMN sms_checkins.status_updated_at IS 'Last time delivery status was updated by webhook';
COMMENT ON COLUMN user_sms_preferences.consent_at IS 'Timestamp when user explicitly consented to SMS';
