/**
 * Admin Feedback Database Queries
 *
 * Admin-specific queries for the feedback dashboard.
 * Uses service client to bypass RLS for admin operations.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { FeedbackSignal, FeedbackSession } from "@/lib/feedback/types";
import { INSIGHT_STATUSES } from "@/lib/feedback/constants";

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

// ---------------------------------------------------------------------------
// Query: Session detail with messages and feedback signals
// ---------------------------------------------------------------------------

export interface SessionDetailResult {
  session: FeedbackSession;
  signals: FeedbackSignal[];
  messages: Array<{ role: string; content: string; created_at: string }>;
}

export async function getSessionDetail(
  sessionId: string
): Promise<SessionDetailResult | null> {
  const supabase = createServiceClient();

  // Fetch the session row
  const { data: session, error: sessionErr } = await supabase
    .from("feedback_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    console.error("[feedback-admin] Session not found:", sessionErr?.message);
    return null;
  }

  // Fetch signals for this session
  const { data: signals, error: signalsErr } = await supabase
    .from("feedback_signals")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (signalsErr) {
    console.error("[feedback-admin] Signals query failed:", signalsErr.message);
  }

  // Fetch conversation messages from episodic memory
  const { data: messages, error: messagesErr } = await supabase
    .from("fred_episodic_memory")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (messagesErr) {
    console.error(
      "[feedback-admin] Messages query failed:",
      messagesErr.message
    );
  }

  return {
    session: session as FeedbackSession,
    signals: (signals ?? []) as FeedbackSignal[],
    messages: (messages ?? []) as Array<{
      role: string;
      content: string;
      created_at: string;
    }>,
  };
}

// ---------------------------------------------------------------------------
// Mutation: Update triage status on signals or insights
// ---------------------------------------------------------------------------

export async function updateTriageStatus(
  id: string,
  table: "feedback_signals" | "feedback_insights",
  newStatus: string
) {
  // Validate status
  if (!INSIGHT_STATUSES.includes(newStatus as (typeof INSIGHT_STATUSES)[number])) {
    throw new Error(
      `Invalid status "${newStatus}". Must be one of: ${INSIGHT_STATUSES.join(", ")}`
    );
  }

  const supabase = createServiceClient();

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "actioned") {
    updates.actioned_at = new Date().toISOString();
  }
  if (newStatus === "resolved") {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[feedback-admin] Triage update failed:", error.message);
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Query: Sessions list with signal counts (for sessions tab)
// ---------------------------------------------------------------------------

export interface SessionWithCounts extends FeedbackSession {
  signal_count: number;
}

// ---------------------------------------------------------------------------
// Query: Digest summary for weekly email
// ---------------------------------------------------------------------------

export interface DigestSummary {
  stats: FeedbackStats;
  flaggedSessions: FeedbackSession[];
  topCategories: Array<{ category: string; count: number }>;
  period: { from: string; to: string };
}

export async function getDigestSummary(
  daysBack = 7
): Promise<DigestSummary> {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);

  const from = dateFrom.toISOString().slice(0, 10);
  const to = dateTo.toISOString().slice(0, 10);

  const stats = await getFeedbackStats(from, to);

  // Flagged sessions from the period
  const supabase = createServiceClient();
  const { data: flagged } = await supabase
    .from("feedback_sessions")
    .select("*")
    .eq("flagged", true)
    .gte("created_at", from)
    .order("created_at", { ascending: false });

  // Top 5 categories
  const topCategories = Object.entries(stats.categoryDistribution)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    stats,
    flaggedSessions: (flagged ?? []) as FeedbackSession[],
    topCategories,
    period: { from, to },
  };
}

// ---------------------------------------------------------------------------
// Query: Sessions list with signal counts (for sessions tab)
// ---------------------------------------------------------------------------

export async function getSessionsWithFeedback(
  limit = 50
): Promise<SessionWithCounts[]> {
  const supabase = createServiceClient();

  // Fetch sessions ordered by recency
  const { data: sessions, error: sessionsErr } = await supabase
    .from("feedback_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionsErr) {
    console.error(
      "[feedback-admin] Sessions query failed:",
      sessionsErr.message
    );
    return [];
  }

  if (!sessions || sessions.length === 0) return [];

  // Fetch signal counts per session
  const sessionIds = sessions.map((s) => s.id);
  const { data: signalCounts, error: countErr } = await supabase
    .from("feedback_signals")
    .select("session_id")
    .in("session_id", sessionIds);

  if (countErr) {
    console.error(
      "[feedback-admin] Signal counts query failed:",
      countErr.message
    );
  }

  // Build count map
  const countMap: Record<string, number> = {};
  for (const row of signalCounts ?? []) {
    const sid = (row as { session_id: string }).session_id;
    countMap[sid] = (countMap[sid] || 0) + 1;
  }

  return (sessions as FeedbackSession[]).map((session) => ({
    ...session,
    signal_count: countMap[session.id] || 0,
  }));
}
