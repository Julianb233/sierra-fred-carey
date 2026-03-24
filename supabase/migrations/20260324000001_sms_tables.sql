-- Migration: SMS Tables for Twilio Integration
-- AI-2651: Complete Twilio integration for launch
-- Consolidates migrations 029, 031, 035, 075, 076 from lib/db/migrations/
--
-- Creates: sms_checkins, user_sms_preferences, phone_verifications
-- All tables use IF NOT EXISTS for safe re-running

-- ============================================================================
-- 1. SMS Check-ins (from 029_sms_checkins.sql)
-- ============================================================================

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Delivery status columns (from 075_sms_delivery_status.sql)
  delivery_status TEXT,
  delivery_error_code TEXT,
  delivery_error_message TEXT,
  delivered_at TIMESTAMPTZ,
  status_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_checkins_user ON sms_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_week ON sms_checkins(year, week_number);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_phone ON sms_checkins(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_status ON sms_checkins(status);
CREATE INDEX IF NOT EXISTS idx_sms_checkins_delivery ON sms_checkins(delivery_status);

-- Idempotency index (from 076_sms_checkins_idempotency.sql)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_checkins_message_sid_unique
  ON sms_checkins (message_sid)
  WHERE message_sid IS NOT NULL;

-- RLS
ALTER TABLE sms_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_full_access_sms_checkins"
  ON sms_checkins FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "users_read_own_sms_checkins"
  ON sms_checkins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE sms_checkins IS 'Weekly SMS check-in messages with accountability scoring';

-- ============================================================================
-- 2. User SMS Preferences (from 031_user_sms_preferences.sql + 075 consent)
-- ============================================================================

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
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE user_sms_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_full_access_sms_prefs"
  ON user_sms_preferences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "users_manage_own_sms_prefs"
  ON user_sms_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_sms_preferences IS 'User SMS check-in preferences (phone, timezone, schedule)';

-- ============================================================================
-- 3. Phone Verifications (from 035_phone_verifications.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT phone_verifications_user_phone_unique UNIQUE (user_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_phone_code
  ON phone_verifications(user_id, phone_number, code);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at
  ON phone_verifications(expires_at);

-- RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_full_access_phone_verifications"
  ON phone_verifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "users_read_own_phone_verifications"
  ON phone_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_phone_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_phone_verifications_updated_at ON phone_verifications;
CREATE TRIGGER trigger_phone_verifications_updated_at
  BEFORE UPDATE ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_verifications_updated_at();
