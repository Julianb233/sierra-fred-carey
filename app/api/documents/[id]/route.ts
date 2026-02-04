import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/documents/[id]
 * Get a specific document by ID
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const { id } = await params;

    const result = await sql`
      SELECT
        id,
        title,
        type,
        content,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM documents
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document: result[0] });
  } catch (error) {
    console.error("[Document GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Update a document's title or content
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    if (!title && !content) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update with the fields provided
    let result;
    if (title && content) {
      result = await sql`
        UPDATE documents
        SET title = ${title}, content = ${content}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, title, type, content, status, created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else if (title) {
      result = await sql`
        UPDATE documents
        SET title = ${title}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, title, type, content, status, created_at as "createdAt", updated_at as "updatedAt"
      `;
    } else {
      result = await sql`
        UPDATE documents
        SET content = ${content}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, title, type, content, status, created_at as "createdAt", updated_at as "updatedAt"
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document: result[0] });
  } catch (error) {
    console.error("[Document PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const { id } = await params;

    const result = await sql`
      DELETE FROM documents
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("[Document DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
