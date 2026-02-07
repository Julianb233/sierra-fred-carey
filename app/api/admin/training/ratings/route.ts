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
 * GET /api/admin/training/ratings
 * Retrieve user ratings on AI responses for admin review.
 * Query params:
 * - limit: max results (default 50, max 200)
 * - responseId: filter by specific response
 * - ratingType: filter by "thumbs" or "stars"
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    logger.log("[Admin Training Ratings GET] Fetching ratings");

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get("responseId");
    const ratingType = searchParams.get("ratingType");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50", 10) || 50, 200);

    // Aggregate stats across all ratings
    const statsResult = await safeQuery(
      sql`
        SELECT
          COUNT(*) as total_ratings
        FROM ai_ratings
      `
    );

    const totalRatings = parseInt(statsResult[0]?.total_ratings || "0", 10);

    // Fetch individual ratings with optional filters
    let ratings: any[];

    if (responseId) {
      ratings = await safeQuery(
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
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM ai_ratings
          WHERE response_id = ${responseId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    } else if (ratingType) {
      ratings = await safeQuery(
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
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM ai_ratings
          WHERE rating_type = ${ratingType}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    } else {
      ratings = await safeQuery(
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
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM ai_ratings
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    }

    return NextResponse.json({
      success: true,
      ratings,
      total: totalRatings,
      returned: ratings.length,
    });
  } catch (error) {
    console.error("[Admin Training Ratings GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/training/ratings
 * Submit an admin rating for an AI response (for training data labeling).
 * Body: {
 *   responseId: string (required) - The AI response being rated
 *   ratingType: "thumbs" | "stars" (required)
 *   ratingValue: number (required) - -1/1 for thumbs, 1-5 for stars
 *   feedbackTags?: string[] - Tags: helpful, accurate, unclear, wrong, incomplete
 *   feedbackText?: string - Free-form text feedback
 * }
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      responseId,
      ratingType,
      ratingValue,
      feedbackTags = [],
      feedbackText = null,
    } = body;

    // Validation
    if (!responseId) {
      return NextResponse.json(
        { success: false, error: "responseId is required" },
        { status: 400 }
      );
    }

    if (!ratingType || !["thumbs", "stars"].includes(ratingType)) {
      return NextResponse.json(
        { success: false, error: "ratingType must be 'thumbs' or 'stars'" },
        { status: 400 }
      );
    }

    if (ratingValue === undefined || ratingValue === null) {
      return NextResponse.json(
        { success: false, error: "ratingValue is required" },
        { status: 400 }
      );
    }

    // Validate rating value based on type
    if (ratingType === "thumbs" && ratingValue !== -1 && ratingValue !== 1) {
      return NextResponse.json(
        { success: false, error: "For thumbs, ratingValue must be -1 (down) or 1 (up)" },
        { status: 400 }
      );
    }

    if (ratingType === "stars" && (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5)) {
      return NextResponse.json(
        { success: false, error: "For stars, ratingValue must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate feedback tags
    const validTags = ["helpful", "accurate", "unclear", "wrong", "incomplete"];
    if (Array.isArray(feedbackTags) && feedbackTags.length > 0) {
      const invalidTags = feedbackTags.filter((tag: string) => !validTags.includes(tag));
      if (invalidTags.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid feedback tags: ${invalidTags.join(", ")}. Valid tags: ${validTags.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    logger.log(`[Admin Training Ratings POST] Recording ${ratingType} rating for response ${responseId}`);

    const result = await safeQuery(
      sql`
        INSERT INTO ai_ratings (
          response_id,
          rating_type,
          rating_value,
          feedback_tags,
          feedback_text,
          session_id
        )
        VALUES (
          ${responseId},
          ${ratingType},
          ${ratingValue},
          ${JSON.stringify(feedbackTags)},
          ${feedbackText},
          ${"admin-training"}
        )
        RETURNING
          id,
          response_id as "responseId",
          rating_type as "ratingType",
          rating_value as "ratingValue",
          feedback_tags as "feedbackTags",
          feedback_text as "feedbackText",
          created_at as "createdAt"
      `
    );

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to save rating - ai_ratings table may not exist" },
        { status: 500 }
      );
    }

    logger.log(`[Admin Training Ratings POST] Saved rating ${result[0].id}`);

    return NextResponse.json(
      {
        success: true,
        rating: result[0],
        message: "Rating submitted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin Training Ratings POST] Error:", error);

    // Handle foreign key violation (invalid responseId)
    if (error?.code === "23503") {
      return NextResponse.json(
        { success: false, error: "Invalid responseId. The AI response does not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}
