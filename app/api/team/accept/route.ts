/**
 * Team Invite Acceptance API Route
 * Phase 33-01: Collaboration & Sharing
 *
 * POST /api/team/accept - Accept a team invitation
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptInviteById } from "@/lib/sharing/teams";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/team/accept" });

// ============================================================================
// POST /api/team/accept - Accept a team invitation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId || typeof inviteId !== "string") {
      return NextResponse.json(
        { success: false, error: "inviteId is required" },
        { status: 400 }
      );
    }

    const result = await acceptInviteById(inviteId, user.id, user.email);

    if (!result.success) {
      // Determine HTTP status based on error type
      const status = result.error?.includes("not found")
        ? 404
        : result.error?.includes("different email")
          ? 403
          : 400;

      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    log.info("Invite accepted via API", {
      inviteId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({ success: true, member: result.member });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept invitation";
    log.error("POST /api/team/accept error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
