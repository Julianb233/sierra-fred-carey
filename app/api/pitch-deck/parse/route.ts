import { NextRequest, NextResponse } from "next/server";
import { parsePDFFromUrl, PDFParseError, ParsedDeck } from "@/lib/parsers/pdf-parser";
import { requireAuth } from "@/lib/auth";

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
}

type ParseResponse = SuccessResponse | ErrorResponse;

/**
 * Request body structure
 */
interface ParseRequest {
  fileUrl: string;
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

    console.log(`[PDF Parse] Request from user: ${userId}`);

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

    console.log(`[PDF Parse] Parsing PDF from: ${body.fileUrl}`);

    // Parse the PDF from the URL
    const parsed = await parsePDFFromUrl(body.fileUrl);

    console.log(
      `[PDF Parse] Successfully parsed ${parsed.totalPages} pages, ${parsed.fullText.length} characters`
    );

    // Return success response
    return NextResponse.json(
      {
        success: true,
        parsed,
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
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-User-ID",
    },
  });
}
