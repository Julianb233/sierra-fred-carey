/**
 * Admin Audit CSV Export API
 *
 * GET /api/admin/audit/export?days=30
 * Exports FRED audit log data as CSV.
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
    const days = parseInt(params.get("days") || "30")

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("fred_audit_log")
      .select("*")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data || data.length === 0) {
      return new NextResponse("No data", { status: 204 })
    }

    const headers = [
      "created_at", "tier", "detected_topic", "active_framework", "model_used",
      "user_message", "fred_response", "response_confidence", "response_action",
      "latency_ms", "total_tokens", "sentiment_label", "stress_level",
      "feedback_rating", "feedback_category", "feedback_comment",
      "channel", "session_id", "trace_id",
    ]

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return ""
      const str = String(val).replace(/"/g, '""')
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str
    }

    const csv = [
      headers.join(","),
      ...data.map((row: Record<string, unknown>) => headers.map((h) => escapeCSV(row[h])).join(",")),
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=fred-audit-${new Date().toISOString().split("T")[0]}.csv`,
      },
    })
  } catch (error) {
    console.error("[admin/audit/export] Error:", error)
    return NextResponse.json(
      { error: "Failed to export audit data" },
      { status: 500 }
    )
  }
}
