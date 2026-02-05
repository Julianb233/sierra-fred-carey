import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/journey/stats
 * Get journey statistics for the dashboard header cards
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    // Fetch multiple stats in parallel
    const [
      ideaScoreResult,
      investorScoreResult,
      streakResult,
      milestoneStats,
      insightStats
    ] = await Promise.all([
      // Latest idea score from reality lens
      sql`
        SELECT score_after as score
        FROM journey_events
        WHERE user_id = ${userId}
          AND event_type = 'analysis_completed'
          AND event_data->>'analyzer' = 'reality_lens'
        ORDER BY created_at DESC
        LIMIT 1
      `,

      // Latest investor readiness score
      sql`
        SELECT score_after as score
        FROM journey_events
        WHERE user_id = ${userId}
          AND event_type = 'analysis_completed'
          AND event_data->>'analyzer' = 'investor_score'
        ORDER BY created_at DESC
        LIMIT 1
      `,

      // Execution streak (consecutive days with activity)
      sql`
        WITH daily_activity AS (
          SELECT DISTINCT DATE(created_at) as activity_date
          FROM journey_events
          WHERE user_id = ${userId}
            AND created_at > NOW() - INTERVAL '30 days'
          ORDER BY activity_date DESC
        ),
        streak AS (
          SELECT
            activity_date,
            activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC))::int as grp
          FROM daily_activity
        )
        SELECT COUNT(*) as streak_days
        FROM streak
        WHERE grp = (
          SELECT grp FROM streak WHERE activity_date = CURRENT_DATE
          UNION ALL
          SELECT grp FROM streak WHERE activity_date = CURRENT_DATE - 1
          LIMIT 1
        )
      `,

      // Milestone statistics
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) as total
        FROM milestones
        WHERE user_id = ${userId}
      `,

      // Insight statistics
      sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_dismissed = false) as active,
          COUNT(*) FILTER (WHERE is_pinned = true) as pinned,
          COUNT(*) FILTER (WHERE importance >= 7) as high_importance
        FROM ai_insights
        WHERE user_id = ${userId}
      `
    ]);

    // Calculate execution streak (fallback to 0 if no activity today/yesterday)
    const streakDays = streakResult[0]?.streak_days || 0;

    return NextResponse.json({
      success: true,
      data: {
        ideaScore: ideaScoreResult[0]?.score || null,
        investorReadiness: investorScoreResult[0]?.score || null,
        executionStreak: Number(streakDays),
        milestones: {
          completed: Number(milestoneStats[0]?.completed || 0),
          inProgress: Number(milestoneStats[0]?.in_progress || 0),
          pending: Number(milestoneStats[0]?.pending || 0),
          total: Number(milestoneStats[0]?.total || 0)
        },
        insights: {
          total: Number(insightStats[0]?.total || 0),
          active: Number(insightStats[0]?.active || 0),
          pinned: Number(insightStats[0]?.pinned || 0),
          highImportance: Number(insightStats[0]?.high_importance || 0)
        }
      }
    });
  } catch (error) {
    // Re-throw auth errors (Response objects from requireAuth)
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
