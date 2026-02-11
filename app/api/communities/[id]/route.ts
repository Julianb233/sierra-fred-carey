/**
 * Community Detail API Routes
 * Phase 41: Founder Communities
 *
 * GET    /api/communities/:id - Get community details with member count
 * PATCH  /api/communities/:id - Update community (creator/moderator only)
 * DELETE /api/communities/:id - Delete community (creator only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  getCommunity,
  updateCommunity,
  deleteCommunity,
  getMembership,
} from "@/lib/db/communities";
import { sanitizeContent } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const VALID_CATEGORIES = [
  "saas",
  "fintech",
  "healthtech",
  "edtech",
  "marketplace",
  "ai-ml",
  "ecommerce",
  "social",
  "developer-tools",
  "climate",
  "general",
] as const;

const updateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  iconUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GET /api/communities/:id
// ============================================================================

export async function GET(
  _request: NextRequest,
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

    const community = await getCommunity(id);
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Check if the requesting user is a member
    const membership = await getMembership(id, userId);

    return NextResponse.json({
      success: true,
      community,
      membership: membership
        ? { role: membership.role, joinedAt: membership.joinedAt }
        : null,
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
// PATCH /api/communities/:id
// ============================================================================

export async function PATCH(
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

    // Check that user is creator or moderator
    const membership = await getMembership(id, userId);
    if (!membership || !["creator", "moderator"].includes(membership.role)) {
      return NextResponse.json(
        { success: false, error: "Only community creator or moderators can update the community" },
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

    // Sanitize content fields
    if (updates.name) updates.name = sanitizeContent(updates.name, 100);
    if (updates.description)
      updates.description = sanitizeContent(updates.description, 2000);

    const community = await updateCommunity(id, updates);

    return NextResponse.json({ success: true, community });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update community" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/communities/:id
// ============================================================================

export async function DELETE(
  _request: NextRequest,
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

    // Only the creator can delete
    const membership = await getMembership(id, userId);
    if (!membership || membership.role !== "creator") {
      return NextResponse.json(
        { success: false, error: "Only the community creator can delete it" },
        { status: 403 }
      );
    }

    await deleteCommunity(id);

    return NextResponse.json({ success: true, message: "Community deleted" });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete community" },
      { status: 500 }
    );
  }
}
