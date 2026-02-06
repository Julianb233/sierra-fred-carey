/**
 * Boardy Callback API Route
 * Phase 04: Studio Tier Features - Plan 06
 *
 * POST /api/boardy/callback - Update match status
 *
 * Used for:
 * 1. Client-side status updates (user actions)
 * 2. Future Boardy webhook callbacks when real API is integrated
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getMatchById, updateMatchStatus } from "@/lib/db/boardy";
import { isValidMatchStatus } from "@/lib/boardy/types";

// ============================================================================
// Request Validation
// ============================================================================

const callbackSchema = z.object({
  matchId: z.string().uuid("matchId must be a valid UUID"),
  status: z.string().refine(isValidMatchStatus, {
    message: "status must be one of: suggested, connected, intro_sent, meeting_scheduled, declined",
  }),
});

// ============================================================================
// POST /api/boardy/callback - Update match status
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = callbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { matchId, status } = parsed.data;

    // 3. Verify match exists and belongs to user
    const match = await getMatchById(matchId);
    if (!match) {
      // Return 404 for both non-existent and other-user matches (security)
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.userId !== userId) {
      // Return 404 instead of 403 to not reveal match exists for other user
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // 4. Update match status
    const updatedMatch = await updateMatchStatus(
      matchId,
      status as "suggested" | "connected" | "intro_sent" | "meeting_scheduled" | "declined"
    );

    return NextResponse.json({
      success: true,
      match: updatedMatch,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error("[Boardy Callback] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update match status" },
      { status: 500 }
    );
  }
}
