/**
 * Admin Audit Log API
 *
 * GET /api/admin/audit
 * Returns paginated, filterable FRED audit log entries.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { createServiceClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams
    const topic = params.get("topic")
    const tier = params.get("tier")
    const feedbackOnly = params.get("feedback_only") === "true"
    const negativeOnly = params.get("negative_only") === "true"
    const days = parseInt(params.get("days") || "7")
    const limit = Math.min(parseInt(params.get("limit") || "100"), 500)
    const offset = parseInt(params.get("offset") || "0")

    const supabase = createServiceClient()
    let query = supabase
      .from("fred_audit_log")
      .select("*", { count: "exact" })
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (topic) query = query.eq("detected_topic", topic)
    if (tier) query = query.eq("tier", tier)
    if (feedbackOnly) query = query.not("feedback_rating", "is", null)
    if (negativeOnly) query = query.eq("feedback_rating", -1)

    const { data, count, error } = await query

    if (error) {
      console.error("[admin/audit] Supabase query error:", error.message)
      return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
    }

    return NextResponse.json({ data, total: count, limit, offset })
  } catch (error) {
    console.error("[admin/audit] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    )
  }
}
