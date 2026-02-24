/**
 * Engagement / Momentum API
 *
 * GET /api/dashboard/engagement
 * Returns a momentum indicator with trend direction and activity breakdown.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeMomentumIndicator } from "@/lib/dashboard/engagement-score";

export async function GET() {
  try {
    const userId = await requireAuth();
    const indicator = await computeMomentumIndicator(userId);

    return NextResponse.json({ success: true, data: indicator });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Engagement API] Error:", error);

    // Graceful fallback
    return NextResponse.json({
      success: true,
      data: {
        trend: "stable",
        summary: "Unable to compute momentum",
        breakdown: {
          conversations: { current: 0, previous: 0 },
          checkIns: { current: 0, previous: 0 },
          nextStepsCompleted: { current: 0, previous: 0 },
          readinessProgress: { current: 0, previous: 0 },
        },
        lastActiveDate: null,
      },
    });
  }
}
