/**
 * Trends API
 *
 * GET /api/dashboard/trends?range=30d&granularity=weekly
 * Returns time-series activity data for the authenticated user.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getFounderTrends,
  rangeToParams,
  type TrendRange,
} from "@/lib/dashboard/trends";

const VALID_RANGES = new Set(["7d", "30d", "90d", "all"]);

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = request.nextUrl;
    const range = (
      VALID_RANGES.has(searchParams.get("range") || "")
        ? searchParams.get("range")
        : "30d"
    ) as TrendRange;

    const { granularity, periods } = rangeToParams(range);

    const trends = await getFounderTrends(userId, granularity, periods);

    return NextResponse.json({
      success: true,
      data: { trends, granularity, range },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Trends API] Error:", error);

    // Graceful degradation — return empty data
    return NextResponse.json({
      success: true,
      data: { trends: [], granularity: "weekly", range: "30d" },
    });
  }
}
