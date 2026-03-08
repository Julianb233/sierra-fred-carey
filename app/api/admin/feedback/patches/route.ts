/**
 * Admin Prompt Patches API
 * Phase 76: RLHF-Lite (REQ-R4)
 *
 * GET /api/admin/feedback/patches — List patches with optional status filter
 * POST /api/admin/feedback/patches — Create a new manual patch
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import {
  getPatchesByStatus,
  insertPromptPatch,
  getAllActivePatches,
} from "@/lib/db/prompt-patches"
import type { PromptPatchStatus } from "@/lib/feedback/types"

export const dynamic = "force-dynamic"

const VALID_STATUSES: PromptPatchStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "active",
  "rejected",
  "retired",
]

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const params = request.nextUrl.searchParams
    const statusParam = params.get("status")
    const limit = parseInt(params.get("limit") || "50", 10)

    let patches
    if (statusParam === "all") {
      // Return all patches across all statuses
      patches = await getPatchesByStatus(VALID_STATUSES, limit)
    } else if (statusParam && VALID_STATUSES.includes(statusParam as PromptPatchStatus)) {
      patches = await getPatchesByStatus(statusParam as PromptPatchStatus, limit)
    } else {
      // Default: pending review + draft (the approval queue)
      patches = await getPatchesByStatus(["draft", "pending_review"], limit)
    }

    return NextResponse.json({ patches, total: patches.length })
  } catch (error) {
    console.error("[admin/patches] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch patches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminRequest(request)
  if (denied) return denied

  try {
    const body = await request.json()

    if (!body.topic || !body.content || !body.patch_type) {
      return NextResponse.json(
        { error: "Missing required fields: topic, content, patch_type" },
        { status: 400 }
      )
    }

    const patch = await insertPromptPatch({
      topic: body.topic,
      patch_type: body.patch_type,
      content: body.content,
      status: body.status || "draft",
      source_insight_id: body.source_insight_id || null,
      source_signal_ids: body.source_signal_ids || [],
      generated_by: "admin",
      approved_by: null,
      approved_at: null,
      experiment_id: null,
      thumbs_up_before: null,
      thumbs_up_after: null,
      tracking_started_at: null,
      tracking_ends_at: null,
      metadata: body.metadata || {},
    })

    return NextResponse.json({ patch }, { status: 201 })
  } catch (error) {
    console.error("[admin/patches] POST error:", error)
    return NextResponse.json(
      { error: "Failed to create patch" },
      { status: 500 }
    )
  }
}
