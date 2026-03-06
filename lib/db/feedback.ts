/**
 * Feedback Database Operations
 *
 * Core database operations for the feedback signal collection pipeline.
 * Uses the service client (bypasses RLS) for background/system operations.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { FeedbackSignal, FeedbackSignalInsert, FeedbackSession } from "@/lib/feedback/types";

/**
 * Insert a feedback signal into the feedback_signals table.
 */
export async function insertFeedbackSignal(
  signal: FeedbackSignalInsert
): Promise<FeedbackSignal | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_signals")
    .insert(signal)
    .select()
    .single();

  if (error) {
    console.error("[feedback] Failed to insert signal:", error.message);
    return null;
  }

  return data as FeedbackSignal;
}

/**
 * Get feedback signals for a specific user.
 */
export async function getFeedbackSignalsByUser(
  userId: string,
  options?: { limit?: number; signalType?: string }
): Promise<FeedbackSignal[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("feedback_signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.signalType) {
    query = query.eq("signal_type", options.signalType);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[feedback] Failed to get signals:", error.message);
    return [];
  }

  return (data ?? []) as FeedbackSignal[];
}

/**
 * Get feedback signals for a specific session.
 */
export async function getFeedbackSignalsBySession(
  sessionId: string,
  signalType?: string
): Promise<FeedbackSignal[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("feedback_signals")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (signalType) {
    query = query.eq("signal_type", signalType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[feedback] Failed to get session signals:", error.message);
    return [];
  }

  return (data ?? []) as FeedbackSignal[];
}

/**
 * Upsert a feedback session record (aggregated session-level data).
 */
export async function upsertFeedbackSession(
  session: Omit<FeedbackSession, "id" | "created_at" | "updated_at">
): Promise<FeedbackSession | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feedback_sessions")
    .upsert(session, { onConflict: "session_id" })
    .select()
    .single();

  if (error) {
    console.error("[feedback] Failed to upsert session:", error.message);
    return null;
  }

  return data as FeedbackSession;
}
