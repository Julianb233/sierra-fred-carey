import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * Helper: run a query and return a fallback on table-not-found errors
 */
async function safeQuery<T = any>(query: Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await query;
  } catch (err: any) {
    const msg = err?.message || "";
    if (err?.code === "42P01" || msg.includes("does not exist") || msg.includes("relation")) {
      return fallback;
    }
    throw err;
  }
}

/**
 * GET /api/admin/training/requests
 * List AI requests for training data review.
 * Query params:
 * - limit: max results (default 50, max 200)
 * - analyzer: filter by analyzer type
 * - model: filter by model name
 * - hasError: "true" to show only errored requests, "false" for successful only
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    logger.log("[Admin Training Requests GET] Fetching training requests");

    const { searchParams } = new URL(request.url);
    const analyzer = searchParams.get("analyzer");
    const model = searchParams.get("model");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50", 10) || 50, 200);

    // Get total count
    const countResult = await safeQuery(
      sql`
        SELECT COUNT(*) as total
        FROM ai_requests
      `
    );
    const totalCount = parseInt(countResult[0]?.total || "0", 10);

    // Fetch requests with optional filters
    let requests: any[];

    if (analyzer) {
      requests = await safeQuery(
        sql`
          SELECT
            id,
            user_id as "userId",
            analyzer,
            model,
            user_prompt as "userPrompt",
            system_prompt as "systemPrompt",
            variant_id as "variantId",
            created_at as "createdAt"
          FROM ai_requests
          WHERE analyzer = ${analyzer}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    } else if (model) {
      requests = await safeQuery(
        sql`
          SELECT
            id,
            user_id as "userId",
            analyzer,
            model,
            user_prompt as "userPrompt",
            system_prompt as "systemPrompt",
            variant_id as "variantId",
            created_at as "createdAt"
          FROM ai_requests
          WHERE model = ${model}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    } else {
      requests = await safeQuery(
        sql`
          SELECT
            id,
            user_id as "userId",
            analyzer,
            model,
            user_prompt as "userPrompt",
            system_prompt as "systemPrompt",
            variant_id as "variantId",
            created_at as "createdAt"
          FROM ai_requests
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      );
    }

    return NextResponse.json({
      success: true,
      requests,
      total: totalCount,
      returned: requests.length,
    });
  } catch (error) {
    console.error("[Admin Training Requests GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch training requests" },
      { status: 500 }
    );
  }
}
