/**
 * Community Posts API Routes
 * Phase 41: Founder Communities (Step 9)
 *
 * GET  /api/communities/[slug]/posts - List posts (members only)
 * POST /api/communities/[slug]/posts - Create post (members only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
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
  title: z.string().max(200).optional().default(""),
  content: z.string().min(1).max(5000),
  postType: z.enum(["post", "question", "update"]).optional().default("post"),
});

// ============================================================================
// GET /api/communities/[slug]/posts
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    // Must be a member to view posts
    const membership = await getMembership(community.id, userId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You must be a member to view posts" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { posts, total } = await getPosts(community.id, { limit, offset });

    return NextResponse.json({
      success: true,
      data: posts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/communities/[slug]/posts
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    // Must be a member to post
    const membership = await getMembership(community.id, userId);
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

    const { title, content, postType } = parsed.data;

    const post = await createPost({
      communityId: community.id,
      authorId: userId,
      postType: postType as PostType,
      title: title ? sanitizeContent(title, 200) : "",
      content: sanitizeContent(content, 5000),
    });

    return NextResponse.json(
      { success: true, data: post },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] Create post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
