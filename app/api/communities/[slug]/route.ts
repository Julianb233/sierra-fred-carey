/**
 * Community Detail API Routes
 * Phase 41: Founder Communities (Step 7)
 *
 * GET   /api/communities/[slug] - Get community detail + membership info
 * PATCH /api/communities/[slug] - Update community (owner/creator only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunityBySlug,
  getMembership,
  updateCommunity,
  getPosts,
} from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const VALID_CATEGORIES = ["industry", "stage", "topic", "general"] as const;

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  coverImageUrl: z.string().url().optional(),
  isArchived: z.boolean().optional(),
});

// ============================================================================
// GET /api/communities/[slug]
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await requireAuth();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Community slug is required" },
        { status: 400 }
      );
    }

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Get membership info for current user
    const membership = await getMembership(community.id, userId);

    // Get recent posts preview (first 5)
    const { posts: recentPosts } = await getPosts(community.id, { limit: 5 });

    return NextResponse.json({
      success: true,
      data: {
        community,
        membership: membership
          ? { role: membership.role, joinedAt: membership.joinedAt }
          : null,
        recentPosts,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch community" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/communities/[slug]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await requireAuth();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Community slug is required" },
        { status: 400 }
      );
    }

    const community = await getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Only creator can update
    if (community.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the community owner can update it" },
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

    const parsed = updateSchema.safeParse(body);
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
    if (updates.name) updates.name = sanitizeContent(updates.name, 100);
    if (updates.description)
      updates.description = sanitizeContent(updates.description, 500);

    const updated = await updateCommunity(community.id, userId, updates);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update community" },
      { status: 500 }
    );
  }
}
