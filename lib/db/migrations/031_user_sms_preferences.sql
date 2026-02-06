-- Migration: User SMS Preferences
-- Phase 04: Studio Tier Features
-- Created: 2026-02-06
--
-- Stores per-user SMS check-in preferences including phone number,
-- verification status, schedule, and timezone.
-- One row per user (user_id is the primary key).

CREATE TABLE IF NOT EXISTS user_sms_preferences (
  user_id UUID PRIMARY KEY,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  checkin_day INTEGER DEFAULT 1
    CHECK (checkin_day >= 0 AND checkin_day <= 6),
  checkin_hour INTEGER DEFAULT 9
    CHECK (checkin_hour >= 0 AND checkin_hour <= 23),
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE user_sms_preferences IS 'User SMS check-in preferences (phone, timezone, schedule)';
COMMENT ON COLUMN user_sms_preferences.user_id IS 'Primary key, references auth.users(id)';
COMMENT ON COLUMN user_sms_preferences.checkin_day IS 'Preferred day of week for check-in (0=Sun, 1=Mon, ..., 6=Sat)';
COMMENT ON COLUMN user_sms_preferences.checkin_hour IS 'Preferred hour in user timezone (0-23, default 9am)';
COMMENT ON COLUMN user_sms_preferences.timezone IS 'IANA timezone identifier for scheduling';
