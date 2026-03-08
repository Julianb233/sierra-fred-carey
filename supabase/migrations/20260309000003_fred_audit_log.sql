-- Unified audit log that traces every FRED interaction end-to-end
CREATE TABLE IF NOT EXISTS fred_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),  -- Links all parts of one interaction
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,

  -- User Input
  user_message TEXT NOT NULL,
  user_message_length INT GENERATED ALWAYS AS (char_length(user_message)) STORED,

  -- Topic Detection
  detected_topic TEXT,  -- fundraising, pitchReview, strategy, positioning, mindset, general
  topic_confidence FLOAT,
  detected_intent TEXT,  -- question, decision_request, etc.
  active_framework TEXT,  -- founder-os, positioning, investor-readiness
  active_mode TEXT,  -- founder-os, investor-readiness, etc.

  -- Model & Prompt
  model_used TEXT,  -- claude-sonnet-4-20250514, gpt-4o-mini, etc.
  prompt_version TEXT,  -- Track which FRED prompt version was active
  tier TEXT,  -- free, pro, studio

  -- Context
  oases_stage TEXT,  -- clarity, validation, build, launch, scale
  startup_process_step TEXT,  -- Current step in 9-step process
  is_first_conversation BOOLEAN DEFAULT false,
  has_persistent_memory BOOLEAN DEFAULT false,
  page_context TEXT,  -- Which page the user was on

  -- FRED Response
  fred_response TEXT,
  fred_response_length INT GENERATED ALWAYS AS (char_length(fred_response)) STORED,
  response_action TEXT,  -- recommend, defer, escalate
  response_confidence FLOAT,

  -- Performance
  latency_ms INT,
  input_tokens INT,
  output_tokens INT,
  total_tokens INT,

  -- Scoring & Tools
  reality_lens_score FLOAT,
  irs_score FLOAT,
  tools_used JSONB DEFAULT '[]',
  wellness_alert_triggered BOOLEAN DEFAULT false,

  -- Quality Signals (populated async after response)
  sentiment_label TEXT,  -- positive, neutral, negative, frustrated
  sentiment_confidence FLOAT,
  stress_level FLOAT,
  coaching_discomfort BOOLEAN DEFAULT false,

  -- User Feedback (populated when user gives feedback)
  feedback_rating INT,  -- -1, 0, 1
  feedback_category TEXT,
  feedback_comment TEXT,
  feedback_at TIMESTAMPTZ,

  -- Red Flags
  red_flags JSONB DEFAULT '[]',

  -- Metadata
  channel TEXT DEFAULT 'chat',  -- chat, voice, sms
  variant_id TEXT,  -- A/B test variant if active
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_fred_audit_user ON fred_audit_log(user_id, created_at DESC);
CREATE INDEX idx_fred_audit_trace ON fred_audit_log(trace_id);
CREATE INDEX idx_fred_audit_topic ON fred_audit_log(detected_topic, created_at DESC);
CREATE INDEX idx_fred_audit_feedback ON fred_audit_log(feedback_rating) WHERE feedback_rating IS NOT NULL;
CREATE INDEX idx_fred_audit_sentiment ON fred_audit_log(sentiment_label, created_at DESC);
CREATE INDEX idx_fred_audit_tier ON fred_audit_log(tier, created_at DESC);
CREATE INDEX idx_fred_audit_model ON fred_audit_log(model_used, created_at DESC);

-- RLS
ALTER TABLE fred_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_audit" ON fred_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can read their own
CREATE POLICY "user_read_own_audit" ON fred_audit_log
  FOR SELECT USING (user_id = auth.uid());

-- Service role can insert/update (API routes use service client)
CREATE POLICY "service_insert_audit" ON fred_audit_log
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_audit" ON fred_audit_log
  FOR UPDATE USING (true);

-- Consolidated view for admin analytics
CREATE OR REPLACE VIEW fred_audit_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  tier,
  detected_topic,
  model_used,
  COUNT(*) AS total_interactions,
  AVG(latency_ms) AS avg_latency_ms,
  AVG(total_tokens) AS avg_tokens,
  AVG(response_confidence) AS avg_confidence,
  COUNT(*) FILTER (WHERE feedback_rating = 1) AS thumbs_up,
  COUNT(*) FILTER (WHERE feedback_rating = -1) AS thumbs_down,
  COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL) AS total_feedback,
  ROUND(
    COUNT(*) FILTER (WHERE feedback_rating = 1)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL), 0) * 100, 1
  ) AS approval_rate,
  AVG(sentiment_confidence) FILTER (WHERE sentiment_label IS NOT NULL) AS avg_sentiment_confidence,
  COUNT(*) FILTER (WHERE sentiment_label = 'frustrated') AS frustrated_count,
  COUNT(*) FILTER (WHERE coaching_discomfort = true) AS coaching_discomfort_count,
  COUNT(*) FILTER (WHERE red_flags != '[]'::jsonb) AS red_flag_interactions,
  AVG(stress_level) FILTER (WHERE stress_level IS NOT NULL) AS avg_stress_level
FROM fred_audit_log
GROUP BY day, tier, detected_topic, model_used
ORDER BY day DESC;

-- Topic quality view - how well does FRED handle each topic?
CREATE OR REPLACE VIEW fred_topic_quality AS
SELECT
  detected_topic,
  tier,
  COUNT(*) AS total,
  AVG(response_confidence) AS avg_confidence,
  AVG(latency_ms) AS avg_latency,
  COUNT(*) FILTER (WHERE feedback_rating = 1) AS positive,
  COUNT(*) FILTER (WHERE feedback_rating = -1) AS negative,
  ROUND(
    COUNT(*) FILTER (WHERE feedback_rating = 1)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL), 0) * 100, 1
  ) AS approval_rate,
  mode() WITHIN GROUP (ORDER BY feedback_category) AS most_common_complaint,
  AVG(fred_response_length) AS avg_response_length
FROM fred_audit_log
WHERE created_at > now() - interval '30 days'
GROUP BY detected_topic, tier
ORDER BY total DESC;
