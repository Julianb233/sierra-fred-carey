/**
 * Community Posts API Routes
 * Phase 41: Founder Communities
 *
 * POST /api/communities/:id/posts - Create a post (members only)
 * GET  /api/communities/:id/posts - List posts (pinned first, then newest)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunity,
  getMembership,
  createPost,
  getPosts,
} from "@/lib/db/communities";
import type { PostType } from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const createPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000),
  type: z.enum(["post", "question", "update"]).optional(),
});

// ============================================================================
// POST /api/communities/:id/posts
// ============================================================================

export async function POST(
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

    // Verify user is a member
    const membership = await getMembership(id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to post" },
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

    const parsed = createPostSchema.safeParse(body);
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

    const { title, content, type } = parsed.data;

    const post = await createPost({
      communityId: id,
      authorId: userId,
      type: type as PostType,
      title: title ? sanitizeContent(title, 200) : undefined,
      content: sanitizeContent(content, 10000),
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Create post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/communities/:id/posts
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
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const type = searchParams.get("type") as PostType | null;

    const { posts, total } = await getPosts(id, {
      limit,
      offset,
      type: type || undefined,
    });

    return NextResponse.json({
      success: true,
      posts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] List posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
