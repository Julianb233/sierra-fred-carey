-- Add enrichment_data JSONB column to profiles table.
-- This column stores conversation-extracted enrichment hints (revenue,
-- team size, competitors, metrics) written by fireEnrichment() in the
-- chat route and read by context-builder.ts for the Founder Snapshot.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;
