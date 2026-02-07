import { NextRequest, NextResponse } from "next/server";
import { parsePDFFromUrl, PDFParseError, ParsedDeck } from "@/lib/parsers/pdf-parser";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import {
  storeChunks,
  updateDocumentStatus,
  updateDocumentMetadata,
} from "@/lib/db/documents";
import type { Chunk } from "@/lib/documents/types";
import { logger } from "@/lib/logger";

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Success response structure
 */
interface SuccessResponse {
  success: true;
  parsed: ParsedDeck;
  chunksStored?: boolean;
}

type ParseResponse = SuccessResponse | ErrorResponse;

/**
 * Request body structure
 */
interface ParseRequest {
  fileUrl: string;
  documentId?: string;
}

/**
 * POST /api/pitch-deck/parse
 * Parse an uploaded PDF pitch deck from a URL
 *
 * SECURITY: Requires authentication - userId from server-side session
 *
 * @param request - JSON body with fileUrl
 * @returns Parsed deck structure with slides and metadata
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ParseResponse>> {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    // SECURITY: Require Pro tier for pitch deck parsing
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      }) as NextResponse<ParseResponse>;
    }

    logger.log(`[PDF Parse] Request from user: ${userId}`);

    // Parse JSON body
    const body = (await request.json()) as ParseRequest;

    // Validate request body
    if (!body.fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing fileUrl",
          details: 'Request body must include a "fileUrl" field',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.fileUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid URL",
          details: "The provided fileUrl is not a valid URL",
        },
        { status: 400 }
      );
    }

    logger.log(`[PDF Parse] Parsing PDF from: ${body.fileUrl}`);

    // Parse the PDF from the URL
    const parsed = await parsePDFFromUrl(body.fileUrl);

    logger.log(
      `[PDF Parse] Successfully parsed ${parsed.totalPages} pages, ${parsed.fullText.length} characters`
    );

    // If documentId is provided, save chunks to the database so the
    // pitch-review endpoint can find them later.
    let chunksStored = false;
    if (body.documentId) {
      try {
        logger.log(`[PDF Parse] Storing chunks for document ${body.documentId}`);

        // Convert parsed slides into Chunk format for storage
        const chunks: (Chunk & { embedding: number[] })[] = parsed.slides.map(
          (slide, index) => ({
            index,
            content: slide.text,
            pageNumber: slide.pageNumber,
            section: undefined,
            tokenCount: slide.wordCount,
            metadata: {},
            // Empty embedding -- the review endpoint does not require embeddings,
            // and generating real ones would slow down the parse response.
            // Vector search is handled separately by the documents/upload pipeline.
            embedding: [],
          })
        );

        if (chunks.length > 0) {
          await storeChunks(body.documentId, chunks);

          // Update document metadata and status to 'ready'
          await updateDocumentMetadata(
            body.documentId,
            {
              title: parsed.metadata.title,
              author: parsed.metadata.author,
              creationDate: parsed.metadata.createdAt,
            },
            parsed.totalPages
          );
          await updateDocumentStatus(body.documentId, "ready");
          chunksStored = true;

          logger.log(
            `[PDF Parse] Stored ${chunks.length} chunks for document ${body.documentId}`
          );
        }
      } catch (storeError) {
        // Log but don't fail the parse response -- chunks can be retried
        console.error("[PDF Parse] Failed to store chunks:", storeError);
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        parsed,
        chunksStored,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle PDF parsing errors (400 Bad Request)
    if (error instanceof PDFParseError) {
      console.error("[PDF Parse] Parse error:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: "PDF parsing failed",
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          details: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    // Return auth errors directly
    if (error instanceof Response) return error as NextResponse<ParseResponse>;

    // Handle all other errors (500 Internal Server Error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[PDF Parse] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Parse failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/pitch-deck/parse
 * CORS preflight handler
 */
export async function OPTIONS(): Promise<NextResponse> {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
