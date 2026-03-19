/**
 * Admin Test Accounts API
 *
 * Phase 90: User Testing Loop
 * CRUD operations for test accounts used in QA and pre-event testing.
 *
 * GET    /api/admin/test-accounts         - List all test accounts
 * POST   /api/admin/test-accounts         - Create a test account
 * DELETE /api/admin/test-accounts         - Delete a test account (or all)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { createServiceClient } from "@/lib/supabase/server"
import {
  createTestAccount,
  listTestAccounts,
  deleteTestAccount,
  deleteAllTestAccounts,
} from "@/lib/db/test-accounts"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET - List all test accounts
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const supabase = createServiceClient()
    const accounts = await listTestAccounts(supabase)

    return NextResponse.json({ accounts, total: accounts.length })
  } catch (error) {
    console.error("[admin/test-accounts] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch test accounts" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST - Create a test account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { email, password, tier, testGroup, fullName, batch } = body

    const supabase = createServiceClient()

    // Batch creation
    if (batch) {
      const count = Math.min(batch.count || 5, 50) // Max 50 at once
      const batchTier = batch.tier || tier || "pro"
      const batchGroup = batch.testGroup || testGroup || "qa"
      const created: Awaited<ReturnType<typeof createTestAccount>>[] = []
      const errors: string[] = []

      for (let i = 1; i <= count; i++) {
        const batchEmail = `test-${Date.now()}-${i}@sahara-testing.local`
        try {
          const account = await createTestAccount(supabase, {
            email: batchEmail,
            password: "TestAccount2026!",
            tier: batchTier,
            testGroup: batchGroup,
            fullName: `Test User ${i} (${batchGroup})`,
          })
          created.push(account)
        } catch (err) {
          errors.push(
            `${batchEmail}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }

      return NextResponse.json({ created, errors }, { status: 201 })
    }

    // Single creation
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const account = await createTestAccount(supabase, {
      email,
      password: password || "TestAccount2026!",
      tier: tier || "pro",
      testGroup: testGroup || "qa",
      fullName,
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error("[admin/test-accounts] POST error:", error)
    return NextResponse.json(
      { error: "Failed to create test account" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE - Delete a test account (or all)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { userId, deleteAll } = body

    const supabase = createServiceClient()

    if (deleteAll) {
      const result = await deleteAllTestAccounts(supabase)
      return NextResponse.json({
        message: `Deleted ${result.deleted} test accounts`,
        ...result,
      })
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required (or set deleteAll: true)" },
        { status: 400 }
      )
    }

    await deleteTestAccount(supabase, userId)
    return NextResponse.json({ message: "Test account deleted", userId })
  } catch (error) {
    console.error("[admin/test-accounts] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete test account" },
      { status: 500 }
    )
  }
}
