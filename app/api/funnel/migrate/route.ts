/**
 * POST /api/funnel/migrate
 *
 * Triggers migration of funnel data into full platform tables for the
 * authenticated user. Called during or after sign-up.
 *
 * Requires authentication (user must have signed up).
 * Optionally accepts a sessionId to link the funnel lead first.
 *
 * Linear: AI-1903
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  linkFunnelLeadToUser,
  migrateFunnelData,
} from "@/lib/db/funnel-migration"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const sessionId = body.sessionId as string | undefined

    // If a funnel session ID is provided, link it to this user first
    if (sessionId && typeof sessionId === "string") {
      await linkFunnelLeadToUser(sessionId, user.id)
    }

    // Run the migration
    const result = await migrateFunnelData(user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[funnel/migrate] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
