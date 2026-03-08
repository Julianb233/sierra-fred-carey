-- Add journey_welcomed flag and oases_stage to profiles table
-- journey_welcomed: boolean flag to ensure welcome screen shows only once
-- oases_stage: the user's current position in the 5-stage venture journey
-- co_founder: free-text field from intake question #4
-- venture_timeline: free-text field from intake question #5

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS journey_welcomed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS oases_stage TEXT DEFAULT 'clarity'
    CHECK (oases_stage IN ('clarity', 'validation', 'build', 'launch', 'grow')),
  ADD COLUMN IF NOT EXISTS co_founder TEXT,
  ADD COLUMN IF NOT EXISTS venture_timeline TEXT;

-- Index for quick lookup of users who haven't been welcomed yet
CREATE INDEX IF NOT EXISTS idx_profiles_journey_welcomed
  ON profiles(journey_welcomed) WHERE journey_welcomed = false;

COMMENT ON COLUMN profiles.journey_welcomed IS 'Set to true after user completes the /welcome intake. Controls show-once behavior.';
COMMENT ON COLUMN profiles.oases_stage IS 'Current Oases stage: clarity, validation, build, launch, grow. Set initially by Reality Lens results.';
COMMENT ON COLUMN profiles.co_founder IS 'Free-text co-founder info from onboarding intake.';
COMMENT ON COLUMN profiles.venture_timeline IS 'Free-text timeline/goal from onboarding intake.';
