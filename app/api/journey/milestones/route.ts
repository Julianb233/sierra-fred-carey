import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

const VALID_CATEGORIES = ["fundraising", "product", "team", "growth", "legal"];
const VALID_STATUSES = ["pending", "in_progress", "completed", "skipped"];

/**
 * GET /api/journey/milestones
 * List user's milestones with optional filters
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Query with optional filters using COALESCE pattern
    const milestones = await sql`
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
      WHERE user_id = ${userId}
        AND (${category}::text IS NULL OR category = ${category})
        AND (${status}::text IS NULL OR status = ${status})
      ORDER BY
        CASE status
          WHEN 'in_progress' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'skipped' THEN 4
        END,
        target_date ASC NULLS LAST,
        created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      data: milestones,
      meta: { count: milestones.length, limit }
    });
  } catch (error) {
    console.error("[GET /api/journey/milestones]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journey/milestones
 * Create a new milestone
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { title, description, category, targetDate, metadata = {} } = body;

    if (!title || !category) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, category" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO milestones (
        user_id, title, description, category, target_date, metadata
      )
      VALUES (
        ${userId}, ${title}, ${description || null}, ${category},
        ${targetDate || null}, ${JSON.stringify(metadata)}
      )
      RETURNING
        id,
        user_id as "userId",
        title,
        description,
        category,
        status,
        target_date as "targetDate",
        created_at as "createdAt"
    `;

    // Log journey event
    await sql`
      INSERT INTO journey_events (user_id, event_type, event_data)
      VALUES (${userId}, 'milestone_created', ${JSON.stringify({
        milestoneId: result[0].id,
        title,
        category
      })})
    `;

    return NextResponse.json(
      { success: true, data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/journey/milestones]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
