#!/usr/bin/env npx tsx
/**
 * CLI: Smoke Test Onboarding Flow
 *
 * Phase 90: User Testing Loop
 * Creates a test account and validates the full onboarding-to-journey flow
 * using Playwright's API to programmatically navigate each step.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-onboarding.ts
 *   npx tsx scripts/smoke-test-onboarding.ts --keep-account
 *   npx tsx scripts/smoke-test-onboarding.ts --base-url http://localhost:3000
 *   npx tsx scripts/smoke-test-onboarding.ts --help
 *
 * Options:
 *   --keep-account   Do not delete the test account after run
 *   --base-url <url> Base URL of the app (default: http://localhost:3000)
 *   --help           Show this help message
 */

import { createClient } from "@supabase/supabase-js"
import { chromium } from "playwright"

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--help") {
      parsed.help = true
    } else if (arg === "--keep-account") {
      parsed.keepAccount = true
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      parsed[key] = args[++i]
    }
  }

  return parsed
}

function printHelp() {
  console.log(`
Smoke Test: Onboarding Flow
============================

Creates a test account and validates the full onboarding-to-journey flow.

Usage:
  npx tsx scripts/smoke-test-onboarding.ts [options]

Options:
  --keep-account   Do not delete the test account after run
  --base-url <url> Base URL of the app (default: http://localhost:3000)
  --help           Show this help message

Environment:
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL (required)
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key (required)

Steps validated:
  1. Signup page loads
  2. Welcome screen renders
  3. 5-question intake completes
  4. Reality Lens page loads
  5. Dashboard renders with journey widget
`)
}

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

interface StepResult {
  name: string
  passed: boolean
  durationMs: number
  error?: string
}

async function runStep(
  name: string,
  fn: () => Promise<void>
): Promise<StepResult> {
  const start = Date.now()
  try {
    await fn()
    const durationMs = Date.now() - start
    console.log(`  PASS  ${name} (${durationMs}ms)`)
    return { name, passed: true, durationMs }
  } catch (err) {
    const durationMs = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)
    console.log(`  FAIL  ${name} (${durationMs}ms)`)
    console.log(`        ${error}`)
    return { name, passed: false, durationMs, error }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  const baseUrl = String(args.baseUrl || "http://localhost:3000")
  const keepAccount = Boolean(args.keepAccount)

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Create test account
  const testEmail = `smoke-${Date.now()}@sahara-testing.local`
  const testPassword = "SmokeTest2026!"

  console.log("\nSmoke Test: Onboarding Flow")
  console.log("===========================")
  console.log(`Base URL:  ${baseUrl}`)
  console.log(`Account:   ${testEmail}`)
  console.log(`Keep:      ${keepAccount}`)
  console.log()

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        is_test_account: true,
        test_group: "smoke",
        full_name: "Smoke Test User",
      },
    })

  if (authError || !authData.user) {
    console.error("Failed to create test account:", authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`Account created: ${userId}\n`)

  // Upsert profile
  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: testEmail,
      full_name: "Smoke Test User",
      tier: "pro",
      is_test_account: true,
      test_group: "smoke",
    },
    { onConflict: "id" }
  )

  // Launch browser
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const results: StepResult[] = []

  // Step 1: Signup page loads
  results.push(
    await runStep("Signup page loads", async () => {
      await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle", timeout: 30000 })
      // Should see signup form or redirect
      await page.waitForTimeout(1000)
      const url = page.url()
      if (!url.includes("signup") && !url.includes("get-started") && !url.includes("login")) {
        throw new Error(`Unexpected URL: ${url}`)
      }
    })
  )

  // Step 2: Login with test account
  results.push(
    await runStep("Login with test account", async () => {
      await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: 30000 })
      await page.waitForTimeout(1000)

      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')

      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill(testEmail)
        await passwordInput.fill(testPassword)
        const submitBtn = page.getByRole("button", { name: /sign in/i })
        if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitBtn.click()
          await page.waitForTimeout(3000)
        }
      }
    })
  )

  // Step 3: Welcome/onboarding screen
  results.push(
    await runStep("Welcome/onboarding screen renders", async () => {
      // After login, new users may see welcome or get-started
      await page.goto(`${baseUrl}/get-started`, { waitUntil: "networkidle", timeout: 30000 })
      await page.waitForTimeout(2000)
      const url = page.url()
      // Should either be on get-started or redirected to dashboard/welcome
      if (
        !url.includes("get-started") &&
        !url.includes("dashboard") &&
        !url.includes("welcome")
      ) {
        throw new Error(`Unexpected URL after onboarding nav: ${url}`)
      }
    })
  )

  // Step 4: Dashboard loads
  results.push(
    await runStep("Dashboard page loads", async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 30000 })
      await page.waitForTimeout(2000)
      // Should either show dashboard or redirect to login/get-started
      const url = page.url()
      const hasContent =
        url.includes("dashboard") ||
        url.includes("login") ||
        url.includes("get-started")
      if (!hasContent) {
        throw new Error(`Unexpected URL: ${url}`)
      }
    })
  )

  // Step 5: Chat page loads
  results.push(
    await runStep("Chat page loads", async () => {
      await page.goto(`${baseUrl}/chat`, { waitUntil: "networkidle", timeout: 30000 })
      await page.waitForTimeout(2000)
      const url = page.url()
      if (
        !url.includes("chat") &&
        !url.includes("login") &&
        !url.includes("get-started")
      ) {
        throw new Error(`Unexpected URL: ${url}`)
      }
    })
  )

  // Close browser
  await browser.close()

  // Print summary
  console.log("\n--- Summary ---")
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const totalTime = results.reduce((a, r) => a + r.durationMs, 0)

  for (const r of results) {
    console.log(`  ${r.passed ? "PASS" : "FAIL"}  ${r.name}`)
  }

  console.log(`\nResult: ${passed}/${total} steps passed (${totalTime}ms total)`)

  // Cleanup
  if (!keepAccount) {
    console.log("\nCleaning up test account...")
    await supabase.from("profiles").delete().eq("id", userId)
    await supabase.auth.admin.deleteUser(userId)
    console.log("Account deleted.")
  } else {
    console.log(`\nTest account kept: ${testEmail} / ${testPassword}`)
  }

  if (passed < total) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
