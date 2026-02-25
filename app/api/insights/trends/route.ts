import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface TrendDataPoint {
  date: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  insights: number;
}

export interface TrendsResponse {
  success: boolean;
  data: TrendDataPoint[];
  error?: string;
}

/**
 * GET /api/insights/trends
 * Get trend data for charts over time
 *
 * SECURITY: Requires authentication - userId from server-side session
 * Query params:
 *   - days: Number of days to look back (default: 30)
 *   - granularity: 'day' | 'week' (default: 'day')
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();
    const url = new URL(req.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 1), 365);
    const granularity = url.searchParams.get("granularity") || "day";

    // SECURITY: Strict allowlist for granularity to prevent SQL injection via sql.unsafe
    const ALLOWED_GRANULARITIES: Record<string, string> = {
      day: "DATE(req.created_at)",
      week: "DATE_TRUNC('week', req.created_at)",
    };

    const dateFormat = ALLOWED_GRANULARITIES[granularity];
    if (!dateFormat) {
      return NextResponse.json(
        { success: false, error: "Invalid granularity. Must be 'day' or 'week'." },
        { status: 400 }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const trends = await sql`
      WITH daily_stats AS (
        SELECT
          ${sql.unsafe(dateFormat)} as date,
          COUNT(DISTINCT req.id)::INTEGER as total_requests,
          AVG(resp.latency_ms)::INTEGER as avg_response_time,
          SUM(CASE WHEN resp.error IS NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(req.id), 0) as success_rate
        FROM ai_requests req
        LEFT JOIN ai_responses resp ON resp.request_id = req.id
        WHERE req.user_id = ${userId}
          AND req.created_at >= ${since.toISOString()}
        GROUP BY ${sql.unsafe(dateFormat)}
      ),
      daily_insights AS (
        SELECT
          DATE(created_at) as date,
          COUNT(*)::INTEGER as insights
        FROM ai_insights
        WHERE user_id = ${userId}
          AND created_at >= ${since.toISOString()}
        GROUP BY DATE(created_at)
      )
      SELECT
        ds.date,
        COALESCE(ds.total_requests, 0) as total_requests,
        COALESCE(ds.avg_response_time, 0) as avg_response_time,
        COALESCE(ds.success_rate, 0) as success_rate,
        COALESCE(di.insights, 0) as insights
      FROM daily_stats ds
      LEFT JOIN daily_insights di ON ds.date = di.date
      ORDER BY ds.date ASC
    `;

    const trendData: TrendDataPoint[] = trends.map((row) => ({
      date: new Date(row.date as string).toISOString().split("T")[0],
      totalRequests: row.total_requests as number,
      successRate: parseFloat(((row.success_rate as number) * 100).toFixed(2)),
      avgResponseTime: row.avg_response_time as number,
      insights: row.insights as number,
    }));

    const response: TrendsResponse = {
      success: true,
      data: trendData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/insights/trends]", error);

    // Handle auth errors
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trend data",
      } as TrendsResponse,
      { status: 500 }
    );
  }
}
