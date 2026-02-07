import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { compareExperimentVariants } from "@/lib/monitoring/ab-test-metrics";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/experiments/[name]
 * Detailed metrics for a specific experiment
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - days: number of days to look back (default: 7)
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await params;
    const experimentName = decodeURIComponent(name);
    const searchParams = request.nextUrl.searchParams;

    // Parse time range
    let startDate: Date;
    let endDate = new Date();

    if (searchParams.has("startDate")) {
      startDate = new Date(searchParams.get("startDate")!);
    } else {
      const days = parseInt(searchParams.get("days") || "7", 10);
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    if (searchParams.has("endDate")) {
      endDate = new Date(searchParams.get("endDate")!);
    }

    logger.log(
      `[Monitoring API] Fetching metrics for experiment: ${experimentName}`,
      { startDate, endDate }
    );

    const comparison = await compareExperimentVariants(
      experimentName,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: comparison,
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const { name } = await params;
    console.error(
      `[Monitoring API] Error fetching experiment ${name}:`,
      error
    );

    if (error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Experiment not found",
          message: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch experiment metrics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
