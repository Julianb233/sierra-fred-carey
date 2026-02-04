-- ============================================
-- SUPABASE SETUP - Run this in SQL Editor
-- https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new
-- ============================================

-- 1. PROFILES TABLE (for user accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  stage TEXT,
  challenges JSONB DEFAULT '[]'::jsonb,
  teammate_emails JSONB DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, stage, challenges)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'stage', NULL),
    COALESCE(NEW.raw_user_meta_data->'challenges', '[]'::jsonb)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. CONTACT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  source TEXT DEFAULT 'contact_page',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage contact submissions" ON contact_submissions FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);

-- 3. AI CONFIG TABLE
CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  dimension_weights JSONB,
  score_thresholds JSONB,
  custom_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ai_config" ON ai_config FOR SELECT USING (true);

INSERT INTO ai_config (analyzer, model, temperature, max_tokens, custom_settings)
VALUES
  ('reality_lens', 'gpt-4-turbo-preview', 0.7, 1500, '{}'),
  ('investor_score', 'gpt-4-turbo-preview', 0.5, 2000, '{}'),
  ('pitch_deck', 'gpt-4-turbo-preview', 0.6, 1500, '{}'),
  ('chat', 'gpt-4-turbo-preview', 0.7, 1000, '{}')
ON CONFLICT (analyzer) DO NOTHING;

-- 4. AI PROMPTS TABLE
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(name, version)
);

ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active prompts" ON ai_prompts FOR SELECT USING (is_active = true);

-- 5. AI REQUESTS TABLE (chat logging)
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  analyzer TEXT NOT NULL,
  source_id UUID,
  input_data JSONB NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  prompt_version INTEGER,
  variant_id UUID,
  model TEXT NOT NULL,
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage ai_requests" ON ai_requests FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_analyzer ON ai_requests(analyzer);

-- 6. AI RESPONSES TABLE (chat logging)
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES ai_requests(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  parsed_response JSONB,
  tokens_used INTEGER,
  latency_ms INTEGER NOT NULL,
  provider TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage ai_responses" ON ai_responses FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_ai_responses_request_id ON ai_responses(request_id);

-- Done!
SELECT 'All tables created successfully!' as status;
