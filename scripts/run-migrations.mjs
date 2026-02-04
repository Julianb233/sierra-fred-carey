#!/usr/bin/env node
/**
 * Database Migration Script
 * Runs SQL migrations against Supabase using the service role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Core SQL for AI logging tables (simplified version that works with Supabase)
const coreMigrationSQL = `
-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- AI Configuration per analyzer/feature
CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  dimension_weights JSONB,
  score_thresholds JSONB,
  custom_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prompt versioning and management
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE(name, version)
);

-- A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- A/B test variants
CREATE TABLE IF NOT EXISTS ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  prompt_id UUID REFERENCES ai_prompts(id),
  config_overrides JSONB NOT NULL DEFAULT '{}',
  traffic_percentage INTEGER NOT NULL DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, variant_name)
);

-- AI request logging
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  analyzer TEXT NOT NULL,
  source_id UUID,
  input_data JSONB NOT NULL DEFAULT '{}',
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  prompt_version INTEGER,
  variant_id UUID REFERENCES ab_variants(id),
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
  parsed_response JSONB,
  tokens_used INTEGER,
  latency_ms INTEGER NOT NULL,
  provider TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI-extracted insights for founder learning
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
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
  ('pitch_deck', 'gpt-4-turbo-preview', 0.6, 1500, '{}'),
  ('chat', 'gpt-4-turbo-preview', 0.7, 1000, '{}')
ON CONFLICT (analyzer) DO NOTHING;
`;

// Create exec_sql function for dynamic queries
const execSqlFunction = `
-- Create a function for executing dynamic SQL (service role only)
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT, params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the query and return results as JSON
  EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', query_text)
  INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'SQL execution error: %', SQLERRM;
END;
$$;

-- Revoke from public, only service role should use this
REVOKE ALL ON FUNCTION exec_sql FROM PUBLIC;
`;

async function runSQL(sql, description) {
  console.log(`\n📦 Running: ${description}...`);

  // Split by semicolons but handle function definitions
  const statements = sql
    .split(/;(?=\s*(?:CREATE|INSERT|DROP|ALTER|REVOKE|GRANT|--|\n\n|$))/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    if (!statement || statement.startsWith('--')) continue;

    try {
      // Use Supabase's rpc to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        query_text: statement,
        params: []
      });

      if (error) {
        // Try direct execution via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query_text: statement, params: [] })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      successCount++;
      process.stdout.write('.');
    } catch (err) {
      // For initial setup, exec_sql won't exist yet
      // We'll use Supabase Management API or just log
      errorCount++;
      const shortStatement = statement.substring(0, 50).replace(/\n/g, ' ');
      console.log(`\n  ⚠️  Statement needs manual execution: ${shortStatement}...`);
    }
  }

  console.log(`\n  ✓ Completed: ${successCount} statements, ${errorCount} need manual execution`);
  return { successCount, errorCount };
}

async function main() {
  console.log('🚀 Sahara Database Migration');
  console.log('============================');
  console.log(`Supabase URL: ${supabaseUrl}`);

  // Test connection
  console.log('\n🔌 Testing connection...');
  const { data: testData, error: testError } = await supabase.from('ai_config').select('count');

  if (testError && testError.code === 'PGRST116') {
    console.log('✓ Connected to Supabase (tables not yet created)');
  } else if (testError) {
    console.log(`⚠️  Connection test: ${testError.message}`);
  } else {
    console.log('✓ Connected to Supabase (tables exist)');
  }

  // Output SQL for manual execution
  console.log('\n' + '='.repeat(60));
  console.log('📋 MIGRATION SQL - Copy and run in Supabase SQL Editor');
  console.log('='.repeat(60));
  console.log('\nGo to: https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new');
  console.log('\nCopy the SQL below and run it:\n');
  console.log('-'.repeat(60));
  console.log(coreMigrationSQL);
  console.log('-'.repeat(60));

  console.log('\n\n📋 OPTIONAL: exec_sql function (for dynamic queries)');
  console.log('-'.repeat(60));
  console.log(execSqlFunction);
  console.log('-'.repeat(60));

  // Also write to a file for easy access
  const outputPath = join(__dirname, '..', 'migration-to-run.sql');
  const fullSQL = `-- Sahara Database Migration
-- Generated: ${new Date().toISOString()}
-- Run this in Supabase SQL Editor

${coreMigrationSQL}

-- Optional: exec_sql function for dynamic queries
${execSqlFunction}
`;

  require('fs').writeFileSync(outputPath, fullSQL);
  console.log(`\n📄 SQL also saved to: migration-to-run.sql`);

  console.log('\n✅ Migration script complete!');
  console.log('Next steps:');
  console.log('1. Open the Supabase SQL Editor');
  console.log('2. Paste and run the migration SQL');
  console.log('3. Restart the dev server');
}

main().catch(console.error);
