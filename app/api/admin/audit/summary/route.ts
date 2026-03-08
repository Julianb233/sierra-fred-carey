/**
 * Admin Audit Summary API
 *
 * GET /api/admin/audit/summary
 * Returns aggregated audit summary and topic quality data from views.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { createServiceClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const supabase = createServiceClient()

    // Get summary view data
    const { data: summary } = await supabase
      .from("fred_audit_summary")
      .select("*")
      .limit(100)

    // Get topic quality data
    const { data: topicQuality } = await supabase
      .from("fred_topic_quality")
      .select("*")

    return NextResponse.json({ summary, topicQuality })
  } catch (error) {
    console.error("[admin/audit/summary] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit summary" },
      { status: 500 }
    )
  }
}
