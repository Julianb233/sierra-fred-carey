import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/check-ins
 * List user's check-ins
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    // SECURITY: Always use authenticated userId, ignore client-provided userId param
    const checkIns = await sql`
      SELECT
        id,
        user_id as "userId",
        responses,
        score,
        analysis,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM check_ins
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      data: checkIns,
      total: checkIns.length,
    });
  } catch (error: any) {
    if (error instanceof Response || (error && typeof error.status === 'number' && typeof error.json === 'function')) {
      return error;
    }
    console.error("Check-ins fetch error:", error);

    // Return empty list for any DB error so the frontend renders empty state
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
    });
  }
}

/**
 * POST /api/check-ins
 * Create a new check-in
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { responses, score, analysis } = body;

    // Input validation
    const validatedScore = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    const validatedAnalysis = typeof analysis === 'string' ? analysis.slice(0, 5000) : null;
    const validatedResponses = typeof responses === 'object' && responses !== null ? responses : {};

    const result = await sql`
      INSERT INTO check_ins (user_id, responses, score, analysis, created_at)
      VALUES (
        ${userId},
        ${JSON.stringify(validatedResponses)},
        ${validatedScore},
        ${validatedAnalysis},
        NOW()
      )
      RETURNING
        id,
        user_id as "userId",
        responses,
        score,
        analysis,
        created_at as "createdAt"
    `;

    return NextResponse.json(
      {
        success: true,
        data: result[0],
        message: "Check-in created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Check-in create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create check-in" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/check-ins
 * Update a check-in
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function PATCH(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { id, responses, score, analysis } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Check-in ID is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE check_ins
      SET
        responses = COALESCE(${responses ? JSON.stringify(responses) : null}, responses),
        score = COALESCE(${score}, score),
        analysis = COALESCE(${analysis}, analysis),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING
        id,
        user_id as "userId",
        responses,
        score,
        analysis,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Check-in not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: "Check-in updated successfully",
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Check-in update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update check-in" },
      { status: 500 }
    );
  }
}
