-- Migration 037: Enriched founder profiles
-- Adds industry, revenue range, team size, funding history, and enrichment tracking to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenue_range text; -- e.g., "pre-revenue", "$0-10k", "$10k-50k", "$50k-100k", "$100k-500k", "$500k+"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_size integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS funding_history text; -- e.g., "bootstrapped", "friends-family", "angel", "seed", "series-a"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enrichment_source text; -- "onboarding" or "conversation"
