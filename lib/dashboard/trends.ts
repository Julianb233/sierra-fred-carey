/**
 * Dashboard Trends Aggregation
 *
 * Provides time-series activity data from existing Supabase tables.
 * Consumed by /api/dashboard/trends and the analytics page.
 */

import { createServiceClient } from "@/lib/supabase/server";
import {
  subWeeks,
  subMonths,
  startOfWeek,
  startOfMonth,
  format,
} from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface TrendPeriod {
  period: string; // "2026-W07" or "2026-02"
  conversations: number;
  checkIns: number;
  nextStepsCompleted: number;
  decisionsScored: number;
  documentsCreated: number;
}

export type TrendRange = "7d" | "30d" | "90d" | "all";
export type TrendGranularity = "weekly" | "monthly";

// ============================================================================
// Main Function
// ============================================================================

/**
 * Aggregates founder activity into time-series periods.
 * Runs 5 parallel Supabase queries and groups results by period in JS.
 */
export async function getFounderTrends(
  userId: string,
  granularity: TrendGranularity = "weekly",
  periods: number = 4
): Promise<TrendPeriod[]> {
  const supabase = createServiceClient();
  const now = new Date();
  const startDate =
    granularity === "weekly"
      ? subWeeks(now, periods)
      : subMonths(now, periods);
  const startISO = startDate.toISOString();

  // Run 5 queries in parallel
  const [
    conversationsRes,
    checkInsRes,
    nextStepsRes,
    decisionsRes,
    documentsRes,
  ] = await Promise.all([
    // 1. Conversations from fred_episodic_memory
    supabase
      .from("fred_episodic_memory")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .gte("created_at", startISO),

    // 2. Check-ins from sms_checkins (inbound only)
    supabase
      .from("sms_checkins")
      .select("created_at")
      .eq("user_id", userId)
      .eq("direction", "inbound")
      .gte("created_at", startISO),

    // 3. Completed next steps (use completed_at, not created_at)
    supabase
      .from("next_steps")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", startISO),

    // 4. Decisions scored (pitch_reviews)
    supabase
      .from("pitch_reviews")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startISO),

    // 5. Documents created (document_repository + strategy_documents)
    supabase
      .from("document_repository")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startISO),
  ]);

  // Also fetch strategy_documents for document count
  const { data: stratDocs } = await supabase
    .from("strategy_documents")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startISO);

  // Build period buckets
  const buckets = new Map<string, TrendPeriod>();

  function getPeriodKey(dateStr: string): string {
    const date = new Date(dateStr);
    if (granularity === "weekly") {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      return format(weekStart, "'W'II", {}) || format(weekStart, "yyyy-'W'II");
    }
    return format(startOfMonth(date), "yyyy-MM");
  }

  // Use ISO week format for weekly granularity
  function getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    if (granularity === "weekly") {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      // Manual ISO week calculation
      const d = new Date(
        Date.UTC(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        )
      );
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }
    return format(startOfMonth(date), "yyyy-MM");
  }

  function ensureBucket(key: string): TrendPeriod {
    if (!buckets.has(key)) {
      buckets.set(key, {
        period: key,
        conversations: 0,
        checkIns: 0,
        nextStepsCompleted: 0,
        decisionsScored: 0,
        documentsCreated: 0,
      });
    }
    return buckets.get(key)!;
  }

  // Count conversations
  for (const row of conversationsRes.data || []) {
    const key = getWeekKey(row.created_at);
    ensureBucket(key).conversations++;
  }

  // Count check-ins
  for (const row of checkInsRes.data || []) {
    const key = getWeekKey(row.created_at);
    ensureBucket(key).checkIns++;
  }

  // Count completed next steps
  for (const row of nextStepsRes.data || []) {
    const key = getWeekKey(row.completed_at);
    ensureBucket(key).nextStepsCompleted++;
  }

  // Count decisions scored
  for (const row of decisionsRes.data || []) {
    const key = getWeekKey(row.created_at);
    ensureBucket(key).decisionsScored++;
  }

  // Count documents (both tables)
  for (const row of documentsRes.data || []) {
    const key = getWeekKey(row.created_at);
    ensureBucket(key).documentsCreated++;
  }
  for (const row of stratDocs || []) {
    const key = getWeekKey(row.created_at);
    ensureBucket(key).documentsCreated++;
  }

  // Sort by period ascending
  return Array.from(buckets.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
}

// ============================================================================
// Range Helpers
// ============================================================================

/**
 * Converts a range string to granularity + periods params.
 */
export function rangeToParams(range: TrendRange): {
  granularity: TrendGranularity;
  periods: number;
} {
  switch (range) {
    case "7d":
      return { granularity: "weekly", periods: 1 };
    case "30d":
      return { granularity: "weekly", periods: 4 };
    case "90d":
      return { granularity: "weekly", periods: 12 };
    case "all":
      return { granularity: "monthly", periods: 24 };
    default:
      return { granularity: "weekly", periods: 4 };
  }
}
