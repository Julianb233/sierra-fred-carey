-- Migration 048: Fix profile trigger to insert all required columns
-- Addresses the incomplete profile creation issue where trigger only inserted 3 fields
--
-- Root cause: Migration 032 trigger only inserts (id, email, name) but migrations 032 and 037
-- added more columns (teammate_emails, tier, onboarding_completed, enrichment fields).
-- This caused incomplete profiles when relying on the trigger alone.
--
-- Fix: Update trigger to insert ALL profile columns with proper defaults

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create updated trigger function with all columns
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
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'stage', NULL),
    COALESCE(NEW.raw_user_meta_data -> 'challenges', '[]'::jsonb),
    '[]'::jsonb, -- teammate_emails default to empty array
    0, -- tier default to 0 (FREE)
    false, -- onboarding_completed default to false
    NULL, -- industry (optional enrichment field)
    NULL, -- revenue_range (optional enrichment field)
    NULL, -- team_size (optional enrichment field)
    NULL, -- funding_history (optional enrichment field)
    NULL, -- enriched_at (optional enrichment field)
    NULL, -- enrichment_source (optional enrichment field)
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create complete profile on auth.users insert. Includes all columns from migrations 032 and 037 to prevent incomplete profiles.';
