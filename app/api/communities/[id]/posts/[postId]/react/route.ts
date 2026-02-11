/**
 * Post Reaction API Route
 * Phase 41: Founder Communities
 *
 * POST /api/communities/:id/posts/:postId/react - Toggle a reaction on a post
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunity,
  getMembership,
  getPost,
  toggleReaction,
} from "@/lib/db/communities";

// ============================================================================
// Validation
// ============================================================================

const ALLOWED_REACTION_TYPES = [
  "like",
  "love",
  "fire",
  "rocket",
  "eyes",
  "clap",
  "lightbulb",
  "100",
] as const;

const reactSchema = z.object({
  reactionType: z.enum(ALLOWED_REACTION_TYPES).optional(),
});

// ============================================================================
// POST /api/communities/:id/posts/:postId/react
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
        { success: false, error: "You must be a member to react" },
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
      // Default to "like" if no body provided
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

    const { added, reaction } = await toggleReaction({
      postId,
      userId,
      reactionType: parsed.data.reactionType,
    });

    return NextResponse.json({
      success: true,
      added,
      reaction,
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
