/**
 * Admin Feedback Sessions List API
 *
 * GET /api/admin/feedback/sessions
 * Returns sessions with feedback signal counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getSessionsWithFeedback } from "@/lib/db/feedback-admin";

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const sessions = await getSessionsWithFeedback(limit);

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[admin/feedback/sessions] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
