-- Migration: User SMS Preferences
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06
--
-- User preferences for SMS check-in scheduling.
-- One row per user (user_id is the primary key).

CREATE TABLE IF NOT EXISTS user_sms_preferences (
  user_id UUID PRIMARY KEY,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  checkin_day INTEGER DEFAULT 1,
  checkin_hour INTEGER DEFAULT 9,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE user_sms_preferences IS 'User SMS check-in preferences (phone, timezone, schedule)';
COMMENT ON COLUMN user_sms_preferences.checkin_day IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN user_sms_preferences.checkin_hour IS 'Hour in user timezone (0-23, default 9am)';
COMMENT ON COLUMN user_sms_preferences.timezone IS 'IANA timezone identifier for scheduling';
