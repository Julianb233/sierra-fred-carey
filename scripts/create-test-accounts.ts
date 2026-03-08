#!/usr/bin/env npx tsx
/**
 * CLI: Create Test Accounts
 *
 * Phase 90: User Testing Loop
 * Batch-create test accounts for QA and pre-event testing.
 *
 * Usage:
 *   npx tsx scripts/create-test-accounts.ts
 *   npx tsx scripts/create-test-accounts.ts --count 10 --tier studio --group event-preview
 *   npx tsx scripts/create-test-accounts.ts --cleanup
 *
 * Options:
 *   --count <n>    Number of accounts to create (default: 5, max: 50)
 *   --tier <tier>  Account tier: free | pro | studio (default: pro)
 *   --group <g>    Test group label (default: qa)
 *   --cleanup      Delete all existing test accounts
 */

import { createClient } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--cleanup") {
      parsed.cleanup = true
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      parsed[arg.slice(2)] = args[++i]
    }
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs()

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    )
    console.error("Load your .env.local: source .env.local or use dotenv.")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ---------------------------------------------------------------------------
  // Cleanup mode
  // ---------------------------------------------------------------------------

  if (args.cleanup) {
    console.log("Cleaning up all test accounts...")

    const { data } = await supabase.auth.admin.listUsers({ perPage: 500 })
    const testUsers = (data?.users ?? []).filter(
      (u) => u.user_metadata?.is_test_account === true
    )

    if (testUsers.length === 0) {
      console.log("No test accounts found.")
      return
    }

    console.log(`Found ${testUsers.length} test account(s) to delete.`)

    let deleted = 0
    for (const user of testUsers) {
      try {
        await supabase.from("profiles").delete().eq("id", user.id)
        await supabase.auth.admin.deleteUser(user.id)
        deleted++
        console.log(`  Deleted: ${user.email}`)
      } catch (err) {
        console.error(
          `  Failed to delete ${user.email}:`,
          err instanceof Error ? err.message : err
        )
      }
    }

    console.log(`\nDone. Deleted ${deleted}/${testUsers.length} test accounts.`)
    return
  }

  // ---------------------------------------------------------------------------
  // Create mode
  // ---------------------------------------------------------------------------

  const count = Math.min(parseInt(String(args.count || "5"), 10), 50)
  const tier = String(args.tier || "pro")
  const group = String(args.group || "qa")

  console.log(`Creating ${count} test account(s)...`)
  console.log(`  Tier: ${tier}`)
  console.log(`  Group: ${group}`)
  console.log()

  const created: Array<{ email: string; id: string }> = []

  for (let i = 1; i <= count; i++) {
    const email = `test-${Date.now()}-${i}@sahara-testing.local`
    const password = "TestAccount2026!"

    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            is_test_account: true,
            test_group: group,
            full_name: `Test User ${i} (${group})`,
          },
        })

      if (authError) {
        console.error(`  Failed: ${email} - ${authError.message}`)
        continue
      }

      const userId = authData.user.id

      // Upsert profile
      await supabase.from("profiles").upsert(
        {
          id: userId,
          email,
          full_name: `Test User ${i} (${group})`,
          tier,
          is_test_account: true,
          test_group: group,
        },
        { onConflict: "id" }
      )

      created.push({ email, id: userId })
      console.log(`  Created: ${email} (${userId})`)
    } catch (err) {
      console.error(
        `  Error: ${email} -`,
        err instanceof Error ? err.message : err
      )
    }
  }

  console.log(`\nDone. Created ${created.length}/${count} test accounts.`)
  console.log(`Password for all accounts: TestAccount2026!`)

  if (created.length > 0) {
    console.log("\nAccount summary:")
    console.table(created)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
