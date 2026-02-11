/**
 * Post Reactions API Routes
 * Phase 41: Founder Communities (Step 11)
 *
 * POST /api/communities/[slug]/posts/[postId]/reactions - Toggle reaction
 * GET  /api/communities/[slug]/posts/[postId]/reactions - List reactions
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  getPost,
  toggleReaction,
  getReactions,
} from "@/lib/db/communities";
import { checkCommunitiesEnabled } from "@/lib/communities/sanitize";
import { checkRateLimitForUser } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Validation
// ============================================================================

const ALLOWED_REACTION_TYPES = ["like", "insightful", "support"] as const;

const reactSchema = z.object({
  reactionType: z
    .enum(ALLOWED_REACTION_TYPES)
    .optional()
    .default("like"),
});

// ============================================================================
// POST /api/communities/[slug]/posts/[postId]/reactions
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const disabled = checkCommunitiesEnabled();
  if (disabled) return disabled;

  try {
    const userId = await requireAuth();

    // Rate limit reactions
    const userTier = await getUserTier(userId);
    const tierKey = userTier >= UserTier.STUDIO ? "studio" : userTier >= UserTier.PRO ? "pro" : "free";
    const { response: rateLimitResponse } = await checkRateLimitForUser(request, userId, tierKey);
    if (rateLimitResponse) return rateLimitResponse;

    const { slug, postId } = await params;

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Must be a member to react
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to react" },
        { status: 403 }
      );
    }

    const post = await getPost(postId);
    if (!post || post.communityId !== community.id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = reactSchema.safeParse(body);
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

    const { added } = await toggleReaction(
      postId,
      userId,
      parsed.data.reactionType
    );

    return NextResponse.json({
      success: true,
      data: { added },
      message: added ? "Reaction added" : "Reaction removed",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] React error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/communities/[slug]/posts/[postId]/reactions
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const disabled = checkCommunitiesEnabled();
  if (disabled) return disabled;

  try {
    const userId = await requireAuth();
    const { slug, postId } = await params;

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Must be a member to view reactions
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to view reactions" },
        { status: 403 }
      );
    }

    const post = await getPost(postId);
    if (!post || post.communityId !== community.id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    const reactions = await getReactions(postId);

    return NextResponse.json({
      success: true,
      data: reactions,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET reactions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}
