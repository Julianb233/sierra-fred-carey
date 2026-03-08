/**
 * Admin Feedback Session Detail API
 *
 * GET /api/admin/feedback/sessions/[sessionId]
 * Returns full session detail with conversation messages and feedback signals.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getSessionDetail } from "@/lib/db/feedback-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId parameter" },
      { status: 400 }
    );
  }

  try {
    const result = await getSessionDetail(sessionId);

    if (!result) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/feedback/sessions] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch session detail" },
      { status: 500 }
    );
  }
}
