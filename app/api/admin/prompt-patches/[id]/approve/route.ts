import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth/admin"
import { approvePatch } from "@/lib/rlhf/patch-manager"

/**
 * POST /api/admin/prompt-patches/[id]/approve
 * Approve a draft prompt patch. REQ-R4: human-in-the-loop gate.
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
    const approvedBy = body.approvedBy || "admin"

    const patch = await approvePatch(id, approvedBy)

    return NextResponse.json({
      success: true,
      patch,
      message: `Approved patch "${patch.title}"`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve patch"
    console.error("[Admin Prompt Patch Approve] Error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
