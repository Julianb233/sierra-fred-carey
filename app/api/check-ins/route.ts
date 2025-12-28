import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";

export async function GET(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const { searchParams } = new URL(request.url);
    const userFilter = searchParams.get("userId") || userId;

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
      WHERE user_id = ${userFilter}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      data: checkIns,
      total: checkIns.length,
    });
  } catch (error) {
    console.error("Check-ins fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const body = await request.json();
    const { responses, score, analysis } = body;

    const result = await sql`
      INSERT INTO check_ins (user_id, responses, score, analysis, created_at)
      VALUES (
        ${userId},
        ${JSON.stringify(responses || {})},
        ${score || 0},
        ${analysis || null},
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
    console.error("Check-in create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create check-in" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

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
    console.error("Check-in update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update check-in" },
      { status: 500 }
    );
  }
}
