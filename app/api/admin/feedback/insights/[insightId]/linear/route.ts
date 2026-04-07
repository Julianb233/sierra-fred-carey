/**
 * Admin Linear Issue Creation API
 *
 * Phase 74-02: Creates a Linear issue from a feedback insight.
 * POST /api/admin/feedback/insights/[insightId]/linear
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import {
  createLinearIssueFromInsight,
  updateInsightWithLinearIssue,
} from "@/lib/feedback/linear-auto-triage"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ insightId: string }> }
) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const { insightId } = await params

    if (!insightId) {
      return NextResponse.json(
        { error: "Missing insightId parameter" },
        { status: 400 }
      )
    }

    // Fetch the insight
    const supabase = createServiceClient()
    const { data: insight, error } = await supabase
      .from("feedback_insights")
      .select("*")
      .eq("id", insightId)
      .single()

    if (error || !insight) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      )
    }

    if (insight.linear_issue_id) {
      return NextResponse.json(
        { error: "Linear issue already exists", identifier: insight.linear_issue_id },
        { status: 409 }
      )
    }

    // Create the Linear issue
    const result = await createLinearIssueFromInsight(insight)

    if (!result.success) {
      const isDuplicate = result.error?.startsWith("Duplicate:")
      return NextResponse.json(
        { error: result.error },
        { status: isDuplicate ? 409 : 500 }
      )
    }

    // Update the insight with the Linear issue ID
    await updateInsightWithLinearIssue(insightId, result.identifier!)

    return NextResponse.json({
      success: true,
      identifier: result.identifier,
      url: result.url,
    })
  } catch (err) {
    console.error("[admin/feedback/insights/linear] Error:", err)
    return NextResponse.json(
      { error: "Failed to create Linear issue" },
      { status: 500 }
    )
  }
}
