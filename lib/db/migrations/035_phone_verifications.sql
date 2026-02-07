-- Migration 035: Phone Verifications table
-- Stores SMS verification codes for phone number ownership confirmation
-- Referenced by: app/api/sms/verify/route.ts (POST sends code, PUT confirms code)

-- ============================================================================
-- Table
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

  -- One verification per user+phone pair; enables ON CONFLICT (user_id, phone_number) upsert
  CONSTRAINT phone_verifications_user_phone_unique UNIQUE (user_id, phone_number)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Verification lookup by user, phone, and code (PUT /api/sms/verify)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_phone_code
  ON phone_verifications(user_id, phone_number, code);

-- Expiry filtering for cleanup queries
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at
  ON phone_verifications(expires_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Service role has full access (server-side API routes use createServiceClient)
CREATE POLICY "service_role_full_access_phone_verifications"
  ON phone_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own verification records
CREATE POLICY "users_read_own_phone_verifications"
  ON phone_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_phone_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_phone_verifications_updated_at
  BEFORE UPDATE ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_verifications_updated_at();
