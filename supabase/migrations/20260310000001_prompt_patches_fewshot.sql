-- Phase 76: RLHF-Lite — Few-shot examples and prompt patches
-- Supports REQ-R1 (feedback-weighted few-shot examples) and REQ-R2 (category-driven prompt patches)

-- ============================================================================
-- Few-shot examples: positive and negative examples from feedback signals
-- ============================================================================
CREATE TABLE IF NOT EXISTS fewshot_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES feedback_signals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,                    -- coaching topic (fundraising, strategy, etc.)
  example_type TEXT NOT NULL CHECK (example_type IN ('positive', 'negative')),
  user_message TEXT NOT NULL,             -- the founder's message
  assistant_response TEXT NOT NULL,       -- FRED's response
  category TEXT,                          -- feedback category (from thumbs-down)
  comment TEXT,                           -- user's comment explaining rating
  user_tier TEXT NOT NULL DEFAULT 'free',
  weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ                 -- GDPR: auto-expire with signal
);

CREATE INDEX IF NOT EXISTS idx_fewshot_topic_type ON fewshot_examples(topic, example_type);
CREATE INDEX IF NOT EXISTS idx_fewshot_signal ON fewshot_examples(signal_id);
CREATE INDEX IF NOT EXISTS idx_fewshot_expires ON fewshot_examples(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Prompt patches: generated supplemental prompt instructions with approval workflow
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- the supplemental prompt text
  topic TEXT,                             -- coaching topic this targets
  source TEXT NOT NULL CHECK (source IN ('feedback', 'ab_test', 'manual')),
  source_id TEXT,                         -- feedback_insight.id or cluster hash
  source_signal_ids UUID[] DEFAULT '{}',  -- feedback signal IDs that triggered this
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'testing', 'rejected', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_patch_id UUID REFERENCES prompt_patches(id),
  experiment_id UUID REFERENCES ab_experiments(id),  -- if launched as A/B test
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  performance_metrics JSONB DEFAULT '{}', -- thumbs improvement tracking
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_patches_status ON prompt_patches(status);
CREATE INDEX IF NOT EXISTS idx_prompt_patches_topic ON prompt_patches(topic) WHERE topic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_patches_source ON prompt_patches(source, source_id);
CREATE INDEX IF NOT EXISTS idx_prompt_patches_active ON prompt_patches(activated_at DESC) WHERE status = 'active';

-- ============================================================================
-- RLS — service-role only for both tables
-- ============================================================================
ALTER TABLE fewshot_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on fewshot_examples"
  ON fewshot_examples FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE prompt_patches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on prompt_patches"
  ON prompt_patches FOR ALL
  USING (auth.role() = 'service_role');
