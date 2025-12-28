import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";

// GET: Get single milestone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

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
      FROM user_milestones
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

// PATCH: Update milestone - temporarily simplified
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "Milestone update endpoint temporarily unavailable" },
    { status: 503 }
  );
}

// DELETE: Delete milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM user_milestones
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
