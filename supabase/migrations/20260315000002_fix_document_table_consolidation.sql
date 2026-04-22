-- AI-2273: Prepare document_repository for consolidation with uploaded_documents
-- Adds columns that exist in uploaded_documents but not in document_repository
-- This is step 1; step 2 is updating code to use document_repository everywhere

ALTER TABLE document_repository ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE document_repository ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_document_repository_user_created
  ON document_repository(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_repository_doc_type
  ON document_repository(doc_type) WHERE doc_type IS NOT NULL;

-- Note: After code is updated to use document_repository exclusively,
-- data from uploaded_documents should be migrated and that table dropped.
-- See docs/db-schema-audit-AI-2273.md for full migration plan.
