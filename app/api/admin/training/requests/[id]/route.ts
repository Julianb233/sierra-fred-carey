import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * Helper: run a query and return a fallback on table-not-found errors
 */
async function safeQuery<T = any>(query: Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await query;
  } catch (err: any) {
    const msg = err?.message || "";
    if (err?.code === "42P01" || msg.includes("does not exist") || msg.includes("relation")) {
      return fallback;
    }
    throw err;
  }
}

/**
 * GET /api/admin/training/requests/[id]
 * Get detailed information about a specific AI request, including its response and any ratings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: requestId } = await params;

    logger.log(`[Admin Training Request Detail GET] Fetching request ${requestId}`);

    // Fetch the request
    const requestResult = await safeQuery(
      sql`
        SELECT
          id,
          user_id as "userId",
          analyzer,
          model,
          input_data as "inputData",
          user_prompt as "userPrompt",
          system_prompt as "systemPrompt",
          prompt_version as "promptVersion",
          variant_id as "variantId",
          temperature,
          max_tokens as "maxTokens",
          created_at as "createdAt"
        FROM ai_requests
        WHERE id = ${requestId}
      `
    );

    if (requestResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const aiRequest = requestResult[0];

    // Fetch associated response(s)
    const responses = await safeQuery(
      sql`
        SELECT
          id,
          request_id as "requestId",
          response_text as "responseText",
          parsed_response as "parsedResponse",
          tokens_used as "tokensUsed",
          latency_ms as "latencyMs",
          provider,
          error,
          created_at as "createdAt"
        FROM ai_responses
        WHERE request_id = ${requestId}
        ORDER BY created_at DESC
      `
    );

    // Fetch ratings for the associated response(s)
    let ratings: any[] = [];
    if (responses.length > 0) {
      // Get ratings for each response
      for (const response of responses) {
        const responseRatings = await safeQuery(
          sql`
            SELECT
              id,
              response_id as "responseId",
              user_id as "userId",
              rating_type as "ratingType",
              rating_value as "ratingValue",
              feedback_tags as "feedbackTags",
              feedback_text as "feedbackText",
              session_id as "sessionId",
              created_at as "createdAt"
            FROM ai_ratings
            WHERE response_id = ${response.id}
            ORDER BY created_at DESC
          `
        );
        ratings = ratings.concat(responseRatings);
      }
    }

    return NextResponse.json({
      success: true,
      request: aiRequest,
      responses,
      ratings,
    });
  } catch (error) {
    console.error("[Admin Training Request Detail GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch request details" },
      { status: 500 }
    );
  }
}
