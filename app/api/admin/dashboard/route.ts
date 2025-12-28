import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db/neon";

async function isAdmin() {
  const cookieStore = await cookies();
  const adminKey = cookieStore.get("adminKey")?.value;
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get prompt count
    const promptsResult = await sql`
      SELECT COUNT(DISTINCT name) as count
      FROM ai_prompts
    `;
    const totalPrompts = parseInt(promptsResult[0]?.count || "0", 10);

    // Get config count
    const configsResult = await sql`
      SELECT COUNT(*) as count
      FROM ai_config
    `;
    const totalConfigs = parseInt(configsResult[0]?.count || "0", 10);

    // Get active experiments count
    const experimentsResult = await sql`
      SELECT COUNT(*) as count
      FROM ab_experiments
      WHERE is_active = true
    `;
    const activeExperiments = parseInt(experimentsResult[0]?.count || "0", 10);

    // Get average rating (last 30 days)
    const ratingsResult = await sql`
      SELECT AVG(rating) as avg_rating
      FROM ai_ratings
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;
    const avgRating = parseFloat(ratingsResult[0]?.avg_rating || "0");

    // Get recent activity (placeholder - customize based on your needs)
    const recentActivity = [
      {
        id: "1",
        type: "prompt",
        message: "System initialized - ready to track activity",
        timestamp: new Date().toISOString(),
      },
    ];

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
