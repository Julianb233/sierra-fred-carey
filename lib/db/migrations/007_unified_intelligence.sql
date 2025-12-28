-- Unified Intelligence Architecture
-- Centralized AI configuration, logging, A/B testing, and insights

-- AI Configuration per analyzer/feature
CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer TEXT NOT NULL UNIQUE, -- e.g., 'reality_lens', 'investor_score', 'pitch_deck'
  model TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  dimension_weights JSONB, -- Analyzer-specific dimension weights
  score_thresholds JSONB, -- Analyzer-specific thresholds
  custom_settings JSONB NOT NULL DEFAULT '{}', -- Any analyzer-specific settings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prompt versioning and management
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., 'reality_lens_system', 'investor_score_system'
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name, version)
);

-- A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'reality_lens_prompt_v2'
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- A/B test variants
CREATE TABLE IF NOT EXISTS ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g., 'control', 'variant_a', 'variant_b'
  prompt_id UUID REFERENCES ai_prompts(id), -- If testing prompt changes
  config_overrides JSONB NOT NULL DEFAULT '{}', -- Config overrides for this variant
  traffic_percentage INTEGER NOT NULL DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, variant_name)
);

-- AI request logging
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  analyzer TEXT NOT NULL, -- Which analyzer/feature made the request
  source_id UUID, -- ID of the source object (checkin, document, etc.)
  input_data JSONB NOT NULL, -- Input data sent to AI
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  prompt_version INTEGER, -- Version of prompt used
  variant_id UUID REFERENCES ab_variants(id), -- A/B test variant if applicable
  model TEXT NOT NULL,
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI response logging
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ai_requests(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  parsed_response JSONB, -- Structured response if applicable
  tokens_used INTEGER,
  latency_ms INTEGER NOT NULL, -- Response time in milliseconds
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
  error TEXT, -- Error message if request failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI-extracted insights for founder learning
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source_type TEXT NOT NULL, -- 'checkin', 'document', 'pitch_deck', etc.
  source_id UUID NOT NULL, -- ID of the source
  insight_type TEXT NOT NULL CHECK (insight_type IN ('breakthrough', 'warning', 'opportunity', 'pattern', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_analyzer ON ai_requests(analyzer);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_responses_request_id ON ai_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_source ON ai_insights(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment_id ON ab_variants(experiment_id);

-- Seed default configs
INSERT INTO ai_config (analyzer, model, temperature, max_tokens, custom_settings)
VALUES
  ('reality_lens', 'gpt-4-turbo-preview', 0.7, 1500, '{}'),
  ('investor_score', 'gpt-4-turbo-preview', 0.5, 2000, '{}'),
  ('pitch_deck', 'gpt-4-turbo-preview', 0.6, 1500, '{}')
ON CONFLICT (analyzer) DO NOTHING;

-- Enable RLS
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Config and prompts: read for all authenticated, write for admins only
CREATE POLICY "Anyone can view AI config"
  ON ai_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view active prompts"
  ON ai_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Requests/Responses: users can only see their own
CREATE POLICY "Users can view own AI requests"
  ON ai_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create AI requests"
  ON ai_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view AI responses for their requests"
  ON ai_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_requests
      WHERE ai_requests.id = ai_responses.request_id
      AND ai_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create AI responses"
  ON ai_responses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insights: users can only see their own
CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create insights"
  ON ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own insights"
  ON ai_insights FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A/B testing: read for all, write for admins only
CREATE POLICY "Anyone can view active experiments"
  ON ab_experiments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Anyone can view variants"
  ON ab_variants FOR SELECT
  TO authenticated
  USING (true);
