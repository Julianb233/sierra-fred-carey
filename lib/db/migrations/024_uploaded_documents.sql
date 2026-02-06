-- Migration: Uploaded Documents and RAG Chunks
-- Phase 03: Pro Tier Features
-- Created: 2026-02-05

-- Uploaded documents (PDFs, pitch decks, etc.)
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pitch_deck', 'financial', 'strategy', 'legal', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks for RAG retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  page_number INTEGER,
  section TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_user ON uploaded_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_type ON uploaded_documents(type);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON uploaded_documents(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_created ON uploaded_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page ON document_chunks(document_id, page_number);

-- Vector similarity index for RAG queries
-- Using ivfflat with cosine distance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger to update updated_at on document updates
CREATE TRIGGER update_uploaded_documents_updated_at
  BEFORE UPDATE ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE uploaded_documents IS 'User-uploaded documents (PDFs) for analysis';
COMMENT ON TABLE document_chunks IS 'Chunked document content with embeddings for RAG';
COMMENT ON COLUMN document_chunks.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
