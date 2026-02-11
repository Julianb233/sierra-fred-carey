/**
 * Post Replies API Routes
 * Phase 41: Founder Communities (Step 12)
 *
 * GET  /api/communities/[slug]/posts/[postId]/replies - List replies
 * POST /api/communities/[slug]/posts/[postId]/replies - Create reply
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  getPost,
  createReply,
  getReplies,
} from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";
import { checkRateLimitForUser } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Validation
// ============================================================================

const createReplySchema = z.object({
  content: z.string().min(1).max(5000),
});

// ============================================================================
// GET /api/communities/[slug]/posts/[postId]/replies
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
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

    // Must be a member to view replies
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to view replies" },
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { replies, total } = await getReplies(postId, { limit, offset });

    return NextResponse.json({
      success: true,
      data: replies,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET replies error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/communities/[slug]/posts/[postId]/replies
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const userId = await requireAuth();

    // Rate limit reply creation
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

    // Must be a member to reply
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to reply" },
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
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = createReplySchema.safeParse(body);
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

    const reply = await createReply({
      postId,
      authorId: userId,
      content: sanitizeContent(parsed.data.content, 5000),
    });

    return NextResponse.json(
      { success: true, data: reply },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Create reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reply" },
      { status: 500 }
    );
  }
}
