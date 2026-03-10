-- Add tsvector full-text search column to contacts table
-- Enables fast text search alongside Pinecone semantic search

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.contacts SET search_vector = to_tsvector('english',
  coalesce(display_name, '') || ' ' ||
  coalesce(biographies, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(enrichment_data->>'organization_names', '')
);

CREATE INDEX IF NOT EXISTS idx_contacts_search ON public.contacts USING GIN(search_vector);
