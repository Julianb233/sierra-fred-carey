/**
 * DB helpers for fred_audit_log queries.
 * Used by admin API routes for analytics and GDPR cleanup.
 */
import { createServiceClient } from "@/lib/supabase/server"
import type {
  FredAuditLogInsert,
  AuditLogFilters,
  AuditLogListResult,
} from "@/lib/audit/types"

const MAX_TEXT_LENGTH = 2000

function truncate(text: string | null | undefined, max = MAX_TEXT_LENGTH): string | null {
  if (!text) return null
  return text.length > max ? text.slice(0, max) : text
}

/**
 * Insert an audit log entry. Fire-and-forget safe — never throws.
 */
export async function insertAuditLog(entry: FredAuditLogInsert): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("fred_audit_log")
      .insert({
        ...entry,
        user_message: truncate(entry.user_message, MAX_TEXT_LENGTH) || "",
        fred_response: truncate(entry.fred_response, MAX_TEXT_LENGTH),
        tools_used: entry.tools_used || [],
        red_flags: entry.red_flags || [],
        metadata: entry.metadata || {},
      })
      .select("id")
      .single()

    if (error) {
      console.error("[audit-log] Insert failed:", error.message)
      return null
    }
    return data.id
  } catch (err) {
    console.error("[audit-log] Unexpected error:", err)
    return null
  }
}

/**
 * Paginated, filterable query for admin dashboard.
 */
export async function queryAuditLogAdmin(
  filters: AuditLogFilters
): Promise<AuditLogListResult> {
  const supabase = createServiceClient()
  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 50, 100)
  const offset = (page - 1) * pageSize

  let query = supabase
    .from("fred_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo)
  if (filters.userId) query = query.eq("user_id", filters.userId)
  if (filters.topic) query = query.eq("detected_topic", filters.topic)
  if (filters.tier) query = query.eq("tier", filters.tier)
  if (filters.model) query = query.eq("model_used", filters.model)
  if (filters.oasesStage) query = query.eq("oases_stage", filters.oasesStage)
  if (filters.activeMode) query = query.eq("active_mode", filters.activeMode)
  if (filters.sentimentLabel) query = query.eq("sentiment_label", filters.sentimentLabel)
  if (filters.feedbackRating !== undefined && filters.feedbackRating !== null) {
    query = query.eq("feedback_rating", filters.feedbackRating)
  }

  const { data, error, count } = await query
  if (error) throw error

  const total = count || 0
  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Link feedback to the matching audit log row.
 */
export async function linkFeedbackToAuditLog(
  sessionId: string,
  messageId: string | null,
  rating: number,
  category: string | null,
  comment: string | null
): Promise<void> {
  try {
    const supabase = createServiceClient()
    // Find the most recent audit log entry for this session
    let query = supabase
      .from("fred_audit_log")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)

    // If we have a trace_id in metadata matching messageId, prefer that
    if (messageId) {
      query = supabase
        .from("fred_audit_log")
        .select("id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
    }

    const { data } = await query.maybeSingle()
    if (!data) return

    await supabase
      .from("fred_audit_log")
      .update({
        feedback_rating: rating,
        feedback_category: category,
        feedback_comment: comment,
        feedback_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
  } catch (err) {
    console.error("[audit-log] Link feedback failed:", err)
  }
}

/**
 * GDPR: Delete audit logs older than 90 days.
 */
export async function deleteExpiredAuditLogs(): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("fred_audit_log")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null)
  if (error) {
    console.error("[audit-log] GDPR cleanup failed:", error.message)
  }
}

/**
 * GDPR: Delete all audit logs for a specific user.
 */
export async function deleteAuditLogsForUser(userId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("fred_audit_log")
    .delete()
    .eq("user_id", userId)
  if (error) throw error
}

/**
 * Get aggregate stats for admin dashboard.
 */
export async function getAuditLogStats(dateFrom?: string, dateTo?: string) {
  const supabase = createServiceClient()

  let query = supabase
    .from("fred_audit_log")
    .select("tier, detected_topic, latency_ms, sentiment_label, feedback_rating, model_used, oases_stage")

  if (dateFrom) query = query.gte("created_at", dateFrom)
  if (dateTo) query = query.lte("created_at", dateTo)

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const totalInteractions = rows.length
  const avgLatency = rows.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / (totalInteractions || 1)

  const topicDist: Record<string, number> = {}
  const tierDist: Record<string, number> = {}
  const sentimentDist: Record<string, number> = {}

  for (const row of rows) {
    if (row.detected_topic) topicDist[row.detected_topic] = (topicDist[row.detected_topic] || 0) + 1
    if (row.tier) tierDist[row.tier] = (tierDist[row.tier] || 0) + 1
    if (row.sentiment_label) sentimentDist[row.sentiment_label] = (sentimentDist[row.sentiment_label] || 0) + 1
  }

  const feedbackRows = rows.filter(r => r.feedback_rating !== null)
  const thumbsUp = feedbackRows.filter(r => r.feedback_rating === 1).length
  const thumbsDown = feedbackRows.filter(r => r.feedback_rating === -1).length

  return {
    totalInteractions,
    avgLatency: Math.round(avgLatency),
    topicDistribution: topicDist,
    tierDistribution: tierDist,
    sentimentDistribution: sentimentDist,
    thumbsUp,
    thumbsDown,
    feedbackRate: totalInteractions > 0 ? Math.round((feedbackRows.length / totalInteractions) * 100) : 0,
  }
}
