/**
 * Boardy Match API Routes
 * Phase 04: Studio Tier Features - Plan 06
 *
 * GET  /api/boardy/match - Get matches for authenticated user
 * POST /api/boardy/match - Refresh matches (generate new suggestions)
 *
 * Studio tier required for all operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import {
  getUserTier,
  createTierErrorResponse,
} from "@/lib/api/tier-middleware";
import { getMatches } from "@/lib/db/boardy";
import { getBoardyClient } from "@/lib/boardy/client";
import {
  isValidMatchType,
  isValidMatchStatus,
} from "@/lib/boardy/types";
import type {
  BoardyMatchType,
  BoardyMatchStatus,
} from "@/lib/boardy/types";

// ============================================================================
// GET /api/boardy/match - List matches
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const matchType = searchParams.get("matchType");
    const status = searchParams.get("status");

    // Validate enum values if provided
    if (matchType && !isValidMatchType(matchType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid matchType. Must be one of: investor, advisor, mentor, partner",
        },
        { status: 400 }
      );
    }

    if (status && !isValidMatchStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be one of: suggested, connected, intro_sent, meeting_scheduled, declined",
        },
        { status: 400 }
      );
    }

    // 4. Get matches from DB
    const matches = await getMatches(userId, {
      matchType: (matchType as BoardyMatchType) || undefined,
      status: (status as BoardyMatchStatus) || undefined,
    });

    // 5. If no matches exist, generate initial matches
    if (matches.length === 0 && !matchType && !status) {
      try {
        const client = getBoardyClient();
        const initialMatches = await client.getMatches({
          userId,
          startupStage: "seed",
          sector: "technology",
          matchTypes: ["investor", "advisor"],
          limit: 5,
        });

        return NextResponse.json({
          success: true,
          matches: initialMatches,
          count: initialMatches.length,
          deepLink: client.getDeepLink(userId),
          generated: true,
        });
      } catch (genError) {
        console.error("[Boardy API] Failed to generate initial matches:", genError);
        // Return empty matches rather than failing
        return NextResponse.json({
          success: true,
          matches: [],
          count: 0,
          deepLink: getBoardyClient().getDeepLink(userId),
          generated: false,
          warning: "Failed to generate initial match suggestions. Try refreshing.",
        });
      }
    }

    // 6. Return matches
    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      deepLink: getBoardyClient().getDeepLink(userId),
    });
  } catch (error) {
    // Handle auth errors (thrown as Response by requireAuth)
    if (error instanceof Response) return error;

    console.error("[Boardy API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/boardy/match - Refresh matches
// ============================================================================

export async function POST(_request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // 3. Refresh matches via Boardy client
    const client = getBoardyClient();
    const newMatches = await client.refreshMatches(userId);

    return NextResponse.json({
      success: true,
      matches: newMatches,
      count: newMatches.length,
      deepLink: client.getDeepLink(userId),
      refreshed: true,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error("[Boardy API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh matches" },
      { status: 500 }
    );
  }
}
