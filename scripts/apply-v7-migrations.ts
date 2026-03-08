/**
 * Apply v7.0 migrations using Supabase service client.
 * Usage: npx tsx scripts/apply-v7-migrations.ts
 *
 * These tables must be created via the Supabase SQL Editor:
 * 1. Go to https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql
 * 2. Paste the contents of each migration file
 * 3. Run
 *
 * Migrations needed (in order):
 * - supabase/migrations/20260309000003_fred_audit_log.sql
 * - supabase/migrations/20260309200001_fred_audit_log_enrich.sql
 * - supabase/migrations/20260310000001_prompt_patches_fewshot.sql
 * - supabase/migrations/20260310000002_feedback_improvements_log.sql
 * - supabase/migrations/20260311000001_ux_test_audit.sql
 */

import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTables() {
  const tables = [
    "fred_audit_log",
    "feedback_signals",
    "feedback_sessions",
    "feedback_insights",
    "prompt_patches",
    "ux_test_runs",
    "ux_test_results",
    "feedback_improvements",
    "feedback_digest_preferences",
  ]

  console.log("Checking v7.0 tables...\n")

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1)
    if (error) {
      console.log(`  MISSING: ${table} — ${error.message}`)
    } else {
      console.log(`  EXISTS:  ${table}`)
    }
  }

  console.log("\n--- Missing tables need manual creation via Supabase SQL Editor ---")
  console.log("Dashboard: https://supabase.com/dashboard/project/ggiywhpgzjdjeeldjdnp/sql")
}

checkTables()
