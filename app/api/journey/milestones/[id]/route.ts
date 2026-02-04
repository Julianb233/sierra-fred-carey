import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/journey/milestones/[id]
 * Get single milestone
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { id } = await params;

    const [milestone] = await sql`
      SELECT
        id,
        user_id as "userId",
        title,
        description,
        category,
        status,
        target_date as "targetDate",
        completed_at as "completedAt",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM milestones
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (!milestone) {
      return NextResponse.json(
        { success: false, error: "Milestone not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: milestone
    });

  } catch (error) {
    console.error("[GET /api/journey/milestones/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/journey/milestones/[id]
 * Update milestone
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { id } = await params;
    const body = await request.json();

    // Allowed fields to update
    const { title, description, category, status, targetDate, metadata } = body;

    // Validation
    const VALID_CATEGORIES = ["fundraising", "product", "team", "growth", "legal"];
    const VALID_STATUSES = ["pending", "in_progress", "completed", "skipped"];

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if at least one field is provided
    if (title === undefined && description === undefined && category === undefined &&
        status === undefined && targetDate === undefined && metadata === undefined) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Fetch current milestone first
    const [current] = await sql`
      SELECT * FROM milestones
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (!current) {
      return NextResponse.json(
        { success: false, error: "Milestone not found or unauthorized" },
        { status: 404 }
      );
    }

    // Prepare updated values (use current value if not provided)
    const updatedTitle = title !== undefined ? title : current.title;
    const updatedDescription = description !== undefined ? description : current.description;
    const updatedCategory = category !== undefined ? category : current.category;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedTargetDate = targetDate !== undefined ? targetDate : current.target_date;
    const updatedMetadata = metadata !== undefined ? JSON.stringify(metadata) : current.metadata;

    // Calculate completed_at based on status change
    let updatedCompletedAt = current.completed_at;
    if (status === "completed" && current.status !== "completed") {
      updatedCompletedAt = new Date();
    } else if (status && status !== "completed") {
      updatedCompletedAt = null;
    }

    // Execute update
    const [updated] = await sql`
      UPDATE milestones
      SET
        title = ${updatedTitle},
        description = ${updatedDescription},
        category = ${updatedCategory},
        status = ${updatedStatus},
        target_date = ${updatedTargetDate},
        metadata = ${updatedMetadata},
        completed_at = ${updatedCompletedAt}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING
        id,
        user_id as "userId",
        title,
        description,
        category,
        status,
        target_date as "targetDate",
        completed_at as "completedAt",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update milestone" },
        { status: 500 }
      );
    }

    // Log journey event if status changed to completed
    if (status === "completed" && current.status !== "completed") {
      await sql`
        INSERT INTO journey_events (user_id, event_type, event_data)
        VALUES (${userId}, 'milestone_achieved', ${JSON.stringify({
          milestoneId: id,
          title: updated.title,
          category: updated.category
        })})
      `;
    }

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error("[PATCH /api/journey/milestones/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/journey/milestones/[id]
 * Delete milestone
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM milestones
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Milestone not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: deleted.id }
    });

  } catch (error) {
    console.error("[DELETE /api/journey/milestones/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
