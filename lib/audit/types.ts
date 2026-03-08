/**
 * Types for the FRED audit log system.
 * Captures every FRED interaction with full context for analytics.
 */

export interface FredAuditLogEntry {
  id: string
  trace_id: string
  user_id: string
  session_id: string | null
  user_message: string
  user_message_length: number
  detected_topic: string | null
  topic_confidence: number | null
  detected_intent: string | null
  active_framework: string | null
  active_mode: string | null
  model_used: string | null
  prompt_version: string | null
  tier: string
  oases_stage: string | null
  startup_process_step: string | null
  is_first_conversation: boolean
  has_persistent_memory: boolean
  page_context: string | null
  fred_response: string | null
  fred_response_length: number | null
  response_action: string | null
  response_confidence: number | null
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  reality_lens_score: number | null
  irs_score: number | null
  tools_used: string[]
  sentiment_label: string | null
  sentiment_confidence: number | null
  sentiment_score: number | null
  stress_level: number | null
  coaching_discomfort: boolean
  wellness_alert_triggered: boolean
  feedback_rating: number | null
  feedback_category: string | null
  feedback_comment: string | null
  feedback_at: string | null
  red_flags: unknown[]
  channel: string
  variant_id: string | null
  metadata: Record<string, unknown>
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface FredAuditLogInsert {
  trace_id?: string
  user_id: string
  session_id?: string | null
  user_message: string
  detected_topic?: string | null
  topic_confidence?: number | null
  detected_intent?: string | null
  active_framework?: string | null
  active_mode?: string | null
  model_used?: string | null
  prompt_version?: string | null
  tier: string
  oases_stage?: string | null
  startup_process_step?: string | null
  is_first_conversation?: boolean
  has_persistent_memory?: boolean
  page_context?: string | null
  fred_response?: string | null
  response_action?: string | null
  response_confidence?: number | null
  latency_ms?: number | null
  input_tokens?: number | null
  output_tokens?: number | null
  total_tokens?: number | null
  reality_lens_score?: number | null
  irs_score?: number | null
  tools_used?: string[]
  wellness_alert_triggered?: boolean
  red_flags?: unknown[]
  channel?: string
  variant_id?: string | null
  metadata?: Record<string, unknown>
}

export interface AuditLogFilters {
  dateFrom?: string
  dateTo?: string
  userId?: string
  topic?: string
  tier?: string
  model?: string
  oasesStage?: string
  activeMode?: string
  sentimentLabel?: string
  feedbackRating?: number | null
  page?: number
  pageSize?: number
}

export interface AuditLogListResult {
  data: FredAuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
