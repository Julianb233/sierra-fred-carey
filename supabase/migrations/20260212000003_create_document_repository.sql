-- Phase 44: Document Repository
-- Unified document repository table with folder categorization.
-- Bridges existing strategy docs, uploaded files, and new document uploads
-- into a single organized view.

CREATE TABLE IF NOT EXISTS document_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  folder TEXT NOT NULL CHECK (folder IN ('decks', 'strategy', 'reports', 'uploads')),
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}',
  -- Optional link to legacy tables for bridging
  source_type TEXT CHECK (source_type IN ('upload', 'generated', 'strategy', 'linked')),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_repo_user_id ON document_repository(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_repo_user_folder ON document_repository(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_doc_repo_created ON document_repository(user_id, created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_document_repository_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_repository_updated_at
  BEFORE UPDATE ON document_repository
  FOR EACH ROW EXECUTE FUNCTION update_document_repository_updated_at();

-- RLS
ALTER TABLE document_repository ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON document_repository FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON document_repository FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON document_repository FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON document_repository FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for server-side operations
CREATE POLICY "Service role full access on document_repository"
  ON document_repository FOR ALL
  USING (auth.role() = 'service_role');

-- Storage bucket for document uploads (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-repository', 'document-repository', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own files
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'document-repository'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-repository'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'document-repository'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role storage access
CREATE POLICY "Service role full access on document-repository storage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'document-repository'
    AND auth.role() = 'service_role'
  );
