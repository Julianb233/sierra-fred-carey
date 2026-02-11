/**
 * Community Join API Route
 * Phase 41: Founder Communities
 *
 * POST /api/communities/:id/join - Join a community
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCommunity,
  getMembership,
  joinCommunity,
} from "@/lib/db/communities";

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

    // Check community exists and is active
    const community = await getCommunity(id);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    if (!community.isActive) {
      return NextResponse.json(
        { success: false, error: "This community is no longer active" },
        { status: 400 }
      );
    }

    // Check if already a member
    const existing = await getMembership(id, userId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already a member of this community" },
        { status: 409 }
      );
    }

    const membership = await joinCommunity(id, userId);

    return NextResponse.json(
      {
        success: true,
        membership: {
          role: membership.role,
          joinedAt: membership.joinedAt,
        },
        message: "Successfully joined the community",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Join error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join community" },
      { status: 500 }
    );
  }
}
