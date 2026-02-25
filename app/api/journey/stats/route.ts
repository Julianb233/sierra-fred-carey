import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Helper to safely execute a Supabase query with a fallback
async function safeQuery<T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const result = await query;
    return result.data ?? fallback;
  } catch {
    return fallback;
  }
}

async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const result = await query;
    return result.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * GET /api/journey/stats
 * Get journey statistics for the dashboard header cards
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(_request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();
    const supabase = await createClient();

    // Fetch multiple stats in parallel with individual error handling
    const [
      ideaScoreData,
      investorScoreData,
      milestoneStats,
      insightStats,
    ] = await Promise.all([
      // Latest idea score from reality lens
      safeQuery(
        supabase
          .from("journey_events")
          .select("score_after")
          .eq("user_id", userId)
          .eq("event_type", "analysis_completed")
          .order("created_at", { ascending: false })
          .limit(1),
        [] as Record<string, unknown>[]
      ),

      // Latest investor readiness score
      safeQuery(
        supabase
          .from("journey_events")
          .select("score_after")
          .eq("user_id", userId)
          .eq("event_type", "score_improved")
          .order("created_at", { ascending: false })
          .limit(1),
        [] as Record<string, unknown>[]
      ),

      // Milestone statistics - count by status
      Promise.all([
        safeCount(
          supabase
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "completed")
        ),
        safeCount(
          supabase
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "in_progress")
        ),
        safeCount(
          supabase
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "pending")
        ),
        safeCount(
          supabase
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
        ),
      ]),

      // Insight statistics - count by attributes
      Promise.all([
        safeCount(
          supabase
            .from("ai_insights")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
        ),
        safeCount(
          supabase
            .from("ai_insights")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_dismissed", false)
        ),
        safeCount(
          supabase
            .from("ai_insights")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_pinned", true)
        ),
        safeCount(
          supabase
            .from("ai_insights")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("importance", 7)
        ),
      ]),
    ]);

    // Extract scores
    const ideaScore = ideaScoreData?.[0]?.score_after ?? null;
    const investorScore = investorScoreData?.[0]?.score_after ?? null;

    // Calculate execution streak from recent activity
    let streakDays = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: events } = await supabase
        .from("journey_events")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (events && events.length > 0) {
        const uniqueDates = [...new Set(
          events.map((e) => new Date(e.created_at).toISOString().split("T")[0])
        )].sort().reverse();

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          streakDays = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
            if (Math.abs(diffDays - 1) < 0.1) {
              streakDays++;
            } else {
              break;
            }
          }
        }
      }
    } catch {
      // Streak calculation failed, default to 0
    }

    const [completed, inProgress, pending, total] = milestoneStats;
    const [insTotal, insActive, insPinned, insHighImportance] = insightStats;

    return NextResponse.json({
      success: true,
      data: {
        ideaScore,
        investorReadiness: investorScore,
        executionStreak: streakDays,
        milestones: {
          completed: Number(completed),
          inProgress: Number(inProgress),
          pending: Number(pending),
          total: Number(total),
        },
        insights: {
          total: Number(insTotal),
          active: Number(insActive),
          pinned: Number(insPinned),
          highImportance: Number(insHighImportance),
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[GET /api/journey/stats]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch journey stats" },
      { status: 500 }
    );
  }
}
