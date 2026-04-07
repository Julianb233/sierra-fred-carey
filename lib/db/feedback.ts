/**
 * Feedback system DB helpers
 *
 * Provides typed query functions for the feedback tables:
 * feedback_signals, feedback_sessions, feedback_insights.
 * Used by API routes in app/api/feedback/ and by the
 * sentiment analysis pipeline.
 */
import { createServiceClient } from "@/lib/supabase/server";
import type {
  FeedbackSignalInsert,
  FeedbackSessionInsert,
  FeedbackInsightInsert,
  FeedbackInsight,
} from "@/lib/feedback";

// ============================================================================
// Signals
// ============================================================================

export async function insertFeedbackSignal(signal: FeedbackSignalInsert) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .insert(signal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFeedbackSignalsByUser(userId: string, limit = 50) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getFeedbackSignalsBySession(sessionId: string, signalType?: string, limit = 100) {
  const supabase = createServiceClient();
  let query = supabase
    .from("feedback_signals")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (signalType) {
    query = query.eq("signal_type", signalType);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================================
// Sessions
// ============================================================================

export async function upsertFeedbackSession(
  session: FeedbackSessionInsert & { id?: string }
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_sessions")
    .upsert(session)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFlaggedSessions(limit = 20) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_sessions")
    .select("*")
    .eq("flagged", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ============================================================================
// Insights
// ============================================================================

export async function insertFeedbackInsight(insight: FeedbackInsightInsert) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .insert(insight)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInsightsByStatus(status: string, limit = 50) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ============================================================================
// Clustering & Intelligence (Phase 74)
// ============================================================================

export async function getUnprocessedSignals(limit = 500) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .select("*")
    .eq("processing_status", "new")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function markSignalsProcessed(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("feedback_signals")
    .update({ processing_status: "processed" })
    .in("id", ids);
  if (error) throw error;
}

export async function findInsightByHash(
  hash: string,
  windowHours = 4
): Promise<FeedbackInsight | null> {
  const supabase = createServiceClient();
  const cutoff = new Date(
    Date.now() - windowHours * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from("feedback_insights")
    .select("*")
    .eq("cluster_embedding_hash", hash)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertInsightWithSignals(
  insight: FeedbackInsightInsert & {
    cluster_embedding_hash: string;
    source_window_start: string;
    source_window_end: string;
  }
) {
  const supabase = createServiceClient();

  // Check for existing insight with same hash within window
  const existing = await findInsightByHash(
    insight.cluster_embedding_hash,
    4
  );

  if (existing) {
    // Merge: append signal_ids and update count
    const mergedIds = [
      ...new Set([...existing.signal_ids, ...insight.signal_ids]),
    ];
    const { data, error } = await supabase
      .from("feedback_insights")
      .update({
        signal_ids: mergedIds,
        signal_count: mergedIds.length,
        severity: compareSeverity(existing.severity, insight.severity),
        source_window_end: insight.source_window_end,
        metadata: {
          ...((existing.metadata as Record<string, unknown>) || {}),
          lastMergedAt: new Date().toISOString(),
        },
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return { data, merged: true };
  }

  // Insert new insight
  const { data, error } = await supabase
    .from("feedback_insights")
    .insert(insight)
    .select()
    .single();
  if (error) throw error;
  return { data, merged: false };
}

/** Return the higher of two severity levels */
function compareSeverity(
  a: string,
  b: string
): "low" | "medium" | "high" | "critical" {
  const order: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return (order[a] || 0) >= (order[b] || 0)
    ? (a as "low" | "medium" | "high" | "critical")
    : (b as "low" | "medium" | "high" | "critical");
}

// ============================================================================
// GDPR Retention
// ============================================================================

export async function deleteExpiredFeedback() {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("feedback_signals")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
  if (error) throw error;

  // Also clean up expired audit log entries
  const { deleteExpiredAuditLogs } = await import("@/lib/db/audit-log");
  await deleteExpiredAuditLogs();
}

export async function deleteFeedbackForUser(userId: string) {
  const supabase = createServiceClient();
  // Cascade: signals first, then sessions, then audit logs
  const { error: sigErr } = await supabase
    .from("feedback_signals")
    .delete()
    .eq("user_id", userId);
  if (sigErr) throw sigErr;
  const { error: sesErr } = await supabase
    .from("feedback_sessions")
    .delete()
    .eq("user_id", userId);
  if (sesErr) throw sesErr;

  // Also delete audit logs for this user
  const { deleteAuditLogsForUser } = await import("@/lib/db/audit-log");
  await deleteAuditLogsForUser(userId);
}

// ============================================================================
// Pattern Detection queries (Phase 74-01)
// ============================================================================

export async function getRecentNegativeSignals(since: string, limit = 500) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .select("*")
    .gte("created_at", since)
    .or("rating.eq.-1,sentiment_score.lt.-0.3")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getOpenInsights(limit = 100) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .select("*")
    .in("status", ["new", "reviewed", "actioned"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Find any insight with the same cluster hash that already has a Linear issue.
 * Unlike findInsightByHash, this has NO time window — it checks all time.
 * Used to prevent duplicate Linear issues for recurring themes.
 */
export async function findInsightWithLinearIssueByHash(
  hash: string
): Promise<FeedbackInsight | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .select("*")
    .eq("cluster_embedding_hash", hash)
    .not("linear_issue_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Find any active (non-resolved) insight with the same cluster hash.
 * No time window — merges insights across days for recurring themes.
 * Used by the clustering pipeline to prevent duplicate insights.
 */
export async function findActiveInsightByHash(
  hash: string
): Promise<FeedbackInsight | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .select("*")
    .eq("cluster_embedding_hash", hash)
    .in("status", ["new", "reviewed", "actioned"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateInsightSignals(
  insightId: string,
  newSignalIds: string[],
  newCount: number
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_insights")
    .update({
      signal_ids: newSignalIds,
      signal_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", insightId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
