/**
 * Admin Iteration Metrics API
 *
 * Phase 90: User Testing Loop
 * GET endpoint returning iteration cycle metrics and recent signals.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import {
  getIterationMetrics,
  getIterationTimeline,
} from "@/lib/feedback/iteration-tracker"
import { createServiceClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const sinceDays = 30

    const [metrics, timeline] = await Promise.all([
      getIterationMetrics(sinceDays),
      getIterationTimeline(sinceDays),
    ])

    // Fetch recent signals for the table
    const supabase = createServiceClient()
    const { data: recentSignals } = await supabase
      .from("feedback_signals")
      .select("id, status, channel, message, created_at")
      .order("created_at", { ascending: false })
      .limit(20)

    return NextResponse.json({
      metrics,
      timeline,
      recentSignals: recentSignals || [],
    })
  } catch (err) {
    console.error("[iteration-metrics] Error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
