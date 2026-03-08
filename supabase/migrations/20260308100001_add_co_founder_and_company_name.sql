-- Phase 79: Active Founder Memory Layer
-- Add co_founder and company_name columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS co_founder TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Comment for documentation
COMMENT ON COLUMN profiles.co_founder IS 'Co-founder name(s), captured during onboarding or conversation';
COMMENT ON COLUMN profiles.company_name IS 'Company/startup name, captured during onboarding or conversation';
