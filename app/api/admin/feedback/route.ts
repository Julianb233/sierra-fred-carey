/**
 * Admin Feedback Signals API
 *
 * Phase 73-02: Returns paginated, filterable feedback signals for the admin
 * feedback dashboard. Requires admin authentication.
 *
 * GET /api/admin/feedback?dateFrom=&dateTo=&channel=&rating=&category=&tier=&userId=&page=&limit=
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { queryFeedbackSignalsAdmin } from "@/lib/db/feedback-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Admin-only guard
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const params = request.nextUrl.searchParams;

    const filters = {
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      channel: params.get("channel") || undefined,
      rating: params.has("rating")
        ? parseInt(params.get("rating")!, 10)
        : undefined,
      category: params.get("category") || undefined,
      tier: params.get("tier") || undefined,
      userId: params.get("userId") || undefined,
      page: params.has("page")
        ? parseInt(params.get("page")!, 10)
        : 1,
      limit: params.has("limit")
        ? parseInt(params.get("limit")!, 10)
        : 50,
    };

    // Validate rating if provided
    if (filters.rating !== undefined && isNaN(filters.rating)) {
      filters.rating = undefined;
    }

    const result = await queryFeedbackSignalsAdmin(filters);

    return NextResponse.json({
      signals: result.data,
      total: result.total,
      page: filters.page,
      limit: filters.limit,
    });
  } catch (error) {
    console.error("[admin/feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback signals" },
      { status: 500 }
    );
  }
}
