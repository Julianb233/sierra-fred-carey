import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { isAdminSession } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Helper: run a query and return a fallback on table-not-found errors
  async function safeQuery(query: Promise<any[]>): Promise<any[]> {
    try {
      return await query;
    } catch (err: any) {
      const msg = err?.message || "";
      if (err?.code === "42P01" || msg.includes("does not exist") || msg.includes("relation")) {
        return [];
      }
      throw err;
    }
  }

  try {
    // Get prompt count
    const promptsResult = await safeQuery(sql`
      SELECT COUNT(DISTINCT name) as count
      FROM ai_prompts
    `);
    const totalPrompts = parseInt(promptsResult[0]?.count || "0", 10);

    // Get config count
    const configsResult = await safeQuery(sql`
      SELECT COUNT(*) as count
      FROM ai_config
    `);
    const totalConfigs = parseInt(configsResult[0]?.count || "0", 10);

    // Get active experiments count
    const experimentsResult = await safeQuery(sql`
      SELECT COUNT(*) as count
      FROM ab_experiments
      WHERE is_active = true
    `);
    const activeExperiments = parseInt(experimentsResult[0]?.count || "0", 10);

    // Get average rating (last 30 days)
    const ratingsResult = await safeQuery(sql`
      SELECT COUNT(*) as count
      FROM ai_ratings
    `);
    const avgRating = ratingsResult.length > 0 ? parseFloat(ratingsResult[0]?.count || "0") : 0;

    // Get recent activity from prompt and config changes (separate queries
    // instead of UNION, since the custom SQL parser does not support UNION)
    const promptActivity = await safeQuery(sql`
      SELECT id, name, updated_at
      FROM ai_prompts
      WHERE updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    const configActivity = await safeQuery(sql`
      SELECT id, analyzer, updated_at
      FROM ai_config
      WHERE updated_at IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    // Merge and sort activity entries
    const recentActivity = [
      ...promptActivity.map((row: any) => ({
        id: String(row.id),
        type: "prompt",
        message: `Prompt updated: ${String(row.name || "")}`,
        timestamp: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
      })),
      ...configActivity.map((row: any) => ({
        id: String(row.id),
        type: "config",
        message: `Config updated: ${String(row.analyzer || "")}`,
        timestamp: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return NextResponse.json({
      totalPrompts,
      totalConfigs,
      activeExperiments,
      avgRating,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
