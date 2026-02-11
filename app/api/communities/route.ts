/**
 * Communities API Routes
 * Phase 41: Founder Communities (Step 6)
 *
 * POST /api/communities - Create a new community
 * GET  /api/communities - List/browse communities with search, category filter, pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  createCommunity,
  listCommunities,
  getCommunityBySlug,
  getMembership,
} from "@/lib/db/communities";
import { sanitizeContent, generateSlug } from "@/lib/communities/sanitize";

// ============================================================================
// Validation
// ============================================================================

const VALID_CATEGORIES = ["industry", "stage", "topic", "general"] as const;

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).default(""),
  category: z.enum(VALID_CATEGORIES).default("general"),
  iconUrl: z.string().url().optional(),
});

// ============================================================================
// POST /api/communities - Create a new community
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = createSchema.safeParse(body);
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

    const { name, description, category, iconUrl } = parsed.data;

    // Sanitize user content
    const sanitizedName = sanitizeContent(name, 100);
    const sanitizedDescription = sanitizeContent(description, 500);

    // Generate unique slug with dedup (-2, -3, etc.)
    let slug = generateSlug(sanitizedName);
    let attempt = 0;
    while (
      await getCommunityBySlug(
        attempt === 0 ? slug : `${slug}-${attempt + 1}`
      )
    ) {
      attempt++;
    }
    if (attempt > 0) {
      slug = `${slug}-${attempt + 1}`;
    }

    const community = await createCommunity({
      name: sanitizedName,
      slug,
      description: sanitizedDescription,
      category,
      creatorId: userId,
      iconUrl,
    });

    return NextResponse.json(
      { success: true, data: community },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create community" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/communities - List/browse communities
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate category if provided
    if (
      category &&
      !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { communities, total } = await listCommunities({
      search,
      category,
      limit,
      offset,
    });

    // Add isMember flag for current user
    const communitiesWithMembership = await Promise.all(
      communities.map(async (c) => {
        const membership = await getMembership(c.id, userId);
        return {
          ...c,
          isMember: !!membership,
          memberRole: membership?.role || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: communitiesWithMembership,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Communities API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}
