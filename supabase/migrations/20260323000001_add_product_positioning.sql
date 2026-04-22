-- Add product_positioning column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS product_positioning TEXT;

COMMENT ON COLUMN profiles.product_positioning IS 'One-liner product positioning, captured during onboarding';
