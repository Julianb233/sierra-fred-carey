import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { getPromotionHistory } from "@/lib/monitoring/auto-promotion";
import { logger } from "@/lib/logger";

/**
 * GET /api/monitoring/experiments/[name]/history
 * Get promotion history for an experiment
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

    logger.log(
      `[Promotion History API] Fetching history for experiment: ${experimentName}`
    );

    const history = await getPromotionHistory(experimentName);

    return NextResponse.json({
      success: true,
      data: {
        experimentName,
        history,
        count: history.length,
        latestPromotion: history[0] || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const { name } = await params;
    console.error(
      `[Promotion History API] Error fetching history for ${name}:`,
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch promotion history",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
