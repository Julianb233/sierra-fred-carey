-- Migration: Add unique constraint on fred_red_flags to prevent duplicate red flags
-- Deduplication key: (user_id, category, title)
-- Uses unique index so INSERT ... ON CONFLICT can reference it

CREATE UNIQUE INDEX IF NOT EXISTS idx_fred_red_flags_user_category_title
  ON fred_red_flags (user_id, category, title);
