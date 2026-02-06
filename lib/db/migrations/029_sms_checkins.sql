-- Migration: SMS Check-ins
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06

-- SMS check-in tracking with parent-child relationships
CREATE TABLE IF NOT EXISTS sms_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  message_sid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  parent_checkin_id UUID REFERENCES sms_checkins(id),
  accountability_score JSONB,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sms_checkins_user ON sms_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_week ON sms_checkins(year, week_number);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_phone ON sms_checkins(phone_number);

-- Comments
COMMENT ON TABLE sms_checkins IS 'Weekly SMS check-in messages with accountability scoring';
COMMENT ON COLUMN sms_checkins.message_sid IS 'Twilio message SID for delivery tracking';
COMMENT ON COLUMN sms_checkins.parent_checkin_id IS 'Links inbound responses to their outbound check-in';
COMMENT ON COLUMN sms_checkins.accountability_score IS 'AI-analyzed response quality and accountability metrics';
COMMENT ON COLUMN sms_checkins.week_number IS 'ISO week number for weekly grouping';
