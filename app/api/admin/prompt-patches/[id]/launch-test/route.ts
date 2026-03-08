import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth/admin"
import { launchPatchAsTest } from "@/lib/rlhf/patch-manager"
import { startPatchTracking } from "@/lib/rlhf/patch-tracker"

/**
 * POST /api/admin/prompt-patches/[id]/launch-test
 * Launch an approved prompt patch as an A/B test experiment.
 * REQ-R4: human-in-the-loop gate. REQ-R5: tracks thumbs improvement.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      experimentName,
      description,
      trafficPercentage,
    } = body

    if (!experimentName?.trim()) {
      return NextResponse.json(
        { success: false, error: "experimentName is required" },
        { status: 400 }
      )
    }

    const { patch, experimentId } = await launchPatchAsTest(id, {
      name: experimentName.trim(),
      description: description?.trim(),
      trafficPercentage: trafficPercentage ?? 50,
    })

    // Start performance tracking (REQ-R5)
    if (patch.topic) {
      try {
        await startPatchTracking(id, patch.topic)
      } catch (err) {
        // Non-critical: tracking is additive
        console.error("[Launch Test] Failed to start tracking:", err)
      }
    }

    return NextResponse.json({
      success: true,
      patch,
      experimentId,
      message: `Launched A/B test "${experimentName}" for patch "${patch.title}"`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to launch test"
    console.error("[Admin Prompt Patch Launch Test] Error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
