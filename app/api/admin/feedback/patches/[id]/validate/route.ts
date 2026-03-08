/**
 * Admin Patch Validation Status API
 * Phase 76: RLHF-Lite (REQ-R5)
 *
 * GET /api/admin/feedback/patches/[id]/validate — Check current validation status
 */

import { NextRequest, NextResponse } from "next/server"
import { computePatchImprovementById } from "@/lib/feedback/patch-validation"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const improvement = await computePatchImprovementById(id)

    if (!improvement) {
      return NextResponse.json(
        { error: "No tracking data found for this patch" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      patchId: id,
      baseline: improvement.baseline,
      current: improvement.current,
      delta: improvement.delta,
      improved: improvement.delta > 0,
      percentChange: improvement.baseline > 0
        ? ((improvement.delta / improvement.baseline) * 100).toFixed(1)
        : null,
    })
  } catch (err) {
    console.error("[admin/patches/validate] GET error:", err)
    return NextResponse.json({ error: "Failed to compute improvement" }, { status: 500 })
  }
}
