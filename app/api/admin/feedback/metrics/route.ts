/**
 * Admin Feedback Velocity Metrics API
 *
 * AI-4118: Feedback-to-fix velocity metrics with trend analysis.
 *
 * GET /api/admin/feedback/metrics?days=90
 *
 * Returns:
 * - overview: aggregate velocity numbers (avg times, SLA percentages)
 * - byCategory: resolution time broken down by feedback category
 * - bySeverity: resolution time broken down by insight severity
 * - trends: weekly trends (signals in/out, backlog, avg resolution)
 * - bottlenecks: which pipeline stage is slowest
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { getVelocityMetrics } from "@/lib/feedback/velocity-metrics"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(params.get("days") || "90", 10) || 90, 1), 365)

    const metrics = await getVelocityMetrics(days)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("[admin/feedback/metrics] Error:", error)
    return NextResponse.json(
      { error: "Failed to compute velocity metrics" },
      { status: 500 }
    )
  }
}
