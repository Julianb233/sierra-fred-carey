/**
 * Public Share Link Access Route
 * Phase 33-01: Collaboration & Sharing
 *
 * GET /api/share/[token] - Public endpoint (NO auth required)
 * Validates token, returns shared resource data.
 *
 * This route MUST NOT be in the isProtectedRoute list.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSharedResource, isTeamRecipient } from "@/lib/sharing";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const log = logger.child({ module: "api/share/[token]" });

// Token format: 64 hex characters (32 bytes encoded as hex)
const TOKEN_REGEX = /^[a-f0-9]{64}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format to prevent unnecessary DB lookups
    if (!token || !TOKEN_REGEX.test(token)) {
      return NextResponse.json(
        { success: false, error: "Invalid share link" },
        { status: 400 }
      );
    }

    const shared = await getSharedResource(token);

    if (!shared) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Share link is invalid, expired, or has reached its maximum number of views",
        },
        { status: 404 }
      );
    }

    // Team-only links require the viewer to be an active team member
    if (shared.link.is_team_only) {
      let viewerUserId: string | null = null;
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        viewerUserId = user?.id ?? null;
      } catch {
        // Not authenticated
      }

      if (!viewerUserId) {
        return NextResponse.json(
          {
            success: false,
            error: "This link is restricted to team members. Please sign in to continue.",
            teamOnly: true,
          },
          { status: 403 }
        );
      }

      // Owner always has access
      const isOwner = viewerUserId === shared.link.user_id;
      if (!isOwner) {
        const hasAccess = await isTeamRecipient(shared.link.id, viewerUserId);
        if (!hasAccess) {
          return NextResponse.json(
            {
              success: false,
              error: "This link is restricted to team members. You do not have access.",
              teamOnly: true,
            },
            { status: 403 }
          );
        }
      }
    }

    // Strip sensitive fields from the resource before returning
    const sanitizedResource = sanitizeResource(shared.resource);

    return NextResponse.json({
      success: true,
      resourceType: shared.resourceType,
      accessLevel: shared.link.access_level,
      resource: sanitizedResource,
    });
  } catch (error) {
    log.error("GET /api/share/[token] error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Failed to load shared resource" },
      { status: 500 }
    );
  }
}

/**
 * Remove sensitive fields from resource data before public exposure.
 * Strips user_id and any internal metadata.
 */
function sanitizeResource(
  resource: Record<string, unknown>
): Record<string, unknown> {
  const {
    user_id: _userId,
    stripe_customer_id: _stripeId,
    ...safe
  } = resource;
  return safe;
}
