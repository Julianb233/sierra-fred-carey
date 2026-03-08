-- Phase 76: RLHF-Lite + Close-the-Loop
-- Prompt patches table for few-shot examples, supplemental instructions, and version tracking

CREATE TABLE IF NOT EXISTS prompt_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  topic TEXT NOT NULL,
  patch_type TEXT NOT NULL CHECK (patch_type IN ('few_shot_positive', 'few_shot_negative', 'supplemental_instruction')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'rejected', 'retired')),
  source_insight_id UUID REFERENCES feedback_insights(id) ON DELETE SET NULL,
  source_signal_ids UUID[] DEFAULT '{}',
  generated_by TEXT NOT NULL DEFAULT 'system',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  experiment_id UUID,
  thumbs_up_before DOUBLE PRECISION,
  thumbs_up_after DOUBLE PRECISION,
  tracking_started_at TIMESTAMPTZ,
  tracking_ends_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prompt_patches_status ON prompt_patches(status);
CREATE INDEX IF NOT EXISTS idx_prompt_patches_topic ON prompt_patches(topic);
CREATE INDEX IF NOT EXISTS idx_prompt_patches_tracking ON prompt_patches(status, tracking_ends_at) WHERE tracking_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_patches_source_insight ON prompt_patches(source_insight_id) WHERE source_insight_id IS NOT NULL;

-- Add resolved_by_patch_id to feedback_insights for bidirectional linking
ALTER TABLE feedback_insights ADD COLUMN IF NOT EXISTS resolved_by_patch_id UUID REFERENCES prompt_patches(id) ON DELETE SET NULL;

-- RLS policies
ALTER TABLE prompt_patches ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes and cron jobs)
CREATE POLICY "Service role full access on prompt_patches"
  ON prompt_patches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-increment version per topic
CREATE OR REPLACE FUNCTION set_prompt_patch_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := COALESCE(
    (SELECT MAX(version) + 1 FROM prompt_patches WHERE topic = NEW.topic),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prompt_patch_version
  BEFORE INSERT ON prompt_patches
  FOR EACH ROW
  EXECUTE FUNCTION set_prompt_patch_version();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_patches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prompt_patches_updated_at
  BEFORE UPDATE ON prompt_patches
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_patches_updated_at();
