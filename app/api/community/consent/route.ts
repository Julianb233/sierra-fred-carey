/**
 * Community Consent Preferences API
 *
 * Manages per-category consent preferences for community data sharing.
 *
 * Routes:
 * GET /api/community/consent - Read current consent preferences
 * PUT /api/community/consent - Toggle a specific consent category
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getConsentPreferences,
  updateConsentPreference,
  CONSENT_CATEGORIES,
} from "@/lib/db/consent";
import type { ConsentCategory } from "@/lib/db/consent";
import { logger } from "@/lib/logger";

/**
 * GET /api/community/consent
 * Return all consent preferences for the authenticated user.
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const preferences = await getConsentPreferences(userId);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[api/community/consent GET]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/community/consent
 * Toggle a specific consent category for the authenticated user.
 *
 * Body: { category: string, enabled: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { category, enabled } = body;

    // Validate category
    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { success: false, error: "category is required and must be a string" },
        { status: 400 },
      );
    }

    if (!CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category: ${category}. Valid categories: ${CONSENT_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate enabled
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled is required and must be a boolean" },
        { status: 400 },
      );
    }

    const updatedPreferences = await updateConsentPreference(
      userId,
      category as ConsentCategory,
      enabled,
    );

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[api/community/consent PUT]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
