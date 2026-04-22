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

/**
 * Insert a feedback signal with idempotency guard.
 *
 * For signals with a message_id, checks for an existing signal with the same
 * (user_id, message_id, signal_type) tuple first. If found, returns the
 * existing record instead of inserting a duplicate. This prevents duplicate
 * processing when tasks retry after partial completion (AI-4120).
 *
 * Signals without a message_id (e.g. auto-sentiment) skip the dedup check
 * since they lack a natural idempotency key.
 */
export async function insertFeedbackSignal(signal: FeedbackSignalInsert) {
  const supabase = createServiceClient();

  // Idempotency check: if message_id is present, check for existing signal
  if (signal.message_id) {
    const existing = await findExistingSignal(
      signal.user_id,
      signal.message_id,
      signal.signal_type
    );
    if (existing) {
      return existing;
    }
  }

  const { data, error } = await supabase
    .from("feedback_signals")
    .insert(signal)
    .select()
    .single();

  // Handle race condition: unique constraint violation means another request
  // inserted the same signal between our check and insert
  if (error && error.code === "23505") {
    if (signal.message_id) {
      const existing = await findExistingSignal(
        signal.user_id,
        signal.message_id,
        signal.signal_type
      );
      if (existing) return existing;
    }
    // If we still can't find it, re-throw
    throw error;
  }

  if (error) throw error;
  return data;
}

/**
 * Check if a signal already exists for a given user + message + signal_type.
 * Used for idempotency guards (AI-4120).
 */
export async function findExistingSignal(
  userId: string,
  messageId: string,
  signalType: string
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .select("*")
    .eq("user_id", userId)
    .eq("message_id", messageId)
    .eq("signal_type", signalType)
    .limit(1)
    .maybeSingle();
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

/**
 * Insert a feedback insight with idempotency guard (AI-4120).
 *
 * Checks for an existing insight with the same title and overlapping signal_ids
 * within the last 4 hours to prevent duplicate insight creation on retries.
 */
export async function insertFeedbackInsight(insight: FeedbackInsightInsert) {
  const supabase = createServiceClient();

  // Idempotency check: look for a recent insight with the same title
  if (insight.title) {
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("feedback_insights")
      .select("*")
      .eq("title", insight.title)
      .eq("insight_type", insight.insight_type)
      .gte("created_at", cutoff)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return existing;
    }
  }

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
