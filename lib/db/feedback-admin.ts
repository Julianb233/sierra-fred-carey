/**
 * Admin Feedback Database Queries
 *
 * Admin-specific queries for the feedback dashboard.
 * Uses service client to bypass RLS for admin operations.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { FeedbackSignal } from "@/lib/feedback/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackFilters {
  dateFrom?: string;
  dateTo?: string;
  channel?: string;
  rating?: number;
  category?: string;
  tier?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface FeedbackListResult {
  data: FeedbackSignal[];
  total: number;
}

export interface FeedbackStats {
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  sentimentCount: number;
  flaggedSessionCount: number;
  categoryDistribution: Record<string, number>;
  dailyVolume: Array<{ date: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Query: Filterable signal list with pagination
// ---------------------------------------------------------------------------

export async function queryFeedbackSignalsAdmin(
  filters: FeedbackFilters
): Promise<FeedbackListResult> {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("feedback_signals")
    .select("*", { count: "exact" });

  // Apply conditional filters
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    // Add a day to include the full end date
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.channel) {
    query = query.eq("channel", filters.channel);
  }
  if (filters.rating !== undefined && filters.rating !== null) {
    query = query.eq("rating", filters.rating);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.tier) {
    query = query.eq("user_tier", filters.tier);
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  // Order and paginate
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[feedback-admin] Query failed:", error.message);
    return { data: [], total: 0 };
  }

  return {
    data: (data ?? []) as FeedbackSignal[],
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Query: Aggregate stats for dashboard cards + charts
// ---------------------------------------------------------------------------

export async function getFeedbackStats(
  dateFrom?: string,
  dateTo?: string
): Promise<FeedbackStats> {
  const supabase = createServiceClient();

  // Build base query with optional date range
  let signalsQuery = supabase.from("feedback_signals").select("*");

  if (dateFrom) {
    signalsQuery = signalsQuery.gte("created_at", dateFrom);
  }
  if (dateTo) {
    signalsQuery = signalsQuery.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { data: signals, error: signalsError } = await signalsQuery;

  if (signalsError) {
    console.error("[feedback-admin] Stats query failed:", signalsError.message);
    return {
      totalSignals: 0,
      positiveCount: 0,
      negativeCount: 0,
      sentimentCount: 0,
      flaggedSessionCount: 0,
      categoryDistribution: {},
      dailyVolume: [],
    };
  }

  const allSignals = (signals ?? []) as FeedbackSignal[];

  // Compute counts
  const totalSignals = allSignals.length;
  const positiveCount = allSignals.filter((s) => s.rating === 1).length;
  const negativeCount = allSignals.filter((s) => s.rating === -1).length;
  const sentimentCount = allSignals.filter(
    (s) => s.signal_type === "sentiment"
  ).length;

  // Category distribution
  const categoryDistribution: Record<string, number> = {};
  for (const signal of allSignals) {
    if (signal.category) {
      categoryDistribution[signal.category] =
        (categoryDistribution[signal.category] || 0) + 1;
    }
  }

  // Daily volume (bucket by date)
  const dailyMap: Record<string, number> = {};
  for (const signal of allSignals) {
    const date = signal.created_at.slice(0, 10); // YYYY-MM-DD
    dailyMap[date] = (dailyMap[date] || 0) + 1;
  }
  const dailyVolume = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Flagged sessions count
  let flaggedQuery = supabase
    .from("feedback_sessions")
    .select("id", { count: "exact" })
    .eq("flagged", true);

  if (dateFrom) {
    flaggedQuery = flaggedQuery.gte("created_at", dateFrom);
  }
  if (dateTo) {
    flaggedQuery = flaggedQuery.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { count: flaggedCount } = await flaggedQuery;

  return {
    totalSignals,
    positiveCount,
    negativeCount,
    sentimentCount,
    flaggedSessionCount: flaggedCount ?? 0,
    categoryDistribution,
    dailyVolume,
  };
}
