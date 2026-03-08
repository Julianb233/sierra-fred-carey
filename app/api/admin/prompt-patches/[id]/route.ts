import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/auth/admin"
import { getPatchById, deactivatePatch } from "@/lib/rlhf/patch-manager"
import { sql } from "@/lib/db/supabase-sql"
import { logger } from "@/lib/logger"

/**
 * GET /api/admin/prompt-patches/[id]
 * Get single patch with source traceability.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const patch = await getPatchById(id)

    if (!patch) {
      return NextResponse.json(
        { success: false, error: "Patch not found" },
        { status: 404 }
      )
    }

    // Get source insight if available
    let sourceInsight = null
    if (patch.sourceId) {
      try {
        const insightRows = await sql`
          SELECT id, title, description, category, severity, signal_count, status
          FROM feedback_insights
          WHERE id = ${patch.sourceId}
        `
        if (insightRows.length > 0) {
          sourceInsight = insightRows[0]
        }
      } catch {
        // sourceId might not be a valid UUID (e.g., cluster theme string)
      }
    }

    // Get experiment status if linked
    let experiment = null
    if (patch.experimentId) {
      try {
        const expRows = await sql`
          SELECT id, name, description, is_active, start_date, end_date
          FROM ab_experiments
          WHERE id = ${patch.experimentId}
        `
        if (expRows.length > 0) {
          experiment = expRows[0]
        }
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      patch,
      sourceInsight,
      experiment,
    })
  } catch (error) {
    console.error("[Admin Prompt Patch GET] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch patch" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/prompt-patches/[id]
 * Update patch content (only for draft patches).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const patch = await getPatchById(id)

    if (!patch) {
      return NextResponse.json(
        { success: false, error: "Patch not found" },
        { status: 404 }
      )
    }

    if (patch.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "Can only edit draft patches" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, content, topic } = body

    const rows = await sql`
      UPDATE prompt_patches
      SET title = COALESCE(${title || null}, title),
          content = COALESCE(${content || null}, content),
          topic = COALESCE(${topic !== undefined ? topic : null}, topic),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    logger.log(`[Admin Prompt Patch PATCH] Updated patch "${id}"`)

    return NextResponse.json({ success: true, patch: rows[0] })
  } catch (error) {
    console.error("[Admin Prompt Patch PATCH] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update patch" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/prompt-patches/[id]
 * Archive a patch.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const patch = await getPatchById(id)

    if (!patch) {
      return NextResponse.json(
        { success: false, error: "Patch not found" },
        { status: 404 }
      )
    }

    if (patch.status === "active") {
      await deactivatePatch(id)
    } else {
      await sql`
        UPDATE prompt_patches
        SET status = 'archived', updated_at = NOW()
        WHERE id = ${id}
      `
    }

    logger.log(`[Admin Prompt Patch DELETE] Archived patch "${patch.title}"`)

    return NextResponse.json({
      success: true,
      message: `Archived patch "${patch.title}"`,
    })
  } catch (error) {
    console.error("[Admin Prompt Patch DELETE] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to archive patch" },
      { status: 500 }
    )
  }
}
