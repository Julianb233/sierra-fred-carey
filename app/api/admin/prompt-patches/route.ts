import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth/admin"
import { getPatchesByStatus, getPatchById } from "@/lib/rlhf/patch-manager"
import { savePatchToDB } from "@/lib/rlhf/patch-generator"
import type { PatchStatus } from "@/lib/rlhf/types"
import { logger } from "@/lib/logger"

/**
 * GET /api/admin/prompt-patches
 * List prompt patches with optional status filter.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")

    let patches
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim()) as PatchStatus[]
      patches = await getPatchesByStatus(statuses)
    } else {
      patches = await getPatchesByStatus(["draft", "approved", "active", "testing", "rejected", "archived"])
    }

    return NextResponse.json({ success: true, patches })
  } catch (error) {
    console.error("[Admin Prompt Patches GET] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch patches" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/prompt-patches
 * Create a manual prompt patch.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content, topic } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Title and content are required" },
        { status: 400 }
      )
    }

    const patch = await savePatchToDB({
      title: title.trim(),
      content: content.trim(),
      topic: topic?.trim() || null,
      source: "manual",
      sourceId: null,
      sourceSignalIds: [],
      status: "draft",
      version: 1,
      parentPatchId: null,
      experimentId: null,
      approvedBy: null,
      approvedAt: null,
      activatedAt: null,
      deactivatedAt: null,
      performanceMetrics: {},
      metadata: {},
    })

    logger.log(`[Admin Prompt Patches POST] Created manual patch "${patch.title}"`)

    return NextResponse.json({ success: true, patch }, { status: 201 })
  } catch (error) {
    console.error("[Admin Prompt Patches POST] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create patch" },
      { status: 500 }
    )
  }
}
