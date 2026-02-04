#!/usr/bin/env node
/**
 * Database Setup via Supabase REST API
 * Uses fetch to interact with Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file
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
    console.error('Could not load .env file');
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Sahara Database Setup (via Supabase API)');
console.log('============================================\n');
console.log(`Supabase URL: ${supabaseUrl}\n`);

// Tables to create via Supabase's insert method
const tables = {
  ai_config: {
    columns: ['analyzer', 'model', 'temperature', 'max_tokens', 'custom_settings'],
    seedData: [
      { analyzer: 'reality_lens', model: 'gpt-4-turbo-preview', temperature: 0.7, max_tokens: 1500, custom_settings: {} },
      { analyzer: 'investor_score', model: 'gpt-4-turbo-preview', temperature: 0.5, max_tokens: 2000, custom_settings: {} },
      { analyzer: 'pitch_deck', model: 'gpt-4-turbo-preview', temperature: 0.6, max_tokens: 1500, custom_settings: {} },
      { analyzer: 'chat', model: 'gpt-4-turbo-preview', temperature: 0.7, max_tokens: 1000, custom_settings: {} },
    ]
  }
};

async function checkTable(tableName) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count&limit=1`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    }
  });
  return response.ok;
}

async function seedTable(tableName, data) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to seed ${tableName}: ${error}`);
  }
  return true;
}

async function main() {
  // Check which tables exist
  const tableNames = [
    'ai_config', 'ai_prompts', 'ab_experiments', 'ab_variants',
    'ai_requests', 'ai_responses', 'ai_insights', 'contact_submissions'
  ];

  console.log('🔍 Checking existing tables...\n');

  const tableStatus = {};
  for (const table of tableNames) {
    const exists = await checkTable(table);
    tableStatus[table] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  }

  const missingTables = Object.entries(tableStatus).filter(([_, exists]) => !exists).map(([name]) => name);

  if (missingTables.length > 0) {
    console.log('\n⚠️  Missing tables detected:', missingTables.join(', '));
    console.log('\nTo create missing tables, run this SQL in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new\n');

    // Generate minimal SQL for missing tables
    const sqlStatements = {
      ai_config: `CREATE TABLE IF NOT EXISTS ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  custom_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      ai_prompts: `CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);`,
      ab_experiments: `CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      ab_variants: `CREATE TABLE IF NOT EXISTS ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  config_overrides JSONB DEFAULT '{}',
  traffic_percentage INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      ai_requests: `CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  analyzer TEXT NOT NULL,
  input_data JSONB DEFAULT '{}',
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      ai_responses: `CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  provider TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      ai_insights: `CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
      contact_submissions: `CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    };

    console.log('--- COPY THIS SQL ---\n');
    for (const table of missingTables) {
      if (sqlStatements[table]) {
        console.log(sqlStatements[table]);
        console.log('');
      }
    }
    console.log('--- END SQL ---\n');
  } else {
    console.log('\n✅ All tables exist!');
  }

  // Try to seed ai_config if it exists
  if (tableStatus.ai_config) {
    console.log('\n📊 Seeding ai_config with default values...');
    try {
      await seedTable('ai_config', tables.ai_config.seedData);
      console.log('✅ ai_config seeded successfully');
    } catch (err) {
      console.log('⚠️  Could not seed (may already have data):', err.message);
    }
  }

  // Final status
  console.log('\n' + '='.repeat(50));
  const existingCount = Object.values(tableStatus).filter(Boolean).length;
  console.log(`Database Status: ${existingCount}/${tableNames.length} tables ready`);

  if (existingCount === tableNames.length) {
    console.log('✅ Database is fully configured!');
  } else {
    console.log('⚠️  Please run the SQL above in Supabase SQL Editor');
  }
  console.log('='.repeat(50));
}

main().catch(console.error);
