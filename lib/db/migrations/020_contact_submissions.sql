-- Contact Submissions Migration
-- Creates contact_submissions table for storing contact form data

-- ============================================
-- Contact Submissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),

  -- Metadata
  source TEXT DEFAULT 'contact_page',
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for contact_submissions
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for API submissions)
CREATE POLICY "Service role can insert contact submissions"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Allow service role to view all submissions (for admin)
CREATE POLICY "Service role can view contact submissions"
  ON contact_submissions FOR SELECT
  USING (true);

-- Allow service role to update submissions (for status changes)
CREATE POLICY "Service role can update contact submissions"
  ON contact_submissions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the website';
COMMENT ON COLUMN contact_submissions.status IS 'Submission status: new, read, replied, archived';
COMMENT ON COLUMN contact_submissions.source IS 'Source page of the submission';
