/**
 * POST /api/reports/generate
 *
 * Triggers founder report generation. Creates a pending report record,
 * dispatches background PDF generation via Trigger.dev, and returns
 * 202 with the reportId for client-side polling.
 *
 * No request body needed — userId comes from auth session.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { generateReport } from "@/lib/report/generate-report"

export async function POST() {
  try {
    const userId = await requireAuth()
    const result = await generateReport(userId)

    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    if (error instanceof Response) {
      return error // Auth redirect
    }

    console.error("[Reports Generate API] Error:", error)

    const message =
      error instanceof Error ? error.message : "Failed to generate report"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
