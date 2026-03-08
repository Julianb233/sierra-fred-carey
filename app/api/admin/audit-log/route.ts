import { NextRequest, NextResponse } from "next/server"
import { isAdminSession } from "@/lib/auth/admin"
import { queryAuditLogAdmin, getAuditLogStats } from "@/lib/db/audit-log"
import type { AuditLogFilters } from "@/lib/audit/types"

export async function GET(req: NextRequest) {
  const admin = await isAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams
  const mode = url.get("mode") // "stats" or default "list"

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
    page: url.has("page") ? Number(url.get("page")) : 1,
    pageSize: url.has("pageSize") ? Number(url.get("pageSize")) : 50,
  }

  try {
    if (mode === "stats") {
      const stats = await getAuditLogStats(filters.dateFrom, filters.dateTo)
      return NextResponse.json(stats)
    }

    const result = await queryAuditLogAdmin(filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[admin/audit-log] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
