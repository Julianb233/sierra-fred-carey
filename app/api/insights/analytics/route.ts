import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";
import type { AnalyticsResponse, AIAnalytics } from "@/lib/types/insights";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/analytics
 * Get AI analytics metrics for the insights dashboard
 *
 * SECURITY: Requires authentication - userId from server-side session
 * Query params:
 *   - days: Number of days to look back (default: 30)
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get total requests and success metrics
    const totalStats = await sql`
      SELECT
        COUNT(DISTINCT req.id) as total_requests,
        AVG(resp.latency_ms)::INTEGER as avg_response_time,
        SUM(CASE WHEN resp.error IS NULL THEN 1 ELSE 0 END)::FLOAT / COUNT(req.id) as success_rate,
        SUM(COALESCE(resp.tokens_used, 0))::INTEGER as total_tokens_used
      FROM ai_requests req
      LEFT JOIN ai_responses resp ON resp.request_id = req.id
      WHERE req.user_id = ${userId}
        AND req.created_at >= ${since.toISOString()}
    `;

    // Get stats by analyzer
    const analyzerStats = await sql`
      SELECT
        req.analyzer,
        COUNT(req.id)::INTEGER as count,
        AVG(resp.latency_ms)::INTEGER as avg_latency,
        SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / COUNT(req.id) as error_rate
      FROM ai_requests req
      LEFT JOIN ai_responses resp ON resp.request_id = req.id
      WHERE req.user_id = ${userId}
        AND req.created_at >= ${since.toISOString()}
      GROUP BY req.analyzer
      ORDER BY count DESC
    `;

    const analytics: AIAnalytics = {
      totalRequests: parseInt(totalStats[0]?.total_requests || "0", 10),
      avgResponseTime: totalStats[0]?.avg_response_time || 0,
      successRate: parseFloat(totalStats[0]?.success_rate || "0"),
      totalTokensUsed: totalStats[0]?.total_tokens_used || 0,
      requestsByAnalyzer: analyzerStats.map((row: any) => ({
        analyzer: row.analyzer,
        count: row.count,
        avgLatency: row.avg_latency || 0,
        errorRate: parseFloat(row.error_rate || "0"),
      })),
    };

    const response: AnalyticsResponse = {
      success: true,
      data: analytics
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("[GET /api/insights/analytics]", error);

    // Handle auth errors
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch AI analytics"
      } as AnalyticsResponse,
      { status: 500 }
    );
  }
}
