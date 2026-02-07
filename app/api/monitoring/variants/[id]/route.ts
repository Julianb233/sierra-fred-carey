import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { collectVariantMetrics } from "@/lib/monitoring/ab-test-metrics";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/variants/[id]
 * Detailed metrics for a specific variant
 *
 * SECURITY: Requires admin authentication
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - days: number of days to look back (default: 7)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id: variantId } = await params;
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
      `[Monitoring API] Fetching metrics for variant: ${variantId}`,
      { startDate, endDate }
    );

    const metrics = await collectVariantMetrics(variantId, startDate, endDate);

    if (!metrics) {
      return NextResponse.json(
        {
          success: false,
          error: "Variant not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      `[Monitoring API] Error fetching variant:`,
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch variant metrics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
