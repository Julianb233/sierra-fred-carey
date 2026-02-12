/**
 * "Review with Fred" API
 * Phase 44: Document Repository
 *
 * POST /api/document-repository/[id]/review
 * Returns the document content formatted for loading into FRED chat context.
 * The frontend uses this to pre-populate the chat with document content
 * so FRED can analyze and review the document.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDocumentContent } from "@/lib/documents/repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/document-repository/[id]/review
 *
 * Returns:
 * - title: document title
 * - content: full text content of the document
 * - fileType: MIME type or content type
 * - reviewPrompt: a pre-built message to send to FRED chat
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const docContent = await getDocumentContent(userId, id);

    if (!docContent) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Truncate very large documents to keep chat context manageable
    const MAX_CONTENT_LENGTH = 50_000;
    const truncated = docContent.content.length > MAX_CONTENT_LENGTH;
    const content = truncated
      ? docContent.content.substring(0, MAX_CONTENT_LENGTH) + "\n\n[... content truncated for review ...]"
      : docContent.content;

    // Build the review prompt that the frontend will send to FRED
    const reviewPrompt = buildReviewPrompt(docContent.title, content, docContent.fileType);

    return NextResponse.json({
      success: true,
      title: docContent.title,
      content,
      fileType: docContent.fileType,
      truncated,
      reviewPrompt,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[DocumentRepository Review]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load document for review" },
      { status: 500 }
    );
  }
}

/**
 * Build a structured prompt for FRED to review the document.
 */
function buildReviewPrompt(
  title: string,
  content: string,
  fileType: string | null
): string {
  const docType = inferDocumentType(title, fileType);

  return [
    `I'd like you to review my document: "${title}"`,
    "",
    `Document type: ${docType}`,
    "",
    "--- DOCUMENT CONTENT ---",
    content,
    "--- END DOCUMENT ---",
    "",
    "Please review this document and provide:",
    "1. A brief overall assessment (strengths and weaknesses)",
    "2. Specific suggestions for improvement",
    "3. Any red flags or concerns an investor/advisor would raise",
    "4. Next 3 Actions to improve this document",
  ].join("\n");
}

function inferDocumentType(title: string, fileType: string | null): string {
  const lower = title.toLowerCase();

  if (/pitch[\s_-]?deck|investor[\s_-]?deck/i.test(lower)) return "Pitch Deck";
  if (/strategy|gtm|go[\s_-]?to[\s_-]?market/i.test(lower)) return "Strategy Document";
  if (/financial|revenue|projection/i.test(lower)) return "Financial Document";
  if (/competitive[\s_-]?analysis/i.test(lower)) return "Competitive Analysis";
  if (/memo/i.test(lower)) return "Investor Memo";
  if (/report/i.test(lower)) return "Report";

  if (fileType?.includes("presentation")) return "Presentation";
  if (fileType?.includes("spreadsheet")) return "Spreadsheet";
  if (fileType?.includes("pdf")) return "PDF Document";

  return "Document";
}
