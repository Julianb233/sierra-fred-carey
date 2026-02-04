import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";
import type { TopInsightsResponse, TopInsight } from "@/lib/types/insights";

export const dynamic = "force-dynamic";

/**
 * GET /api/insights/top-insights
 * Get top AI-extracted insights for the insights dashboard
 *
 * SECURITY: Requires authentication - userId from server-side session
 * Query params:
 *   - limit: Number of insights to return (default: 10)
 *   - minImportance: Minimum importance score (default: 5)
 *   - type: Filter by insight type (optional)
 *   - includeDismissed: Include dismissed insights (default: false)
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const minImportance = parseInt(
      url.searchParams.get("minImportance") || "5",
      10
    );
    const type = url.searchParams.get("type");
    const includeDismissed =
      url.searchParams.get("includeDismissed") === "true";

    let query = sql`
      SELECT
        id,
        source_type as "sourceType",
        source_id as "sourceId",
        insight_type as type,
        title,
        content,
        importance,
        tags,
        is_dismissed as "isDismissed",
        created_at as "createdAt"
      FROM ai_insights
      WHERE user_id = ${userId}
        AND importance >= ${minImportance}
    `;

    if (!includeDismissed) {
      query = sql`${query} AND is_dismissed = false`;
    }

    if (type) {
      query = sql`${query} AND insight_type = ${type}`;
    }

    query = sql`${query}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${limit}
    `;

    const results = await query;

    const insights: TopInsight[] = results.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      importance: row.importance,
      tags: row.tags || [],
      sourceType: row.sourceType,
      createdAt: row.createdAt.toISOString().split('T')[0],
    }));

    const response: TopInsightsResponse = {
      success: true,
      data: insights
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("[GET /api/insights/top-insights]", error);

    // Handle auth errors
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch insights"
      } as TopInsightsResponse,
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/insights/top-insights
 * Dismiss or restore an insight
 *
 * SECURITY: Requires authentication - userId from server-side session
 * Body: { insightId: string, isDismissed: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();
    const body = await req.json();
    const { insightId, isDismissed } = body;

    if (!insightId) {
      return NextResponse.json(
        { success: false, error: "Missing insightId" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE ai_insights
      SET is_dismissed = ${isDismissed !== false}
      WHERE id = ${insightId}
        AND user_id = ${userId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[PATCH /api/insights/top-insights]", error);

    // Handle auth errors
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { success: false, error: "Failed to update insight" },
      { status: 500 }
    );
  }
}
