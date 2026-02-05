import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";

/**
 * POST /api/ai/rating
 * Submit user rating for an AI response
 * Body: {
 *   responseId: string (required) - The AI response being rated
 *   rating: number (required) - 1-5 for stars, -1/1 for thumbs
 *   variant: "thumbs" | "stars" (optional, default: "stars")
 *   feedback?: {
 *     tags?: string[] - Predefined tags (helpful, accurate, unclear, wrong, incomplete)
 *     text?: string - Free-form text feedback
 *   }
 *   userId?: string - Optional user identifier
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      responseId,
      rating,
      variant = "stars",
      feedback = {},
      userId = null,
    } = body;

    // Validation
    if (!responseId) {
      return NextResponse.json(
        { success: false, error: "responseId is required" },
        { status: 400 }
      );
    }

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { success: false, error: "rating is required" },
        { status: 400 }
      );
    }

    // Validate rating based on variant
    if (variant === "thumbs") {
      if (rating !== -1 && rating !== 1) {
        return NextResponse.json(
          {
            success: false,
            error: "For thumbs variant, rating must be -1 (down) or 1 (up)",
          },
          { status: 400 }
        );
      }
    } else if (variant === "stars") {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json(
          {
            success: false,
            error: "For stars variant, rating must be an integer between 1 and 5",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'variant must be either "thumbs" or "stars"',
        },
        { status: 400 }
      );
    }

    // Validate feedback tags if provided
    const validTags = ["helpful", "accurate", "unclear", "wrong", "incomplete"];
    if (feedback.tags && Array.isArray(feedback.tags)) {
      const invalidTags = feedback.tags.filter(
        (tag: string) => !validTags.includes(tag)
      );
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

    console.log(`[AI Rating] Recording rating for response ${responseId}`, {
      rating,
      variant,
      hasTags: !!feedback.tags?.length,
      hasText: !!feedback.text,
    });

    // Verify the response exists (optional, depends on your schema)
    // Uncomment if you have an ai_responses table
    /*
    const responseCheck = await sql`
      SELECT id FROM ai_responses WHERE id = ${responseId}
    `;
    
    if (responseCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "AI response not found" },
        { status: 404 }
      );
    }
    */

    // Insert the rating
    const result = await sql`
      INSERT INTO ai_ratings (
        response_id,
        user_id,
        rating,
        variant,
        feedback_tags,
        feedback_text,
        created_at
      )
      VALUES (
        ${responseId},
        ${userId},
        ${rating},
        ${variant},
        ${feedback.tags ? JSON.stringify(feedback.tags) : null},
        ${feedback.text || null},
        NOW()
      )
      RETURNING
        id,
        response_id as "responseId",
        user_id as "userId",
        rating,
        variant,
        feedback_tags as "feedbackTags",
        feedback_text as "feedbackText",
        created_at as "createdAt"
    `;

    console.log(`[AI Rating] Saved rating ${result[0].id} for response ${responseId}`);

    return NextResponse.json({
      success: true,
      rating: result[0],
      message: "Rating submitted successfully",
    });
  } catch (error: any) {
    console.error("[AI Rating] Error:", error);

    // Handle specific database errors
    if (error.code === "42P01") {
      // Table does not exist
      return NextResponse.json(
        {
          success: false,
          error: "Ratings table not configured. Please run database migrations.",
        },
        { status: 500 }
      );
    }

    if (error.code === "23503") {
      // Foreign key violation
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response ID. The AI response may not exist.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/rating
 * Get ratings for a specific response or aggregate statistics
 * Query params:
 * - responseId: Get ratings for a specific response
 * - userId: Get ratings by a specific user
 * - aggregate: Set to "true" to get aggregate stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get("responseId");
    const userId = searchParams.get("userId");
    const aggregate = searchParams.get("aggregate") === "true";

    if (aggregate) {
      // Return aggregate statistics
      const stats = await sql`
        SELECT
          COUNT(*) as "totalRatings",
          AVG(rating) as "avgRating",
          variant,
          COUNT(DISTINCT user_id) as "uniqueUsers",
          COUNT(CASE WHEN feedback_text IS NOT NULL THEN 1 END) as "withFeedback"
        FROM ai_ratings
        GROUP BY variant
      `;

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    if (responseId) {
      // Get ratings for specific response
      const ratings = await sql`
        SELECT
          id,
          response_id as "responseId",
          user_id as "userId",
          rating,
          variant,
          feedback_tags as "feedbackTags",
          feedback_text as "feedbackText",
          created_at as "createdAt"
        FROM ai_ratings
        WHERE response_id = ${responseId}
        ORDER BY created_at DESC
      `;

      return NextResponse.json({
        success: true,
        ratings,
        total: ratings.length,
      });
    }

    if (userId) {
      // Get ratings by specific user
      const ratings = await sql`
        SELECT
          id,
          response_id as "responseId",
          rating,
          variant,
          feedback_tags as "feedbackTags",
          feedback_text as "feedbackText",
          created_at as "createdAt"
        FROM ai_ratings
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return NextResponse.json({
        success: true,
        ratings,
        total: ratings.length,
      });
    }

    // If no filters, return recent ratings
    const recentRatings = await sql`
      SELECT
        id,
        response_id as "responseId",
        user_id as "userId",
        rating,
        variant,
        feedback_tags as "feedbackTags",
        created_at as "createdAt"
      FROM ai_ratings
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      ratings: recentRatings,
      total: recentRatings.length,
    });
  } catch (error) {
    console.error("[AI Rating GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
