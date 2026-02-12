/**
 * Document Review with Fred API
 * Phase 44: Document Repository
 *
 * POST /api/documents/review
 * Takes a document ID, validates ownership, and returns a redirect URL
 * to the chat page with document context pre-loaded.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { sql } from "@/lib/db/supabase-sql";
import { getDocumentById, getDocumentChunks } from "@/lib/db/documents";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const body = await request.json();
    const { documentId, source } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      );
    }

    // Check both document tables — AI-generated (documents) and uploaded (uploaded_documents)
    let documentName: string | null = null;
    let documentContent: string | null = null;
    let documentType: string | null = null;

    if (source === "uploaded") {
      // Uploaded document — get from uploaded_documents via lib
      const uploadedDoc = await getDocumentById(userId, documentId);
      if (uploadedDoc) {
        documentName = uploadedDoc.name;
        documentType = uploadedDoc.type;

        // Get content from chunks
        const chunks = await getDocumentChunks(documentId);
        if (chunks.length > 0) {
          documentContent = chunks
            .sort((a, b) => a.chunkIndex - b.chunkIndex)
            .map((c) => c.content)
            .join("\n\n");
        }
      }
    } else {
      // AI-generated document — get from documents table
      const result = await sql`
        SELECT id, title, type, content
        FROM documents
        WHERE id = ${documentId} AND user_id = ${userId}
      `;
      if (result.length > 0) {
        documentName = result[0].title;
        documentType = result[0].type;
        documentContent = result[0].content;
      }
    }

    if (!documentName) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Build the review prompt that will be sent as the first message
    const contentPreview = documentContent
      ? documentContent.substring(0, 3000)
      : "(No content available)";

    const reviewMessage = `Please review this document: "${documentName}" (${documentType || "document"}).\n\nHere is the content:\n\n${contentPreview}${
      documentContent && documentContent.length > 3000
        ? "\n\n[Document truncated - showing first 3000 characters]"
        : ""
    }`;

    // Return redirect URL with encoded review message
    const chatUrl = `/chat?reviewDoc=${encodeURIComponent(documentId)}&reviewMessage=${encodeURIComponent(reviewMessage)}`;

    return NextResponse.json({
      success: true,
      chatUrl,
      documentName,
      documentType,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Document Review] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to prepare document review" },
      { status: 500 }
    );
  }
}
