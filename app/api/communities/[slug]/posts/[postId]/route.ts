/**
 * Single Post API Routes
 * Phase 41: Founder Communities (Step 10)
 *
 * GET    /api/communities/[slug]/posts/[postId] - Get post with replies
 * PATCH  /api/communities/[slug]/posts/[postId] - Update post (author or moderator/owner)
 * DELETE /api/communities/[slug]/posts/[postId] - Delete post (author or moderator/owner)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  getPost,
  updatePost,
  deletePost,
  getReplies,
  getReactions,
} from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const updatePostSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
});

// ============================================================================
// GET /api/communities/[slug]/posts/[postId]
// ============================================================================

export async function GET(
  _request: NextRequest,
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

    // Must be a member to view
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to view posts" },
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

    // Fetch replies and reactions
    const { replies } = await getReplies(postId);
    const reactions = await getReactions(postId);

    return NextResponse.json({
      success: true,
      data: {
        post,
        replies,
        reactions,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/communities/[slug]/posts/[postId]
// ============================================================================

export async function PATCH(
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

    const post = await getPost(postId);
    if (!post || post.communityId !== community.id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Author can edit own post; owner/moderator can edit any
    const membership = await getMembership(community.id, userId);
    const isAuthor = post.authorId === userId;
    const isModerator =
      membership && ["owner", "moderator"].includes(membership.role);

    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this post" },
        { status: 403 }
      );
    }

    // Only moderators/owner can pin
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = updatePostSchema.safeParse(body);
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

    const updates = parsed.data;

    // Only moderator/owner can pin posts
    if (updates.isPinned !== undefined && !isModerator) {
      return NextResponse.json(
        { success: false, error: "Only moderators can pin posts" },
        { status: 403 }
      );
    }

    if (updates.title) updates.title = sanitizeContent(updates.title, 200);
    if (updates.content)
      updates.content = sanitizeContent(updates.content, 5000);

    const updated = await updatePost(postId, post.authorId, updates);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] PATCH post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/communities/[slug]/posts/[postId]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
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

    const post = await getPost(postId);
    if (!post || post.communityId !== community.id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Author can delete own; owner/moderator can delete any
    const membership = await getMembership(community.id, userId);
    const isAuthor = post.authorId === userId;
    const isModerator =
      membership && ["owner", "moderator"].includes(membership.role);

    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this post" },
        { status: 403 }
      );
    }

    await deletePost(postId, post.authorId);

    return NextResponse.json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] DELETE post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
