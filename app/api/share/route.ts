/**
 * Share Link API Routes
 * Phase 33-01: Collaboration & Sharing
 *
 * POST /api/share   - Create a shareable link (Studio tier required)
 * GET  /api/share   - List user's share links (auth required)
 * DELETE /api/share  - Revoke a share link by id (auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import {
  createShareLink,
  getUserShareLinks,
  revokeShareLink,
  isValidResourceType,
} from "@/lib/sharing";
import type { ShareLinkOptions } from "@/lib/sharing";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/share" });

// ============================================================================
// POST /api/share - Create shareable link
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Tier gate: Studio only
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    const body = await request.json();
    const { resourceType, resourceId, expiresIn, maxViews, isTeamOnly, teamMemberIds } = body;

    // Validate resource type
    if (!resourceType || !isValidResourceType(resourceType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid resource type. Must be one of: strategy_document, pitch_review, investor_readiness, red_flags_report",
        },
        { status: 400 }
      );
    }

    // Validate resource ID
    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json(
        { success: false, error: "resourceId is required" },
        { status: 400 }
      );
    }

    // Validate team sharing params
    if (isTeamOnly && (!Array.isArray(teamMemberIds) || teamMemberIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: "teamMemberIds are required for team-only shares" },
        { status: 400 }
      );
    }

    // Build options
    const options: ShareLinkOptions = {};
    if (typeof expiresIn === "number" && expiresIn > 0) {
      options.expiresInHours = expiresIn;
    }
    if (typeof maxViews === "number" && maxViews > 0) {
      options.maxViews = maxViews;
    }
    if (isTeamOnly) {
      options.isTeamOnly = true;
      options.teamMemberIds = teamMemberIds;
    }

    const link = await createShareLink(userId, resourceType, resourceId, options);

    return NextResponse.json({
      success: true,
      link,
      shareUrl: `${getBaseUrl(request)}/api/share/${link.token}`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Failed to create share link";
    log.error("POST /api/share error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && message.includes("not found") ? 404 : 500 }
    );
  }
}

// ============================================================================
// GET /api/share - List user's share links
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const links = await getUserShareLinks(userId);

    return NextResponse.json({ success: true, links });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Failed to fetch share links";
    log.error("GET /api/share error", { error: message });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/share - Revoke a share link
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("id");

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: "Link id is required as query parameter" },
        { status: 400 }
      );
    }

    const revoked = await revokeShareLink(userId, linkId);

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: "Failed to revoke link or link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Failed to revoke share link";
    log.error("DELETE /api/share error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
