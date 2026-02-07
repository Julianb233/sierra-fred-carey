import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/ab-tests/[id]/end
 * End an A/B test experiment
 * Convenience endpoint that sets is_active=false and end_date=NOW()
 * Optional body: {
 *   winningVariantId?: string - Mark a variant as the winner
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { winningVariantId } = body;

    logger.log(`[Admin A/B Test End] Ending experiment ${experimentId}`);

    // Check if experiment exists
    const experimentCheck = await sql`
      SELECT id, name, is_active as "isActive" FROM ab_experiments WHERE id = ${experimentId}
    `;

    if (experimentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experimentName = experimentCheck[0].name;
    const wasActive = experimentCheck[0].isActive;

    if (!wasActive) {
      return NextResponse.json(
        {
          success: false,
          error: `Experiment '${experimentName}' is already ended`,
        },
        { status: 400 }
      );
    }

    // End the experiment
    await sql`
      UPDATE ab_experiments
      SET
        is_active = false,
        end_date = NOW()
      WHERE id = ${experimentId}
    `;

    // Optionally mark a winning variant
    let winningVariant = null;
    if (winningVariantId) {
      // Verify the variant belongs to this experiment
      const variantCheck = await sql`
        SELECT
          v.id,
          v.variant_name as "variantName",
          v.experiment_id as "experimentId"
        FROM ab_variants v
        WHERE v.id = ${winningVariantId}
          AND v.experiment_id = ${experimentId}
      `;

      if (variantCheck.length === 0) {
        console.warn(
          `[Admin A/B Test End] Warning: Variant ${winningVariantId} not found or doesn't belong to experiment ${experimentId}`
        );
      } else {
        winningVariant = variantCheck[0];
        logger.log(
          `[Admin A/B Test End] Marked variant '${winningVariant.variantName}' as winner`
        );
      }
    }

    // Get final metrics for all variants
    const variants = await sql`
      SELECT
        v.id,
        v.variant_name as "variantName",
        v.traffic_percentage as "trafficPercentage",
        COUNT(req.id) as "totalRequests",
        AVG(resp.latency_ms) as "avgLatency",
        SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(req.id), 0) as "errorRate",
        AVG(resp.tokens_used) as "avgTokensUsed"
      FROM ab_variants v
      LEFT JOIN ai_requests req ON req.variant_id = v.id
      LEFT JOIN ai_responses resp ON resp.request_id = req.id
      WHERE v.experiment_id = ${experimentId}
      GROUP BY v.id, v.variant_name, v.traffic_percentage
      ORDER BY v.variant_name
    `;

    const formattedVariants = variants.map((variant: any) => ({
      id: variant.id,
      variantName: variant.variantName,
      trafficPercentage: parseFloat(variant.trafficPercentage) || 0,
      totalRequests: parseInt(variant.totalRequests, 10) || 0,
      avgLatency: parseFloat(variant.avgLatency) || null,
      errorRate: parseFloat(variant.errorRate) || null,
      avgTokensUsed: parseFloat(variant.avgTokensUsed) || null,
      isWinner: winningVariantId === variant.id,
    }));

    logger.log(`[Admin A/B Test End] Ended experiment '${experimentName}'`);

    return NextResponse.json({
      success: true,
      experimentId,
      experimentName,
      endedAt: new Date().toISOString(),
      winningVariant: winningVariant,
      finalMetrics: formattedVariants,
      message: winningVariant
        ? `Ended experiment '${experimentName}'. Winner: ${winningVariant.variantName}`
        : `Ended experiment '${experimentName}'. No winner declared.`,
    });
  } catch (error) {
    console.error("[Admin A/B Test End] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to end experiment" },
      { status: 500 }
    );
  }
}
