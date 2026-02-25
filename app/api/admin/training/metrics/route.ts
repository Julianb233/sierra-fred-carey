import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * Helper: run a query and return a fallback on table-not-found errors
 */
async function safeQuery<T = Record<string, unknown>>(query: Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await query;
  } catch (err: unknown) {
    const errObj = err as Error & { code?: string };
    const msg = errObj?.message || "";
    if (errObj?.code === "42P01" || msg.includes("does not exist") || msg.includes("relation")) {
      return fallback;
    }
    throw err;
  }
}

/**
 * GET /api/admin/training/metrics
 * Retrieve AI training metrics derived from ai_requests, ai_responses, and ai_ratings tables.
 * Query params:
 * - analyzer: filter by specific analyzer type
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    logger.log("[Admin Training Metrics GET] Fetching training metrics");

    const { searchParams } = new URL(request.url);
    const analyzer = searchParams.get("analyzer");

    // Overall request/response performance metrics
    const requestMetrics = await safeQuery(
      analyzer
        ? sql`
            SELECT
              COUNT(*) as total_requests,
              analyzer
            FROM ai_requests
            WHERE analyzer = ${analyzer}
            ORDER BY analyzer
          `
        : sql`
            SELECT
              COUNT(*) as total_requests
            FROM ai_requests
          `
    );

    const responseMetrics = await safeQuery(
      sql`
        SELECT
          COUNT(*) as total_responses
        FROM ai_responses
      `
    );

    const latencyMetrics = await safeQuery(
      sql`
        SELECT
          COUNT(*) as count
        FROM ai_responses
        WHERE error IS NULL
      `
    );

    const errorMetrics = await safeQuery(
      sql`
        SELECT
          COUNT(*) as error_count
        FROM ai_responses
        WHERE error IS NOT NULL
      `
    );

    // Rating metrics
    const ratingMetrics = await safeQuery(
      sql`
        SELECT
          COUNT(*) as total_ratings
        FROM ai_ratings
      `
    );

    // Per-analyzer breakdown
    const analyzerBreakdown = await safeQuery(
      sql`
        SELECT
          analyzer,
          COUNT(*) as request_count
        FROM ai_requests
        ORDER BY analyzer
      `
    );

    // Model usage breakdown
    const modelUsage = await safeQuery(
      sql`
        SELECT
          model,
          COUNT(*) as usage_count
        FROM ai_requests
        ORDER BY model
      `
    );

    const totalRequests = parseInt(String(requestMetrics[0]?.total_requests || "0"), 10);
    const totalResponses = parseInt(String(responseMetrics[0]?.total_responses || "0"), 10);
    const successfulResponses = parseInt(String(latencyMetrics[0]?.count || "0"), 10);
    const errorCount = parseInt(String(errorMetrics[0]?.error_count || "0"), 10);
    const totalRatings = parseInt(String(ratingMetrics[0]?.total_ratings || "0"), 10);
    const errorRate = totalResponses > 0 ? errorCount / totalResponses : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalRequests,
        totalResponses,
        successfulResponses,
        errorCount,
        errorRate: Math.round(errorRate * 10000) / 10000,
        totalRatings,
        analyzerBreakdown: analyzerBreakdown.map((row: Record<string, unknown>) => ({
          analyzer: row.analyzer,
          requestCount: parseInt((row.request_count as string) || "0", 10),
        })),
        modelUsage: modelUsage.map((row: Record<string, unknown>) => ({
          model: row.model,
          usageCount: parseInt((row.usage_count as string) || "0", 10),
        })),
      },
    });
  } catch (error) {
    console.error("[Admin Training Metrics GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch training metrics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/training/metrics
 * Record a training metric snapshot.
 * Body: {
 *   analyzer: string (required) - The analyzer type
 *   model: string (required) - The model used
 *   accuracy?: number - Accuracy score (0-1)
 *   latencyMs?: number - Response latency in ms
 *   notes?: string - Optional notes
 * }
 *
 * Stores metrics as an ai_request + ai_response pair for consistency
 * with the existing schema (no separate training_metrics table).
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      analyzer,
      model,
      accuracy,
      latencyMs = 0,
      notes = "",
    } = body;

    if (!analyzer) {
      return NextResponse.json(
        { success: false, error: "analyzer is required" },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { success: false, error: "model is required" },
        { status: 400 }
      );
    }

    if (accuracy !== undefined && (accuracy < 0 || accuracy > 1)) {
      return NextResponse.json(
        { success: false, error: "accuracy must be between 0 and 1" },
        { status: 400 }
      );
    }

    logger.log(`[Admin Training Metrics POST] Recording metric for ${analyzer}/${model}`);

    // Store as an ai_request entry with a training marker in the input_data
    const inputData = JSON.stringify({
      type: "training_metric",
      accuracy: accuracy ?? null,
      notes,
    });

    const requestResult = await safeQuery(
      sql`
        INSERT INTO ai_requests (
          analyzer,
          input_data,
          user_prompt,
          model
        )
        VALUES (
          ${analyzer},
          ${inputData},
          ${"[training metric snapshot]"},
          ${model}
        )
        RETURNING id, analyzer, model, created_at
      `
    );

    if (requestResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to record metric - ai_requests table may not exist" },
        { status: 500 }
      );
    }

    // Also record a response entry for latency tracking
    const responseResult = await safeQuery(
      sql`
        INSERT INTO ai_responses (
          request_id,
          response_text,
          latency_ms,
          provider
        )
        VALUES (
          ${requestResult[0].id},
          ${"[training metric response]"},
          ${latencyMs},
          ${model}
        )
        RETURNING id, request_id, latency_ms, created_at
      `
    );

    logger.log(`[Admin Training Metrics POST] Recorded metric ${requestResult[0].id}`);

    return NextResponse.json(
      {
        success: true,
        metric: {
          id: requestResult[0].id,
          analyzer,
          model,
          accuracy: accuracy ?? null,
          latencyMs,
          notes,
          responseId: responseResult[0]?.id || null,
          createdAt: requestResult[0].created_at,
        },
        message: `Training metric recorded for ${analyzer}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin Training Metrics POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record training metric" },
      { status: 500 }
    );
  }
}
