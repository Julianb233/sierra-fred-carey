import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import { sql } from "@/lib/db/supabase-sql";
import type {
  ConversionDataPoint,
  LatencyDataPoint,
  TrafficDataPoint,
  ErrorRateDataPoint,
  TimeRange,
} from "@/lib/types/charts";

/**
 * GET /api/monitoring/charts
 * Returns chart data for the monitoring dashboard
 *
 * Query params:
 * - type: "conversion" | "latency" | "traffic" | "error"
 * - range: "24h" | "7d" | "30d"
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const chartType = searchParams.get("type") || "conversion";
    const timeRange = (searchParams.get("range") || "7d") as TimeRange;

    console.log(`[Charts API] Fetching ${chartType} data for range: ${timeRange}`);

    let data;

    switch (chartType) {
      case "conversion":
        data = await getConversionData(timeRange);
        break;
      case "latency":
        data = await getLatencyData(timeRange);
        break;
      case "traffic":
        data = await getTrafficData();
        break;
      case "error":
        data = await getErrorRateData(timeRange);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown chart type: ${chartType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      chartType,
      timeRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Charts API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch chart data",
      },
      { status: 500 }
    );
  }
}

/**
 * Get conversion rate data per variant over time
 */
async function getConversionData(range: TimeRange): Promise<ConversionDataPoint[]> {
  const { interval, count, sqlInterval } = getTimeParams(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - count * interval);

  try {
    // Query conversion metrics grouped by time bucket and variant
    const result = await sql`
      WITH time_buckets AS (
        SELECT generate_series(
          ${startDate.toISOString()}::timestamp,
          ${now.toISOString()}::timestamp,
          ${sqlInterval}::interval
        ) as bucket_start
      ),
      variant_conversions AS (
        SELECT
          v.variant_name,
          date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at) as time_bucket,
          COUNT(DISTINCT req.id) as requests,
          COUNT(DISTINCT CASE WHEN conv.id IS NOT NULL THEN req.id END) as conversions
        FROM ab_variants v
        JOIN ab_experiments e ON v.experiment_id = e.id
        LEFT JOIN ai_requests req ON req.variant_id = v.id
          AND req.created_at >= ${startDate.toISOString()}
        LEFT JOIN conversions conv ON conv.request_id = req.id
        WHERE e.is_active = true
        GROUP BY v.variant_name, date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at)
      )
      SELECT
        tb.bucket_start as timestamp,
        COALESCE(MAX(CASE WHEN vc.variant_name = 'control' OR vc.variant_name LIKE '%A%'
          THEN CASE WHEN vc.requests > 0 THEN (vc.conversions::float / vc.requests * 100) ELSE 0 END END), 0) as "variantA",
        COALESCE(MAX(CASE WHEN vc.variant_name LIKE '%B%' OR vc.variant_name = 'variant_b'
          THEN CASE WHEN vc.requests > 0 THEN (vc.conversions::float / vc.requests * 100) ELSE 0 END END), 0) as "variantB",
        COALESCE(MAX(CASE WHEN vc.variant_name LIKE '%C%' OR vc.variant_name = 'variant_c'
          THEN CASE WHEN vc.requests > 0 THEN (vc.conversions::float / vc.requests * 100) ELSE 0 END END), 0) as "variantC"
      FROM time_buckets tb
      LEFT JOIN variant_conversions vc ON date_trunc(${range === '24h' ? 'hour' : 'day'}, tb.bucket_start) = vc.time_bucket
      GROUP BY tb.bucket_start
      ORDER BY tb.bucket_start ASC
    `;

    if (result.length === 0) {
      return [];
    }

    return result.map((row: Record<string, unknown>) => {
      const timestamp = new Date(row.timestamp as string).getTime();
      return {
        timestamp,
        date: formatDate(new Date(row.timestamp as string), range),
        variantA: parseFloat(String(row.variantA)) || 0,
        variantB: parseFloat(String(row.variantB)) || 0,
        variantC: parseFloat(String(row.variantC)) || 0,
      };
    });
  } catch (error) {
    console.error("[Charts API] Conversion data error:", error);
    return [];
  }
}

/**
 * Get latency percentile data over time
 */
async function getLatencyData(range: TimeRange): Promise<LatencyDataPoint[]> {
  const { interval, count, sqlInterval } = getTimeParams(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - count * interval);

  try {
    const result = await sql`
      WITH time_buckets AS (
        SELECT generate_series(
          ${startDate.toISOString()}::timestamp,
          ${now.toISOString()}::timestamp,
          ${sqlInterval}::interval
        ) as bucket_start
      ),
      latency_stats AS (
        SELECT
          date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at) as time_bucket,
          AVG(resp.latency_ms) as avg_latency,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resp.latency_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY resp.latency_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY resp.latency_ms) as p99
        FROM ai_requests req
        JOIN ai_responses resp ON resp.request_id = req.id
        WHERE req.created_at >= ${startDate.toISOString()}
          AND resp.latency_ms IS NOT NULL
        GROUP BY date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at)
      )
      SELECT
        tb.bucket_start as timestamp,
        COALESCE(ls.avg_latency, 0) as avg,
        COALESCE(ls.p50, 0) as p50,
        COALESCE(ls.p95, 0) as p95,
        COALESCE(ls.p99, 0) as p99
      FROM time_buckets tb
      LEFT JOIN latency_stats ls ON date_trunc(${range === '24h' ? 'hour' : 'day'}, tb.bucket_start) = ls.time_bucket
      ORDER BY tb.bucket_start ASC
    `;

    if (result.length === 0) {
      return [];
    }

    return result.map((row: Record<string, unknown>) => {
      const timestamp = new Date(row.timestamp as string).getTime();
      return {
        timestamp,
        date: formatDate(new Date(row.timestamp as string), range),
        avg: Math.round(parseFloat(String(row.avg)) || 0),
        p50: Math.round(parseFloat(String(row.p50)) || 0),
        p95: Math.round(parseFloat(String(row.p95)) || 0),
        p99: Math.round(parseFloat(String(row.p99)) || 0),
      };
    });
  } catch (error) {
    console.error("[Charts API] Latency data error:", error);
    return [];
  }
}

/**
 * Get traffic distribution data
 */
async function getTrafficData(): Promise<TrafficDataPoint[]> {
  try {
    const result = await sql`
      SELECT
        v.variant_name,
        v.traffic_percentage,
        COUNT(DISTINCT req.id) as total_requests
      FROM ab_variants v
      JOIN ab_experiments e ON v.experiment_id = e.id
      LEFT JOIN ai_requests req ON req.variant_id = v.id
        AND req.created_at >= NOW() - INTERVAL '24 hours'
      WHERE e.is_active = true
      GROUP BY v.variant_name, v.traffic_percentage
      ORDER BY v.variant_name
    `;

    if (result.length === 0) {
      return [];
    }

    const totalRequests = result.reduce((sum: number, row: Record<string, unknown>) =>
      sum + (parseInt(String(row.total_requests)) || 0), 0);

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    return result.map((row: Record<string, unknown>, index: number) => {
      const requests = parseInt(String(row.total_requests)) || 0;
      const percentage = totalRequests > 0 ? (requests / totalRequests) * 100 : 0;

      return {
        variant: String(row.variant_name),
        traffic: requests,
        percentage: Math.round(percentage * 10) / 10,
        fill: colors[index % colors.length],
      };
    });
  } catch (error) {
    console.error("[Charts API] Traffic data error:", error);
    return [];
  }
}

/**
 * Get error rate data over time
 */
async function getErrorRateData(range: TimeRange): Promise<ErrorRateDataPoint[]> {
  const { interval, count, sqlInterval } = getTimeParams(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - count * interval);
  const threshold = 2.0; // 2% error rate threshold

  try {
    const result = await sql`
      WITH time_buckets AS (
        SELECT generate_series(
          ${startDate.toISOString()}::timestamp,
          ${now.toISOString()}::timestamp,
          ${sqlInterval}::interval
        ) as bucket_start
      ),
      error_stats AS (
        SELECT
          date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at) as time_bucket,
          COUNT(DISTINCT req.id) as total_requests,
          COUNT(DISTINCT CASE WHEN resp.error IS NOT NULL THEN req.id END) as error_count
        FROM ai_requests req
        LEFT JOIN ai_responses resp ON resp.request_id = req.id
        WHERE req.created_at >= ${startDate.toISOString()}
        GROUP BY date_trunc(${range === '24h' ? 'hour' : 'day'}, req.created_at)
      )
      SELECT
        tb.bucket_start as timestamp,
        CASE
          WHEN COALESCE(es.total_requests, 0) > 0
          THEN (COALESCE(es.error_count, 0)::float / es.total_requests * 100)
          ELSE 0
        END as "errorRate"
      FROM time_buckets tb
      LEFT JOIN error_stats es ON date_trunc(${range === '24h' ? 'hour' : 'day'}, tb.bucket_start) = es.time_bucket
      ORDER BY tb.bucket_start ASC
    `;

    if (result.length === 0) {
      return [];
    }

    return result.map((row: Record<string, unknown>) => {
      const timestamp = new Date(row.timestamp as string).getTime();
      return {
        timestamp,
        date: formatDate(new Date(row.timestamp as string), range),
        errorRate: Math.round(parseFloat(String(row.errorRate)) * 100) / 100 || 0,
        threshold,
      };
    });
  } catch (error) {
    console.error("[Charts API] Error rate data error:", error);
    return [];
  }
}

// Helper functions

function getTimeParams(range: TimeRange): {
  interval: number;
  count: number;
  sqlInterval: string;
} {
  switch (range) {
    case "24h":
      return { interval: 60 * 60 * 1000, count: 24, sqlInterval: "1 hour" };
    case "7d":
      return { interval: 24 * 60 * 60 * 1000, count: 7, sqlInterval: "1 day" };
    case "30d":
      return { interval: 24 * 60 * 60 * 1000, count: 30, sqlInterval: "1 day" };
  }
}

function formatDate(date: Date, range: TimeRange): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: range === "24h" ? "numeric" : undefined,
  });
}

