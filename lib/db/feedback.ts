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
}

export async function deleteFeedbackForUser(userId: string) {
  const supabase = createServiceClient();
  // Cascade: signals first, then sessions
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
}
