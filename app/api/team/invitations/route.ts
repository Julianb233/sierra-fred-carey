/**
 * Team Invitations API Routes
 * Phase 33-01: Collaboration & Sharing
 *
 * GET    /api/team/invitations - List pending invitations for current user
 * DELETE /api/team/invitations - Decline an invitation by id
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getPendingInvitations,
  getPendingInvitationCount,
  declineInvite,
} from "@/lib/sharing/teams";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/team/invitations" });

// ============================================================================
// GET /api/team/invitations - List pending invitations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if only count is requested
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count") === "true";

    if (countOnly) {
      const count = await getPendingInvitationCount(user.email);
      return NextResponse.json({ success: true, count });
    }

    const invitations = await getPendingInvitations(user.email);

    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch invitations";
    log.error("GET /api/team/invitations error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/team/invitations - Decline an invitation
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { success: false, error: "Invitation id is required as query parameter" },
        { status: 400 }
      );
    }

    const result = await declineInvite(inviteId, user.email);

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    log.info("Invitation declined via API", {
      inviteId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to decline invitation";
    log.error("DELETE /api/team/invitations error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
