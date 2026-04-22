-- AI-2273: Add missing profiles snapshot columns
-- These columns exist in lib/db/migrations/050_founder_snapshot_columns.sql
-- but were never ported to supabase/migrations/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS product_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS traction TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS runway TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_constraint TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ninety_day_goal TEXT;
