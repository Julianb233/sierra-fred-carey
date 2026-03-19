/**
 * Test Account Database Helpers
 *
 * Phase 90: User Testing Loop
 * Provides CRUD operations for test accounts used in QA and pre-event testing.
 * Test accounts are tagged with is_test_account metadata for easy identification.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestAccount {
  id: string
  email: string
  tier: string
  createdAt: string
  testGroup: string // e.g., "mobile-qa", "event-preview", "beta-tester"
  isActive: boolean
  fullName?: string
}

export interface CreateTestAccountConfig {
  email: string
  password: string
  tier: string
  testGroup: string
  fullName?: string
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTestAccount(
  supabase: SupabaseClient,
  config: CreateTestAccountConfig
): Promise<TestAccount> {
  // 1. Create auth user via admin API
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        is_test_account: true,
        test_group: config.testGroup,
        full_name: config.fullName || `Test User (${config.testGroup})`,
      },
    })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id

  // 2. Upsert profile with tier
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: config.email,
      name: config.fullName || `Test User (${config.testGroup})`,
      tier: config.tier,
      metadata: {
        is_test_account: true,
        test_group: config.testGroup,
      },
    },
    { onConflict: "id" }
  )

  if (profileError) {
    console.error(
      "[test-accounts] Profile upsert warning:",
      profileError.message
    )
    // Non-fatal: user was created, profile may already exist from trigger
  }

  return {
    id: userId,
    email: config.email,
    tier: config.tier,
    createdAt: authData.user.created_at,
    testGroup: config.testGroup,
    isActive: true,
    fullName: config.fullName,
  }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listTestAccounts(
  supabase?: SupabaseClient
): Promise<TestAccount[]> {
  const client = supabase ?? createServiceClient()

  // List all users and filter by test account metadata
  const { data, error } = await client.auth.admin.listUsers({
    perPage: 500,
  })

  if (error) {
    console.error("[test-accounts] List failed:", error.message)
    return []
  }

  const testUsers = (data?.users ?? []).filter(
    (u) => u.user_metadata?.is_test_account === true
  )

  return testUsers.map((u) => ({
    id: u.id,
    email: u.email || "",
    tier: u.user_metadata?.tier || "free",
    createdAt: u.created_at,
    testGroup: u.user_metadata?.test_group || "unknown",
    isActive: !(u as unknown as Record<string, unknown>).banned_until,
    fullName: u.user_metadata?.full_name,
  }))
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteTestAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Clean up profile first
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)

  if (profileError) {
    console.error(
      "[test-accounts] Profile delete warning:",
      profileError.message
    )
  }

  // Delete the auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)

  if (authError) {
    throw new Error(`Failed to delete test user: ${authError.message}`)
  }
}

// ---------------------------------------------------------------------------
// Delete All Test Accounts
// ---------------------------------------------------------------------------

export async function deleteAllTestAccounts(
  supabase?: SupabaseClient
): Promise<{ deleted: number; errors: string[] }> {
  const client = supabase ?? createServiceClient()
  const accounts = await listTestAccounts(client)
  const errors: string[] = []
  let deleted = 0

  for (const account of accounts) {
    try {
      await deleteTestAccount(client, account.id)
      deleted++
    } catch (err) {
      errors.push(
        `Failed to delete ${account.email}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return { deleted, errors }
}
