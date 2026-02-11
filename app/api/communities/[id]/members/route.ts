/**
 * Community Members API Route
 * Phase 41: Founder Communities
 *
 * GET /api/communities/:id/members - List members with roles
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCommunity, getCommunityMembers } from "@/lib/db/communities";

// ============================================================================
// GET /api/communities/:id/members
// ============================================================================

export async function GET(
  request: NextRequest,
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

    // Verify community exists
    const community = await getCommunity(id);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const members = await getCommunityMembers(id, { limit, offset });

    return NextResponse.json({
      success: true,
      members,
      count: members.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] List members error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
