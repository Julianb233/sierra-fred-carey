/**
 * Admin Feedback Insights API
 *
 * Phase 74-02: Returns top feedback insight clusters for the admin dashboard.
 * GET /api/admin/feedback/insights?limit=10
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { getTopInsightsThisWeek } from "@/lib/db/feedback-admin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams
    const limit = parseInt(params.get("limit") || "10", 10)

    const insights = await getTopInsightsThisWeek(Math.min(limit, 50))

    return NextResponse.json({ insights })
  } catch (err) {
    console.error("[admin/feedback/insights] Error:", err)
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    )
  }
}
