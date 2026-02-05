-- Voice Agent Database Tables Migration
-- Run this in Supabase Dashboard: https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new

-- Voice Agent Configuration
CREATE TABLE IF NOT EXISTS voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default Agent',
  is_active BOOLEAN NOT NULL DEFAULT true,
  system_prompt TEXT NOT NULL,
  greeting_message TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'alloy' CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
  max_response_length INTEGER NOT NULL DEFAULT 150,
  response_style TEXT NOT NULL DEFAULT 'professional' CHECK (response_style IN ('professional', 'friendly', 'casual')),
  language TEXT NOT NULL DEFAULT 'en',
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
  }'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  after_hours_behavior TEXT NOT NULL DEFAULT 'voicemail' CHECK (after_hours_behavior IN ('voicemail', 'limited', 'offline')),
  after_hours_message TEXT,
  fallback_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES voice_agent_config(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'faq' CHECK (entry_type IN ('faq', 'product', 'document')),
  -- FAQ fields
  question TEXT,
  answer TEXT,
  -- Document fields
  document_title TEXT,
  document_content TEXT,
  document_url TEXT,
  -- Product fields
  product_name TEXT,
  product_description TEXT,
  product_price DECIMAL(10,2),
  product_features JSONB DEFAULT '[]'::jsonb,
  -- Organization
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  search_keywords TEXT[] DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Escalation Rules
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES voice_agent_config(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'sentiment', 'time_limit', 'intent', 'custom')),
  -- Trigger conditions
  trigger_keywords TEXT[] DEFAULT '{}',
  sentiment_threshold DECIMAL(3,2) CHECK (sentiment_threshold >= 0 AND sentiment_threshold <= 1),
  time_limit_seconds INTEGER CHECK (time_limit_seconds > 0),
  trigger_intents TEXT[] DEFAULT '{}',
  custom_condition TEXT,
  -- Action
  action TEXT NOT NULL DEFAULT 'offer_transfer' CHECK (action IN ('offer_transfer', 'auto_transfer', 'schedule_callback', 'send_email')),
  transfer_to TEXT,
  action_message TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Voice Calls Analytics
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL,
  caller_id TEXT,
  agent_config_id UUID REFERENCES voice_agent_config(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'escalated', 'failed')),
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  escalation_rule_id UUID REFERENCES escalation_rules(id),
  transcript TEXT,
  sentiment_scores JSONB DEFAULT '[]'::jsonb,
  topics_detected TEXT[] DEFAULT '{}',
  resolution_status TEXT CHECK (resolution_status IN ('resolved', 'unresolved', 'transferred', 'callback_scheduled')),
  customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_agent_config_active ON voice_agent_config(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_config_id ON knowledge_base(config_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON knowledge_base(entry_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_config_id ON escalation_rules(config_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_trigger ON escalation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_calls_room ON voice_calls(room_name);
CREATE INDEX IF NOT EXISTS idx_voice_calls_config ON voice_calls(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_started ON voice_calls(started_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);

-- Enable Row Level Security
ALTER TABLE voice_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role access
CREATE POLICY "Service role has full access to voice_agent_config" ON voice_agent_config
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to knowledge_base" ON knowledge_base
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to escalation_rules" ON escalation_rules
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to voice_calls" ON voice_calls
  FOR ALL USING (true);

-- Insert default configuration
INSERT INTO voice_agent_config (
  name,
  is_active,
  system_prompt,
  greeting_message,
  voice,
  max_response_length,
  response_style,
  language,
  timezone,
  after_hours_behavior,
  after_hours_message,
  fallback_message
) VALUES (
  'Default Agent',
  true,
  'You are a helpful AI support assistant. Your role is to:
- Help users with questions about our services
- Assist with scheduling consultations
- Answer general inquiries
- Provide helpful information

Guidelines:
- Be friendly, professional, and concise
- If you don''t know something, offer to connect them with a human agent
- Keep responses focused and avoid unnecessary filler',
  'Hello! Thank you for calling. How can I help you today?',
  'alloy',
  150,
  'professional',
  'en',
  'America/New_York',
  'voicemail',
  'Our office is currently closed. Please leave a message and we''ll get back to you.',
  'I apologize, but I''m unable to help with that. Would you like me to connect you with a team member?'
) ON CONFLICT DO NOTHING;
