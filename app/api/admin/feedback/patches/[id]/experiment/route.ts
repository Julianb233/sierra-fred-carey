/**
 * Admin Prompt Patch A/B Test API
 * Phase 76: RLHF-Lite (REQ-R4)
 *
 * POST /api/admin/feedback/patches/[id]/experiment — Create A/B test for a patch
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import { getPatchById, updatePatchStatus } from "@/lib/db/prompt-patches"
import { createExperiment } from "@/lib/ai/ab-testing"
import { linkPatchToExperiment } from "@/lib/db/prompt-patches"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const patch = await getPatchById(id)
    if (!patch) {
      return NextResponse.json({ error: "Patch not found" }, { status: 404 })
    }

    if (patch.status !== "approved") {
      return NextResponse.json(
        { error: `Patch must be approved before creating an A/B test (current: ${patch.status})` },
        { status: 400 }
      )
    }

    if (patch.experiment_id) {
      return NextResponse.json(
        { error: "Patch already has an experiment linked" },
        { status: 400 }
      )
    }

    // Create experiment with control (no patch) vs treatment (with patch)
    const experimentName = `prompt-patch-${patch.topic}-v${patch.version}`
    const trafficSplit = body.trafficSplit || 50

    const experimentId = await createExperiment(
      experimentName,
      `A/B test for prompt patch: ${patch.topic} v${patch.version}`,
      [
        {
          variantName: "control",
          trafficPercentage: 100 - trafficSplit,
          configOverrides: {},
        },
        {
          variantName: "treatment",
          promptId: id,
          trafficPercentage: trafficSplit,
          configOverrides: {
            patchId: id,
            patchContent: patch.content,
          },
        },
      ],
      body.userId || "system"
    )

    // Link experiment to patch
    await linkPatchToExperiment(id, experimentId)

    return NextResponse.json({
      experimentId,
      experimentName,
      message: `A/B test created: ${experimentName}`,
    }, { status: 201 })
  } catch (error) {
    console.error("[admin/patches/experiment] POST error:", error)
    return NextResponse.json(
      { error: "Failed to create experiment" },
      { status: 500 }
    )
  }
}
