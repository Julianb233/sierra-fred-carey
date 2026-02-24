/**
 * Momentum Indicator
 *
 * Computes a trend-based momentum indicator (NOT a numeric score).
 * Compares current 14-day activity window to previous 14-day window
 * to determine if momentum is rising, stable, or declining.
 *
 * Per design: factual and encouraging language, never judgmental.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface MomentumIndicator {
  trend: "rising" | "stable" | "declining";
  summary: string;
  breakdown: {
    conversations: { current: number; previous: number };
    checkIns: { current: number; previous: number };
    nextStepsCompleted: { current: number; previous: number };
    readinessProgress: { current: number; previous: number };
  };
  lastActiveDate: string | null;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Computes a momentum indicator by comparing current vs previous 14-day windows.
 * All 8 queries run in parallel for performance.
 */
export async function computeMomentumIndicator(
  userId: string
): Promise<MomentumIndicator> {
  const supabase = createServiceClient();
  const now = new Date();
  const currentStart = subDays(now, 14).toISOString();
  const previousStart = subDays(now, 28).toISOString();
  const previousEnd = subDays(now, 14).toISOString();

  // 8 parallel queries: 4 current + 4 previous
  const [
    convCurrent,
    convPrevious,
    checkinCurrent,
    checkinPrevious,
    stepsCurrent,
    stepsPrevious,
    readinessCurrent,
    readinessPrevious,
  ] = await Promise.all([
    // Conversations - current
    supabase
      .from("fred_episodic_memory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .gte("created_at", currentStart),
    // Conversations - previous
    supabase
      .from("fred_episodic_memory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .gte("created_at", previousStart)
      .lt("created_at", previousEnd),

    // Check-ins - current
    supabase
      .from("sms_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .gte("created_at", currentStart),
    // Check-ins - previous
    supabase
      .from("sms_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .gte("created_at", previousStart)
      .lt("created_at", previousEnd),

    // Next steps completed - current
    supabase
      .from("next_steps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", currentStart),
    // Next steps completed - previous
    supabase
      .from("next_steps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", previousStart)
      .lt("completed_at", previousEnd),

    // Readiness assessments - current
    supabase
      .from("investor_readiness_scores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", currentStart),
    // Readiness assessments - previous
    supabase
      .from("investor_readiness_scores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", previousStart)
      .lt("created_at", previousEnd),
  ]);

  const breakdown = {
    conversations: {
      current: convCurrent.count ?? 0,
      previous: convPrevious.count ?? 0,
    },
    checkIns: {
      current: checkinCurrent.count ?? 0,
      previous: checkinPrevious.count ?? 0,
    },
    nextStepsCompleted: {
      current: stepsCurrent.count ?? 0,
      previous: stepsPrevious.count ?? 0,
    },
    readinessProgress: {
      current: readinessCurrent.count ?? 0,
      previous: readinessPrevious.count ?? 0,
    },
  };

  // Calculate totals
  const currentTotal =
    breakdown.conversations.current +
    breakdown.checkIns.current +
    breakdown.nextStepsCompleted.current +
    breakdown.readinessProgress.current;

  const previousTotal =
    breakdown.conversations.previous +
    breakdown.checkIns.previous +
    breakdown.nextStepsCompleted.previous +
    breakdown.readinessProgress.previous;

  // No activity at all
  if (currentTotal === 0 && previousTotal === 0) {
    return {
      trend: "stable",
      summary: "No activity yet",
      breakdown,
      lastActiveDate: null,
    };
  }

  // Determine trend direction
  let trend: "rising" | "stable" | "declining";
  if (previousTotal === 0 && currentTotal > 0) {
    trend = "rising";
  } else if (currentTotal > previousTotal * 1.2) {
    trend = "rising";
  } else if (currentTotal < previousTotal * 0.8) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  // Build factual summary
  const summary = buildSummary(trend, breakdown);

  // Find last active date
  const lastActiveDate = await getLastActiveDate(supabase, userId);

  return { trend, summary, breakdown, lastActiveDate };
}

// ============================================================================
// Helpers
// ============================================================================

function buildSummary(
  trend: "rising" | "stable" | "declining",
  breakdown: MomentumIndicator["breakdown"]
): string {
  const parts: string[] = [];
  if (breakdown.checkIns.current > 0) {
    parts.push(
      `${breakdown.checkIns.current} check-in${breakdown.checkIns.current !== 1 ? "s" : ""}`
    );
  }
  if (breakdown.nextStepsCompleted.current > 0) {
    parts.push(
      `${breakdown.nextStepsCompleted.current} step${breakdown.nextStepsCompleted.current !== 1 ? "s" : ""} completed`
    );
  }
  if (breakdown.conversations.current > 0) {
    parts.push(
      `${breakdown.conversations.current} conversation${breakdown.conversations.current !== 1 ? "s" : ""}`
    );
  }

  const activity = parts.length > 0 ? parts.join(", ") : "some activity";

  switch (trend) {
    case "rising":
      return `Trending up -- ${activity} this period`;
    case "stable":
      return `Steady momentum -- ${activity} this period`;
    case "declining":
      return `Activity has slowed -- ${activity} this period`;
  }
}

async function getLastActiveDate(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string | null> {
  // Check most recent activity across key tables
  const [conv, checkin, step] = await Promise.all([
    supabase
      .from("fred_episodic_memory")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("sms_checkins")
      .select("created_at")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("next_steps")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);

  const dates = [
    conv.data?.[0]?.created_at,
    checkin.data?.[0]?.created_at,
    step.data?.[0]?.completed_at,
  ].filter(Boolean) as string[];

  if (dates.length === 0) return null;

  return dates.sort().reverse()[0];
}
