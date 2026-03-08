/**
 * Admin Feedback Stats API
 *
 * Phase 73-02: Returns aggregate feedback statistics for the admin
 * dashboard cards and charts. Requires admin authentication.
 *
 * GET /api/admin/feedback/stats?dateFrom=&dateTo=
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { getFeedbackStats } from "@/lib/db/feedback-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Admin-only guard
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  try {
    const params = request.nextUrl.searchParams;
    const dateFrom = params.get("dateFrom") || undefined;
    const dateTo = params.get("dateTo") || undefined;

    const stats = await getFeedbackStats(dateFrom, dateTo);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[admin/feedback/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback stats" },
      { status: 500 }
    );
  }
}
