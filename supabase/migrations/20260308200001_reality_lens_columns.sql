-- Add reality_lens_complete flag and reality_lens_score to profiles table
-- Used by the Quick Reality Lens flow to track assessment completion and score

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reality_lens_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reality_lens_score INTEGER;

-- Index for quick lookup of users who haven't completed reality lens
CREATE INDEX IF NOT EXISTS idx_profiles_reality_lens_complete
  ON profiles(reality_lens_complete) WHERE reality_lens_complete = false;

COMMENT ON COLUMN profiles.reality_lens_complete IS 'Set to true after user completes the Quick Reality Lens assessment.';
COMMENT ON COLUMN profiles.reality_lens_score IS 'Overall score (0-100) from the Quick Reality Lens assessment.';
