-- AI-3581: Add founder_archetype column to profiles
-- Stores detected archetype: discovery, ideation, pre_seed, seed
-- Used for personalized FRED coaching and stage-aware prompts

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS founder_archetype TEXT
CHECK (founder_archetype IN ('discovery', 'ideation', 'pre_seed', 'seed'));

-- Default all existing users to 'discovery' (every user starts at the beginning per Fred's requirement)
-- New users get archetype set during onboarding via detectArchetype()
COMMENT ON COLUMN profiles.founder_archetype IS 'Detected founder archetype: discovery|ideation|pre_seed|seed. Set during onboarding.';
