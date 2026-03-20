-- AI-3580: Add grade columns to document tables for A-F scoring
-- Grade scale: A (90-100), B (75-89), C (60-74), D (45-59), F (0-44)

-- uploaded_documents: user-uploaded PDFs
ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100),
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- strategy_documents: AI-generated strategy docs
ALTER TABLE strategy_documents
  ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100),
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- Index for filtering by grade
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_grade ON uploaded_documents (grade) WHERE grade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategy_documents_grade ON strategy_documents (grade) WHERE grade IS NOT NULL;

COMMENT ON COLUMN uploaded_documents.grade IS 'AI-assigned letter grade (A-F) based on document quality assessment';
COMMENT ON COLUMN uploaded_documents.score IS 'Numeric score 0-100 used to derive the letter grade';
COMMENT ON COLUMN uploaded_documents.scored_at IS 'When the document was last scored by AI';
