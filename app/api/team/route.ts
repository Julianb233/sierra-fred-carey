/**
 * Team Management API Routes
 * Phase 33-01: Collaboration & Sharing
 *
 * GET    /api/team - List team members (auth required)
 * POST   /api/team - Invite team member (auth + Studio tier required, max 5)
 * DELETE /api/team - Remove team member by id (auth required)
 * PATCH  /api/team - Update member role (auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import {
  inviteTeamMember,
  getTeamMembers,
  removeTeamMember,
  updateMemberRole,
  isValidTeamRole,
} from "@/lib/sharing/teams";
import { sendInviteEmail } from "@/lib/email/invite";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/team" });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// GET /api/team - List team members
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const allMembers = await getTeamMembers(userId);

    if (activeOnly) {
      // Return simplified format for sharing UI: only active members
      const active = allMembers
        .filter((m) => m.status === "active")
        .map((m) => ({
          id: m.id,
          email: m.member_email,
          role: m.role,
        }));
      return NextResponse.json({ success: true, members: active });
    }

    return NextResponse.json({ success: true, members: allMembers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch team members";
    log.error("GET /api/team error", { error: message });

    if (message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/team - Invite team member
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
    const { email, role } = body;

    // Validate email
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Validate role
    const memberRole = role || "viewer";
    if (!isValidTeamRole(memberRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role. Must be one of: viewer, collaborator, admin",
        },
        { status: 400 }
      );
    }

    const member = await inviteTeamMember(userId, email, memberRole);

    // Fire-and-forget: send invite email notification
    // Don't block the API response on email delivery
    const user = await getCurrentUser();
    const inviterName = user?.name || user?.email || "A team member";
    sendInviteEmail(email, inviterName, memberRole).catch((err) => {
      log.error("Failed to send invite email (fire-and-forget)", {
        error: err instanceof Error ? err.message : String(err),
        email,
      });
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invite team member";
    log.error("POST /api/team error", { error: message });

    // Distinguish between user errors and server errors
    const isUserError =
      message.includes("already been invited") ||
      message.includes("Maximum team size");

    return NextResponse.json(
      { success: false, error: message },
      { status: isUserError ? 400 : 500 }
    );
  }
}

// ============================================================================
// DELETE /api/team - Remove team member
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "Member id is required as query parameter" },
        { status: 400 }
      );
    }

    const removed = await removeTeamMember(userId, memberId);

    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Failed to remove member or member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove team member";
    log.error("DELETE /api/team error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/team - Update member role
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json(
        { success: false, error: "memberId is required" },
        { status: 400 }
      );
    }

    if (!role || !isValidTeamRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role. Must be one of: viewer, collaborator, admin",
        },
        { status: 400 }
      );
    }

    const updated = await updateMemberRole(userId, memberId, role);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update role or member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update member role";
    log.error("PATCH /api/team error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
