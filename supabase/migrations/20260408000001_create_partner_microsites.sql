-- Phase 165: Microsite Generation Polish
-- Creates partner_microsites table for storing microsite configuration and branding

CREATE TABLE IF NOT EXISTS partner_microsites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core info
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'modern',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Branding
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected shape: { logo_url, primary_color, secondary_color, accent_color, font_heading, font_body, favicon_url }

  -- Content sections
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected shape: { hero: { headline, subheadline, cta_text, cta_url }, about: { text }, services: [...], testimonials: [...], contact: { email, phone, address } }

  -- Settings
  custom_domain TEXT,
  seo_title TEXT,
  seo_description TEXT,

  -- Version history
  version INTEGER NOT NULL DEFAULT 1,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of { version, content, branding, updated_at }

  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

-- Index for fast lookups
CREATE INDEX idx_microsites_user_id ON partner_microsites(user_id);
CREATE INDEX idx_microsites_slug ON partner_microsites(slug);
CREATE INDEX idx_microsites_status ON partner_microsites(status);

-- RLS policies
ALTER TABLE partner_microsites ENABLE ROW LEVEL SECURITY;

-- Users can read their own microsites
CREATE POLICY "Users can view own microsites"
  ON partner_microsites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own microsites
CREATE POLICY "Users can create microsites"
  ON partner_microsites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own microsites
CREATE POLICY "Users can update own microsites"
  ON partner_microsites FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own microsites
CREATE POLICY "Users can delete own microsites"
  ON partner_microsites FOR DELETE
  USING (auth.uid() = user_id);

-- Published microsites are publicly readable (for the public-facing microsite)
CREATE POLICY "Published microsites are public"
  ON partner_microsites FOR SELECT
  USING (status = 'published');
