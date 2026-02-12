/**
 * Document Repository Single Document API
 * Phase 44: Document Repository
 *
 * GET    /api/document-repository/[id]  — Get single document
 * DELETE /api/document-repository/[id]  — Delete document + storage file
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDocument, deleteDocument } from "@/lib/documents/repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/document-repository/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const document = await getDocument(userId, id);

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[DocumentRepository GET /id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/document-repository/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const deleted = await deleteDocument(userId, id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[DocumentRepository DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
