import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/journey/timeline
 * Unified timeline of all journey events
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event_type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const events = await sql`
      SELECT
        id,
        user_id as "userId",
        event_type as "eventType",
        event_data as "eventData",
        score_before as "scoreBefore",
        score_after as "scoreAfter",
        created_at as "createdAt"
      FROM journey_events
      WHERE user_id = ${userId}
        AND (${eventType}::text IS NULL OR event_type = ${eventType})
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      data: events,
      meta: { limit, offset, count: events.length }
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[GET /api/journey/timeline]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journey/timeline
 * Create a journey event
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { eventType, eventData = {}, scoreBefore, scoreAfter } = body;

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: "Missing eventType" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO journey_events (
        user_id, event_type, event_data, score_before, score_after
      )
      VALUES (
        ${userId}, ${eventType}, ${JSON.stringify(eventData)},
        ${scoreBefore || null}, ${scoreAfter || null}
      )
      RETURNING
        id,
        user_id as "userId",
        event_type as "eventType",
        event_data as "eventData",
        score_before as "scoreBefore",
        score_after as "scoreAfter",
        created_at as "createdAt"
    `;

    return NextResponse.json(
      { success: true, data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[POST /api/journey/timeline]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create event" },
      { status: 500 }
    );
  }
}
