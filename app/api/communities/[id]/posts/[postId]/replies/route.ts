/**
 * Post Replies API Routes
 * Phase 41: Founder Communities
 *
 * POST /api/communities/:id/posts/:postId/replies - Create a reply (members only)
 * GET  /api/communities/:id/posts/:postId/replies - List replies
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunity,
  getMembership,
  getPost,
  createReply,
  getReplies,
} from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const createReplySchema = z.object({
  content: z.string().min(1).max(5000),
});

// ============================================================================
// POST /api/communities/:id/posts/:postId/replies
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id, postId } = await params;

    if (!id || !postId) {
      return NextResponse.json(
        { success: false, error: "Community ID and Post ID are required" },
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

    // Verify user is a member
    const membership = await getMembership(id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to reply" },
        { status: 403 }
      );
    }

    // Verify post exists and belongs to this community
    const post = await getPost(postId);
    if (!post || post.communityId !== id) {
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

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Create reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reply" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/communities/:id/posts/:postId/replies
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id, postId } = await params;

    if (!id || !postId) {
      return NextResponse.json(
        { success: false, error: "Community ID and Post ID are required" },
        { status: 400 }
      );
    }

    // Verify post exists and belongs to this community
    const post = await getPost(postId);
    if (!post || post.communityId !== id) {
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
      replies,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] List replies error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
