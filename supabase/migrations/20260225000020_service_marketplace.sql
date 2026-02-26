-- Migration: Service Marketplace
-- Creates 4 tables for the service provider marketplace:
-- service_providers, service_listings, bookings, provider_reviews
-- Phase 68: Service Marketplace — Schema & Backend

-- ============================================================================
-- Table 1: service_providers
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id),  -- null for pre-seeded providers
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  tagline           TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL
                    CHECK (category IN ('legal','finance','marketing','growth','tech','hr','operations','other')),
  stage_fit         TEXT[] NOT NULL DEFAULT '{}',
  logo_url          TEXT,
  website           TEXT,
  stripe_account_id TEXT,  -- Stripe Connect account (future use)
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 2: service_listings
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  price_cents     INTEGER NOT NULL,
  price_type      TEXT NOT NULL
                  CHECK (price_type IN ('fixed','hourly','monthly','custom')),
  deliverables    TEXT[] NOT NULL DEFAULT '{}',
  turnaround_days INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 3: bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id              UUID NOT NULL REFERENCES service_providers(id),
  listing_id               UUID REFERENCES service_listings(id),
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','rejected','completed','cancelled')),
  message                  TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents             INTEGER,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 4: provider_reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON service_providers(category);
CREATE INDEX IF NOT EXISTS idx_service_providers_is_active ON service_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_id ON service_listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider_id ON provider_reviews(provider_id);

-- ============================================================================
-- RLS: service_providers
-- ============================================================================
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active providers"
  ON service_providers FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role manages service_providers"
  ON service_providers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: service_listings
-- ============================================================================
ALTER TABLE service_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active listings"
  ON service_listings FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role manages service_listings"
  ON service_listings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: bookings
-- ============================================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages bookings"
  ON bookings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: provider_reviews
-- ============================================================================
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reviews"
  ON provider_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users create own reviews"
  ON provider_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages provider_reviews"
  ON provider_reviews FOR ALL TO service_role
  USING (true) WITH CHECK (true);
