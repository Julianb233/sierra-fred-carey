import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";

const VALID_CATEGORIES = ["advice", "data", "quote", "action_item", "resource"];

/**
 * GET /api/journey/references
 * List user's saved references
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActionedParam = searchParams.get("is_actioned");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const references = await sql`
      SELECT
        id,
        user_id as "userId",
        source_type as "sourceType",
        source_id as "sourceId",
        title,
        content,
        context,
        category,
        is_actioned as "isActioned",
        created_at as "createdAt"
      FROM user_references
      WHERE user_id = ${userId}
        AND (${category}::text IS NULL OR category = ${category})
        AND (${isActionedParam}::text IS NULL OR is_actioned = ${isActionedParam === "true"})
      ORDER BY
        is_actioned ASC,
        created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      data: references,
      meta: { count: references.length, limit }
    });
  } catch (error) {
    console.error("[GET /api/journey/references]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch references" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journey/references
 * Save a reference from AI conversation
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { sourceType, sourceId, title, content, context, category } = body;

    if (!sourceType || !title || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: sourceType, title, content" },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO user_references (
        user_id, source_type, source_id, title, content, context, category
      )
      VALUES (
        ${userId}, ${sourceType}, ${sourceId || null}, ${title},
        ${content}, ${context || null}, ${category || null}
      )
      RETURNING
        id,
        user_id as "userId",
        source_type as "sourceType",
        source_id as "sourceId",
        title,
        content,
        context,
        category,
        is_actioned as "isActioned",
        created_at as "createdAt"
    `;

    return NextResponse.json(
      { success: true, data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/journey/references]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save reference" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/journey/references
 * Mark reference as actioned
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function PATCH(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { id, is_actioned } = body;

    if (!id || typeof is_actioned !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing id or is_actioned boolean" },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE user_references
      SET is_actioned = ${is_actioned}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING
        id,
        title,
        is_actioned as "isActioned"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Reference not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("[PATCH /api/journey/references]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update reference" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/journey/references
 * Remove a reference
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id query parameter" },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM user_references
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Reference not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Reference deleted" });
  } catch (error) {
    console.error("[DELETE /api/journey/references]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete reference" },
      { status: 500 }
    );
  }
}
