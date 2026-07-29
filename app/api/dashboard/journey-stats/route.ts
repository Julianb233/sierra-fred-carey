import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { STAGE_CONFIG } from "@/lib/oases/stage-config";

/**
 * GET /api/dashboard/journey-stats
 *
 * Returns summary stats for the journey completion page:
 * - completedStages / totalStages
 * - investorReadinessScore (latest, if available)
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = createServiceClient();

    const totalStages = STAGE_CONFIG.length;

    // Get oases progress
    const { data: progress } = await supabase
      .from("oases_progress")
      .select("stage, completed")
      .eq("user_id", userId);

    const completedStages = progress
      ? progress.filter((p: { completed: boolean }) => p.completed).length
      : 0;

    // Get latest investor readiness score
    const { data: readiness } = await supabase
      .from("investor_readiness_scores")
      .select("overall_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      completedStages,
      totalStages,
      investorReadinessScore: readiness?.overall_score ?? null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;

    console.error("[journey-stats] Error:", error);
    return NextResponse.json(
      { completedStages: 0, totalStages: STAGE_CONFIG.length, investorReadinessScore: null },
      { status: 200 }
    );
  }
}
