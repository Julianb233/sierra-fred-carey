/**
 * Community Leave API Route
 * Phase 41: Founder Communities
 *
 * POST /api/communities/:id/leave - Leave a community
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMembership, leaveCommunity } from "@/lib/db/communities";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Community ID is required" },
        { status: 400 }
      );
    }

    // Check if user is a member
    const membership = await getMembership(id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Not a member of this community" },
        { status: 400 }
      );
    }

    // Creators cannot leave their own community -- they must delete it instead
    if (membership.role === "creator") {
      return NextResponse.json(
        {
          success: false,
          error: "Community creators cannot leave. Delete the community instead.",
        },
        { status: 400 }
      );
    }

    await leaveCommunity(id, userId);

    return NextResponse.json({
      success: true,
      message: "Successfully left the community",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Leave error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave community" },
      { status: 500 }
    );
  }
}
