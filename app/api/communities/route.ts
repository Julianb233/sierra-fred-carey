/**
 * Communities API Routes
 * Phase 41: Founder Communities
 *
 * POST /api/communities - Create a new community
 * GET  /api/communities - List/browse communities with search, category filter, pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createCommunity, listCommunities } from "@/lib/db/communities";
import { sanitizeContent, generateSlug } from "@/lib/communities/sanitize";

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

const createSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(VALID_CATEGORIES),
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
    const sanitizedDescription = sanitizeContent(description, 2000);
    const slug = generateSlug(sanitizedName) + "-" + Date.now().toString(36);

    const community = await createCommunity({
      name: sanitizedName,
      slug,
      description: sanitizedDescription,
      category,
      creatorId: userId,
      iconUrl,
    });

    return NextResponse.json(
      { success: true, community },
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

    return NextResponse.json({
      success: true,
      communities,
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
