-- Google Contacts table for AI agent context
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_resource_name text UNIQUE NOT NULL,
  source_account text NOT NULL CHECK (source_account IN ('personal', 'business')),
  display_name text,
  first_name text,
  last_name text,
  email_addresses jsonb DEFAULT '[]'::jsonb,
  phone_numbers jsonb DEFAULT '[]'::jsonb,
  organizations jsonb DEFAULT '[]'::jsonb,
  biographies text,
  notes text,
  tags text[] DEFAULT '{}',
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX idx_contacts_source_account ON public.contacts (source_account);
CREATE INDEX idx_contacts_display_name ON public.contacts (display_name);
CREATE INDEX idx_contacts_email_addresses ON public.contacts USING gin (email_addresses);
CREATE INDEX idx_contacts_organizations ON public.contacts USING gin (organizations);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
