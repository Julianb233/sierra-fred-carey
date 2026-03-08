/**
 * Admin Prompt Patch Detail API
 * Phase 76: RLHF-Lite (REQ-R4)
 *
 * GET /api/admin/feedback/patches/[id] — Get patch details
 * PATCH /api/admin/feedback/patches/[id] — Update patch status (approve/reject/deploy/retire)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/auth/admin"
import {
  getPatchById,
  updatePatchStatus,
} from "@/lib/db/prompt-patches"
import { deployPatchWithTracking } from "@/lib/feedback/patch-validation"
import type { PromptPatchStatus } from "@/lib/feedback/types"

export const dynamic = "force-dynamic"

const VALID_TRANSITIONS: Record<string, PromptPatchStatus[]> = {
  draft: ["pending_review", "rejected"],
  pending_review: ["approved", "rejected"],
  approved: ["active", "rejected"],
  active: ["retired"],
  rejected: ["draft"],
  retired: [],
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const { id } = await params
    const patch = await getPatchById(id)
    if (!patch) {
      return NextResponse.json({ error: "Patch not found" }, { status: 404 })
    }
    return NextResponse.json({ patch })
  } catch (error) {
    console.error("[admin/patches/id] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch patch" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdminRequest(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()
    const newStatus = body.status as PromptPatchStatus

    if (!newStatus) {
      return NextResponse.json(
        { error: "Missing required field: status" },
        { status: 400 }
      )
    }

    const patch = await getPatchById(id)
    if (!patch) {
      return NextResponse.json({ error: "Patch not found" }, { status: 404 })
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[patch.status] || []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${patch.status} -> ${newStatus}. Allowed: ${allowed.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Special handling for deployment (sets tracking window)
    if (newStatus === "active") {
      const { patch: deployed, baseline } = await deployPatchWithTracking(id)
      return NextResponse.json({
        patch: deployed,
        tracking: { baseline, windowDays: 14 },
      })
    }

    // Standard status update
    const extra: Record<string, unknown> = {}
    if (newStatus === "approved") {
      extra.approved_by = body.approved_by || null
    }
    if (newStatus === "rejected" && body.reason) {
      extra.metadata = { ...patch.metadata, rejection_reason: body.reason }
    }

    const updated = await updatePatchStatus(id, newStatus, extra)
    return NextResponse.json({ patch: updated })
  } catch (error) {
    console.error("[admin/patches/id] PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update patch" },
      { status: 500 }
    )
  }
}
