import { NextRequest, NextResponse } from "next/server"
import { isAdminSession } from "@/lib/auth/admin"
import { queryAuditLogAdmin } from "@/lib/db/audit-log"
import type { AuditLogFilters } from "@/lib/audit/types"

const CSV_HEADERS = [
  "id", "trace_id", "user_id", "session_id", "created_at",
  "user_message", "fred_response", "detected_topic", "detected_intent",
  "active_mode", "model_used", "tier", "oases_stage", "page_context",
  "latency_ms", "response_confidence", "reality_lens_score", "irs_score",
  "sentiment_label", "sentiment_score", "feedback_rating", "feedback_category",
  "feedback_comment", "wellness_alert_triggered", "tools_used",
]

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = Array.isArray(value) ? value.join("; ") : String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  const admin = await isAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams
  const filters: AuditLogFilters = {
    dateFrom: url.get("dateFrom") || undefined,
    dateTo: url.get("dateTo") || undefined,
    userId: url.get("userId") || undefined,
    topic: url.get("topic") || undefined,
    tier: url.get("tier") || undefined,
    model: url.get("model") || undefined,
    oasesStage: url.get("oasesStage") || undefined,
    activeMode: url.get("activeMode") || undefined,
    sentimentLabel: url.get("sentimentLabel") || undefined,
    feedbackRating: url.has("feedbackRating") ? Number(url.get("feedbackRating")) : undefined,
    page: 1,
    pageSize: 100,
  }

  try {
    const result = await queryAuditLogAdmin(filters)

    const rows = result.data.map((row) =>
      CSV_HEADERS.map((h) => escapeCSV((row as unknown as Record<string, unknown>)[h])).join(",")
    )

    const csv = [CSV_HEADERS.join(","), ...rows].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fred-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error("[admin/audit-log/export] Error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
