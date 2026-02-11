/**
 * Community Members API Routes
 * Phase 41: Founder Communities (Step 8)
 *
 * GET    /api/communities/[slug]/members - List members
 * POST   /api/communities/[slug]/members - Join community
 * DELETE /api/communities/[slug]/members - Leave community (or moderator removes)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  getCommunityMembers,
  joinCommunity,
  leaveCommunity,
} from "@/lib/db/communities";
import { checkCommunitiesEnabled } from "@/lib/communities/sanitize";
import { checkRateLimitForUser } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// ============================================================================
// GET /api/communities/[slug]/members
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const disabled = checkCommunitiesEnabled();
  if (disabled) return disabled;

  try {
    const userId = await requireAuth();
    const { slug } = await params;

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Membership check: only members can view the member list
    const viewerMembership = await getMembership(community.id, userId);
    if (!viewerMembership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to view the member list" },
        { status: 403 }
      );
    }

    const members = await getCommunityMembers(community.id, { limit, offset });

    return NextResponse.json({
      success: true,
      data: members,
      total: community.memberCount,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET members error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/communities/[slug]/members - Join community
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const disabled = checkCommunitiesEnabled();
  if (disabled) return disabled;

  try {
    const userId = await requireAuth();

    // Rate limit join requests
    const userTier = await getUserTier(userId);
    const tierKey = userTier >= UserTier.STUDIO ? "studio" : userTier >= UserTier.PRO ? "pro" : "free";
    const { response: rateLimitResponse } = await checkRateLimitForUser(request, userId, tierKey);
    if (rateLimitResponse) return rateLimitResponse;

    const { slug } = await params;

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.isArchived) {
      return NextResponse.json(
        { success: false, error: "This community is no longer active" },
        { status: 400 }
      );
    }

    // Check if already a member
    const existing = await getMembership(community.id, userId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already a member of this community" },
        { status: 409 }
      );
    }

    const membership = await joinCommunity(community.id, userId);

    return NextResponse.json(
      {
        success: true,
        data: membership,
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

// ============================================================================
// DELETE /api/communities/[slug]/members - Leave community (or remove member)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const disabled = checkCommunitiesEnabled();
  if (disabled) return disabled;

  try {
    const userId = await requireAuth();
    const { slug } = await params;

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Determine target user: ?userId=xxx for moderator removing someone, else self
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || userId;

    // If removing someone else, check that the requester is owner/moderator
    if (targetUserId !== userId) {
      const requesterMembership = await getMembership(community.id, userId);
      if (
        !requesterMembership ||
        !["owner", "moderator"].includes(requesterMembership.role)
      ) {
        return NextResponse.json(
          { success: false, error: "Only owner or moderators can remove members" },
          { status: 403 }
        );
      }

      // Cannot remove the creator
      const targetMembership = await getMembership(community.id, targetUserId);
      if (targetMembership?.role === "owner") {
        return NextResponse.json(
          { success: false, error: "Cannot remove the community owner" },
          { status: 400 }
        );
      }
    }

    // Owner cannot leave their own community
    const membership = await getMembership(community.id, targetUserId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "User is not a member of this community" },
        { status: 400 }
      );
    }

    if (targetUserId === userId && membership.role === "owner") {
      return NextResponse.json(
        {
          success: false,
          error: "Community owner cannot leave. Archive the community instead.",
        },
        { status: 400 }
      );
    }

    await leaveCommunity(community.id, targetUserId);

    return NextResponse.json({
      success: true,
      message: "Successfully left the community",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Leave/remove error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave community" },
      { status: 500 }
    );
  }
}
