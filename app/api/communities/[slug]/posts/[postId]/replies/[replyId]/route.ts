/**
 * Single Reply API Routes
 * Phase 41: Founder Communities (Step 13)
 *
 * PATCH  /api/communities/[slug]/posts/[postId]/replies/[replyId] - Update reply (author only)
 * DELETE /api/communities/[slug]/posts/[postId]/replies/[replyId] - Delete reply (author or moderator/owner)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  getPost,
  deleteReply,
} from "@/lib/db/communities";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const updateReplySchema = z.object({
  content: z.string().min(1).max(5000),
});

// ============================================================================
// Helper: get a single reply by ID
// ============================================================================

async function getReply(replyId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("community_post_replies")
    .select("*")
    .eq("id", replyId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get reply: ${error.message}`);
  }

  return {
    id: data.id as string,
    postId: data.post_id as string,
    authorId: data.author_id as string,
    content: data.content as string,
    createdAt: data.created_at as string,
  };
}

// ============================================================================
// PATCH /api/communities/[slug]/posts/[postId]/replies/[replyId]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ slug: string; postId: string; replyId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { slug, postId, replyId } = await params;

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

    const reply = await getReply(replyId);
    if (!reply || reply.postId !== postId) {
      return NextResponse.json(
        { success: false, error: "Reply not found" },
        { status: 404 }
      );
    }

    // Only the author can update their reply
    if (reply.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the reply author can edit it" },
        { status: 403 }
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

    const parsed = updateReplySchema.safeParse(body);
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

    const sanitizedContent = sanitizeContent(parsed.data.content, 5000);

    // Update reply directly via Supabase
    const supabase = createServiceClient();
    const { data: updated, error } = await supabase
      .from("community_post_replies")
      .update({ content: sanitizedContent })
      .eq("id", replyId)
      .eq("author_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reply: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        postId: updated.post_id,
        authorId: updated.author_id,
        content: updated.content,
        createdAt: updated.created_at,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] PATCH reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update reply" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/communities/[slug]/posts/[postId]/replies/[replyId]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ slug: string; postId: string; replyId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { slug, postId, replyId } = await params;

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

    const reply = await getReply(replyId);
    if (!reply || reply.postId !== postId) {
      return NextResponse.json(
        { success: false, error: "Reply not found" },
        { status: 404 }
      );
    }

    // Author can delete own reply; owner/moderator can delete any
    const membership = await getMembership(community.id, userId);
    const isAuthor = reply.authorId === userId;
    const isModerator =
      membership && ["owner", "moderator"].includes(membership.role);

    if (!isAuthor && !isModerator) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this reply" },
        { status: 403 }
      );
    }

    await deleteReply(replyId, reply.authorId);

    return NextResponse.json({
      success: true,
      message: "Reply deleted",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] DELETE reply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete reply" },
      { status: 500 }
    );
  }
}
