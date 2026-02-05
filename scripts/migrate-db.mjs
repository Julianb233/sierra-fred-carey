#!/usr/bin/env node
/**
 * Database Migration Script using Postgres
 * Runs SQL migrations directly against the Supabase database
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file manually
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  } catch (e) {
    // .env not found, rely on existing env vars
  }
}
loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Create database connection
const sql = postgres(databaseUrl);

// Core SQL migrations
const migrations = [
  {
    name: 'Create helper function',
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `
  },
  {
    name: 'Create ai_config table',
    sql: `
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
    `
  },
  {
    name: 'Create ai_prompts table',
    sql: `
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
    `
  },
  {
    name: 'Create ab_experiments table',
    sql: `
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
    `
  },
  {
    name: 'Create ab_variants table',
    sql: `
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
    `
  },
  {
    name: 'Create ai_requests table',
    sql: `
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
    `
  },
  {
    name: 'Create ai_responses table',
    sql: `
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
    `
  },
  {
    name: 'Create ai_insights table',
    sql: `
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
    `
  },
  {
    name: 'Create indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_requests_analyzer ON ai_requests(analyzer);
      CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_responses_request_id ON ai_responses(request_id);
      CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_insights_source ON ai_insights(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
      CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment_id ON ab_variants(experiment_id);
    `
  },
  {
    name: 'Seed default AI configs',
    sql: `
      INSERT INTO ai_config (analyzer, model, temperature, max_tokens, custom_settings)
      VALUES
        ('reality_lens', 'gpt-4-turbo-preview', 0.7, 1500, '{}'),
        ('investor_score', 'gpt-4-turbo-preview', 0.5, 2000, '{}'),
        ('pitch_deck', 'gpt-4-turbo-preview', 0.6, 1500, '{}'),
        ('chat', 'gpt-4-turbo-preview', 0.7, 1000, '{}')
      ON CONFLICT (analyzer) DO NOTHING;
    `
  }
];

async function runMigrations() {
  console.log('🚀 Sahara Database Migration');
  console.log('============================\n');

  // Test connection
  console.log('🔌 Testing database connection...');
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log(`✅ Connected! Server time: ${result[0].current_time}\n`);
  } catch (err) {
    console.error('❌ Failed to connect:', err.message);
    process.exit(1);
  }

  // Run migrations
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    process.stdout.write(`📦 ${migration.name}... `);
    try {
      await sql.unsafe(migration.sql);
      console.log('✅');
      successCount++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('⏭️  (already exists)');
        skipCount++;
      } else {
        console.log('❌');
        console.error(`   Error: ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(40));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(40));

  // Verify tables exist
  console.log('\n🔍 Verifying tables...');
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'ai_%' OR table_name LIKE 'ab_%'
      ORDER BY table_name
    `;
    console.log('Tables created:');
    tables.forEach(t => console.log(`  ✓ ${t.table_name}`));
  } catch (err) {
    console.error('Could not verify tables:', err.message);
  }

  console.log('\n✅ Migration complete!');
  await sql.end();
}

runMigrations().catch(async err => {
  console.error('Migration failed:', err);
  await sql.end();
  process.exit(1);
});
