/**
 * Push Notification Preferences API
 *
 * Manages per-category push notification preferences for the authenticated user.
 *
 * Routes:
 * GET   /api/push/preferences  - Return all category preferences (with defaults)
 * PATCH /api/push/preferences  - Update a specific category { category, enabled }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getPreferences,
  updatePreferences,
  PUSH_CATEGORIES,
  type PushCategory,
} from "@/lib/push/preferences";

/**
 * GET /api/push/preferences
 * Return the user's push notification category preferences.
 */
export async function GET() {
  try {
    const userId = await requireAuth();

    const preferences = await getPreferences(userId);

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
    logger.error("[push/preferences GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/push/preferences
 * Update a single category preference.
 * Body: { category: PushCategory, enabled: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { category, enabled } = body;

    // Validate category
    if (!category || !PUSH_CATEGORIES.includes(category as PushCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${PUSH_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate enabled
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    const updated = await updatePreferences(userId, category as PushCategory, enabled);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    if (
      error instanceof Response ||
      (error && typeof error === "object" && "status" in error && "json" in error)
    ) {
      return error as Response;
    }
    logger.error("[push/preferences PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preference" },
      { status: 500 },
    );
  }
}
