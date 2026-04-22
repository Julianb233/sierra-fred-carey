/**
 * Public Invite Lookup API
 * AI-8502: Co-founder invite + join flow
 *
 * GET /api/invite/[id] - Look up an invitation by ID (no auth required)
 * Returns minimal public info: inviter name, company, role, status.
 * Does NOT return sensitive data like email addresses or user IDs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getInviteWithInviterInfo } from "@/lib/sharing/teams";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/invite" });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || id.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid invite ID" },
        { status: 400 }
      );
    }

    const invite = await getInviteWithInviterInfo(id);

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Return only public-safe fields
    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        status: invite.status,
        role: invite.role,
        invited_at: invite.invited_at,
        inviter_name: invite.inviter_name || "A founder",
        inviter_company: invite.inviter_company || undefined,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to look up invitation";
    log.error("GET /api/invite/[id] error", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
