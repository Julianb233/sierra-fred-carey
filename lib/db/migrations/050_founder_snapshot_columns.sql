-- ============================================================================
-- Migration 050: Add Founder Snapshot columns to profiles
-- Phase 35: Onboarding Handoff - Operating Bible Section 12 alignment
--
-- Gap analysis: The Operating Bible Section 12 defines canonical Founder
-- Snapshot fields. The profiles table is missing 5 of them:
--   product_status, traction, runway, primary_constraint, ninety_day_goal
--
-- These columns enable the onboarding flow and FRED's load-memory actor
-- to read/write a complete founder context from the profiles table.
-- ============================================================================

-- Add missing Founder Snapshot fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS product_status TEXT;
  -- e.g., "idea", "prototype", "mvp", "launched", "scaling"

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS traction TEXT;
  -- Free-text: "500 waitlist signups", "3 paying customers", "pre-launch"

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS runway JSONB DEFAULT '{}'::jsonb;
  -- Structured: { "time": "6 months", "money": "$50k", "energy": "high" }

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_constraint TEXT;
  -- e.g., "demand", "distribution", "product_depth", "execution", "team", "focus"

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ninety_day_goal TEXT;
  -- Free-text: "10 paying customers", "launch MVP", "close seed round"

-- ============================================================================
-- Update the auth trigger to include new columns with defaults
-- (Extends migration 048's trigger to include the new columns)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    stage,
    challenges,
    teammate_emails,
    tier,
    onboarding_completed,
    industry,
    revenue_range,
    team_size,
    funding_history,
    enriched_at,
    enrichment_source,
    product_status,
    traction,
    runway,
    primary_constraint,
    ninety_day_goal,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'stage', NULL),
    COALESCE(NEW.raw_user_meta_data -> 'challenges', '[]'::jsonb),
    '[]'::jsonb,
    0,
    false,
    NULL,    -- industry
    NULL,    -- revenue_range
    NULL,    -- team_size
    NULL,    -- funding_history
    NULL,    -- enriched_at
    NULL,    -- enrichment_source
    NULL,    -- product_status
    NULL,    -- traction
    '{}'::jsonb, -- runway
    NULL,    -- primary_constraint
    NULL,    -- ninety_day_goal
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-create complete profile on auth.users insert. Includes all columns from migrations 032, 037, and 050 (Founder Snapshot fields).';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN profiles.product_status IS 'Current product stage: idea, prototype, mvp, launched, scaling (Operating Bible Section 12)';
COMMENT ON COLUMN profiles.traction IS 'Free-text traction description (Operating Bible Section 12)';
COMMENT ON COLUMN profiles.runway IS 'Structured runway: {time, money, energy} (Operating Bible Section 12)';
COMMENT ON COLUMN profiles.primary_constraint IS 'Primary business constraint: demand, distribution, product_depth, execution, team, focus (Operating Bible Section 12)';
COMMENT ON COLUMN profiles.ninety_day_goal IS 'Founder 90-day goal (Operating Bible Section 12)';
