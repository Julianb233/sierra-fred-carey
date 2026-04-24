-- Firebase -> Supabase field parity
--
-- The 2026-04-21 Firebase migration put these fields into enrichment_data as a
-- lossless audit blob, but they never surfaced as first-class profile columns
-- so the product UI could not read them back. Users logging in post-migration
-- saw a half-empty profile even though their Firebase data was preserved on
-- the server.
--
-- This migration:
--   1) Adds a first-class column for every Firebase field that has no current
--      home in profiles (9 columns).
--   2) Backfills each column from enrichment_data / enrichment_data.firebase_raw
--      for every user tagged enrichment_source='firebase_migration_2026_04_21'.
--   3) Is idempotent — safe to re-run, every ADD COLUMN uses IF NOT EXISTS and
--      every UPDATE coalesces against the existing value.
--
-- The enrichment_data.firebase_raw blob is preserved untouched, so rollback is
-- a one-query UPDATE that nulls each new column.

-- ----------------------------------------------------------------------------
-- 1. Add columns (no-op if already present)
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS target_market text,
  ADD COLUMN IF NOT EXISTS idea_status text,
  ADD COLUMN IF NOT EXISTS passions text,
  ADD COLUMN IF NOT EXISTS stage_category text,
  ADD COLUMN IF NOT EXISTS weak_spot text,
  ADD COLUMN IF NOT EXISTS weak_spot_category text,
  ADD COLUMN IF NOT EXISTS has_partners boolean;

COMMENT ON COLUMN public.profiles.phone IS
  'Contact phone number. From Firebase users.phone during 2026-04-21 migration.';
COMMENT ON COLUMN public.profiles.location IS
  'Founder city/region. From Firebase users.location during 2026-04-21 migration.';
COMMENT ON COLUMN public.profiles.target_market IS
  'Target market (B2B, B2C, etc). From Firebase users.targetMarket.';
COMMENT ON COLUMN public.profiles.idea_status IS
  'Current status of the idea (e.g. "Doing market research"). From Firebase users.ideaStatus.';
COMMENT ON COLUMN public.profiles.passions IS
  'Founder-stated passions / motivations. From Firebase users.passions.';
COMMENT ON COLUMN public.profiles.stage_category IS
  'Raw stage bucket (Ideation / Pre-seed / Seed / Series / etc). From Firebase users.stageCategory. See oases_stage for the derived product-side enum.';
COMMENT ON COLUMN public.profiles.weak_spot IS
  'Founder-stated biggest weakness. From Firebase users.weakSpot.';
COMMENT ON COLUMN public.profiles.weak_spot_category IS
  'Weakness category (Unit Economics / Fundraising / Problem Validation / etc). From Firebase users.weakSpotCategory.';
COMMENT ON COLUMN public.profiles.has_partners IS
  'Whether the founder has co-founders. From Firebase users.hasPartners (bool). co_founder text column kept for richer detail.';

-- ----------------------------------------------------------------------------
-- 2. Backfill from enrichment_data for migrated users
-- ----------------------------------------------------------------------------

UPDATE public.profiles p
SET
  phone = COALESCE(p.phone, p.enrichment_data->>'phone', p.enrichment_data->'firebase_raw'->>'phone'),
  location = COALESCE(p.location, p.enrichment_data->>'location', p.enrichment_data->'firebase_raw'->>'location'),
  target_market = COALESCE(p.target_market, p.enrichment_data->>'target_market', p.enrichment_data->'firebase_raw'->>'targetMarket'),
  idea_status = COALESCE(p.idea_status, p.enrichment_data->>'idea_status', p.enrichment_data->'firebase_raw'->>'ideaStatus'),
  passions = COALESCE(p.passions, p.enrichment_data->>'passions', p.enrichment_data->'firebase_raw'->>'passions'),
  stage_category = COALESCE(p.stage_category, p.enrichment_data->>'stage_category', p.enrichment_data->'firebase_raw'->>'stageCategory'),
  weak_spot = COALESCE(p.weak_spot, p.enrichment_data->'firebase_raw'->>'weakSpot'),
  weak_spot_category = COALESCE(p.weak_spot_category, p.enrichment_data->'firebase_raw'->>'weakSpotCategory'),
  has_partners = COALESCE(
    p.has_partners,
    CASE
      WHEN p.enrichment_data->'firebase_raw'->>'hasPartners' = 'true' THEN true
      WHEN p.enrichment_data->'firebase_raw'->>'hasPartners' = 'false' THEN false
      ELSE NULL
    END
  )
WHERE p.enrichment_source = 'firebase_migration_2026_04_21';

-- ----------------------------------------------------------------------------
-- 3. Also backfill product_positioning from ideaPitch where missing
--    (the 2026-04-21 importer parked ideaPitch in enrichment_data because the
--    product_positioning column was not live at import time. It is live now.)
-- ----------------------------------------------------------------------------

UPDATE public.profiles p
SET product_positioning = COALESCE(
  p.product_positioning,
  p.enrichment_data->>'idea_pitch',
  p.enrichment_data->'firebase_raw'->>'ideaPitch'
)
WHERE p.enrichment_source = 'firebase_migration_2026_04_21'
  AND (p.product_positioning IS NULL OR p.product_positioning = '');
