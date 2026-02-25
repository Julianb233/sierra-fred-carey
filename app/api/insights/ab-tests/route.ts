import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";
import type { ABTestsResponse, ABTestResult, ABTestVariantStats } from "@/lib/types/insights";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/ab-tests
 * Get A/B test results for the insights dashboard
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    // Get all experiments with their variants
    const experimentsQuery = includeInactive
      ? sql`
          SELECT
            e.id,
            e.name,
            e.description,
            e.is_active as "isActive",
            e.start_date as "startDate",
            e.end_date as "endDate"
          FROM ab_experiments e
          ORDER BY e.is_active DESC, e.created_at DESC
        `
      : sql`
          SELECT
            e.id,
            e.name,
            e.description,
            e.is_active as "isActive",
            e.start_date as "startDate",
            e.end_date as "endDate"
          FROM ab_experiments e
          WHERE e.is_active = true
          ORDER BY e.created_at DESC
        `;

    const experiments = await experimentsQuery;

    // For each experiment, get variant stats
    const results = await Promise.all(
      experiments.map(async (exp) => {
        const variantStats = await sql`
          SELECT
            v.variant_name as "variantName",
            COUNT(req.id)::INTEGER as total_requests,
            AVG(resp.latency_ms)::INTEGER as avg_latency,
            SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(req.id), 0) as error_rate
          FROM ab_variants v
          LEFT JOIN ai_requests req ON req.variant_id = v.id
          LEFT JOIN ai_responses resp ON resp.request_id = req.id
          WHERE v.experiment_id = ${exp.id}
          GROUP BY v.id, v.variant_name
          ORDER BY v.variant_name
        `;

        return {
          experimentName: exp.name as string,
          description: exp.description as string,
          isActive: exp.isActive as boolean,
          startDate: exp.startDate as string,
          endDate: (exp.endDate as string) || undefined,
          variants: variantStats.map((v) => ({
            variantName: v.variantName as string,
            totalRequests: (v.total_requests as number) || 0,
            avgLatency: (v.avg_latency as number) || 0,
            errorRate: parseFloat((v.error_rate as string) || "0"),
          })),
        };
      })
    );

    const response: ABTestsResponse = {
      success: true,
      data: results
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("[GET /api/insights/ab-tests]", error);

    // Handle auth errors
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch A/B test results"
      } as ABTestsResponse,
      { status: 500 }
    );
  }
}
