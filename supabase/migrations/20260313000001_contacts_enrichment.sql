-- Enrich contacts table with interaction frequency and relationship data
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS interaction_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS interaction_score float DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relationship_type text CHECK (relationship_type IN ('frequent', 'occasional', 'dormant', 'new', NULL)),
  ADD COLUMN IF NOT EXISTS email_threads_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_email_subject text,
  ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}'::jsonb;

-- Index for relationship-type filtering and score-based sorting
CREATE INDEX idx_contacts_relationship_type ON public.contacts (relationship_type);
CREATE INDEX idx_contacts_interaction_score ON public.contacts (interaction_score DESC);
CREATE INDEX idx_contacts_last_interaction ON public.contacts (last_interaction_at DESC NULLS LAST);
