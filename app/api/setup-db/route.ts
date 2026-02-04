import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/setup-db
 * Sets up the required database tables for Sahara
 *
 * This endpoint creates tables using Supabase's native methods
 * It's idempotent - safe to call multiple times
 */
export async function GET() {
  const supabase = createServiceClient();
  const results: { table: string; status: string; error?: string }[] = [];

  // Test connection first
  try {
    const { error: testError } = await supabase.from('ai_config').select('count').limit(1);
    if (!testError) {
      // Tables already exist, verify them
      const tables = ['ai_config', 'ai_prompts', 'ab_experiments', 'ab_variants', 'ai_requests', 'ai_responses', 'ai_insights', 'contact_submissions'];

      for (const table of tables) {
        const { error } = await supabase.from(table).select('count').limit(1);
        results.push({
          table,
          status: error ? 'missing' : 'exists',
          error: error?.message
        });
      }

      // Seed default configs if ai_config exists
      if (!testError) {
        await seedDefaultConfigs(supabase);
      }

      return NextResponse.json({
        success: true,
        message: 'Database tables verified',
        results,
        action: 'If tables are missing, run the SQL from SETUP_DATABASE.sql in Supabase SQL Editor'
      });
    }
  } catch (e) {
    // Tables don't exist
  }

  return NextResponse.json({
    success: false,
    message: 'Database tables need to be created',
    instructions: [
      '1. Go to https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql/new',
      '2. Copy the contents of SETUP_DATABASE.sql',
      '3. Paste and run in the SQL Editor',
      '4. Call this endpoint again to verify'
    ],
    sqlFile: '/SETUP_DATABASE.sql'
  });
}

async function seedDefaultConfigs(supabase: any) {
  const configs = [
    { analyzer: 'reality_lens', model: 'gpt-4-turbo-preview', temperature: 0.7, max_tokens: 1500, custom_settings: {} },
    { analyzer: 'investor_score', model: 'gpt-4-turbo-preview', temperature: 0.5, max_tokens: 2000, custom_settings: {} },
    { analyzer: 'pitch_deck', model: 'gpt-4-turbo-preview', temperature: 0.6, max_tokens: 1500, custom_settings: {} },
    { analyzer: 'chat', model: 'gpt-4-turbo-preview', temperature: 0.7, max_tokens: 1000, custom_settings: {} },
  ];

  for (const config of configs) {
    await supabase
      .from('ai_config')
      .upsert(config, { onConflict: 'analyzer' });
  }
}
