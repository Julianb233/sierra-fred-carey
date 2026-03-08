import { createServiceClient } from "@/lib/supabase/server"

export interface AuditEntry {
  traceId: string
  userId: string
  sessionId?: string
  userMessage: string
  detectedTopic?: string | null
  topicConfidence?: number | null
  detectedIntent?: string | null
  activeFramework?: string | null
  activeMode?: string | null
  modelUsed?: string | null
  promptVersion?: string | null
  tier: string
  oasesStage?: string | null
  startupProcessStep?: string | null
  isFirstConversation?: boolean
  hasPersistentMemory?: boolean
  pageContext?: string | null
  fredResponse?: string | null
  responseAction?: string | null
  responseConfidence?: number | null
  latencyMs?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  realityLensScore?: number | null
  irsScore?: number | null
  toolsUsed?: string[]
  wellnessAlertTriggered?: boolean
  channel?: string
  variantId?: string | null
  redFlags?: unknown[]
  metadata?: Record<string, unknown>
}

export async function createAuditEntry(entry: AuditEntry): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("fred_audit_log")
      .insert({
        trace_id: entry.traceId,
        user_id: entry.userId,
        session_id: entry.sessionId,
        user_message: (entry.userMessage || "").slice(0, 2000),
        detected_topic: entry.detectedTopic,
        topic_confidence: entry.topicConfidence,
        detected_intent: entry.detectedIntent,
        active_framework: entry.activeFramework,
        active_mode: entry.activeMode,
        model_used: entry.modelUsed,
        prompt_version: entry.promptVersion,
        tier: entry.tier,
        oases_stage: entry.oasesStage,
        startup_process_step: entry.startupProcessStep,
        is_first_conversation: entry.isFirstConversation || false,
        has_persistent_memory: entry.hasPersistentMemory || false,
        page_context: entry.pageContext,
        fred_response: entry.fredResponse ? entry.fredResponse.slice(0, 2000) : null,
        response_action: entry.responseAction,
        response_confidence: entry.responseConfidence,
        latency_ms: entry.latencyMs,
        input_tokens: entry.inputTokens,
        output_tokens: entry.outputTokens,
        total_tokens: entry.totalTokens,
        reality_lens_score: entry.realityLensScore,
        irs_score: entry.irsScore,
        tools_used: entry.toolsUsed || [],
        wellness_alert_triggered: entry.wellnessAlertTriggered || false,
        channel: entry.channel || "chat",
        variant_id: entry.variantId,
        red_flags: entry.redFlags || [],
        metadata: entry.metadata || {},
      })
      .select("id")
      .single()

    if (error) {
      console.error("[audit] Failed to create entry:", error.message)
      return null
    }
    return data.id
  } catch (err) {
    console.error("[audit] Unexpected error:", err)
    return null
  }
}

export async function updateAuditFeedback(
  traceId: string,
  feedback: {
    rating: number
    category?: string | null
    comment?: string | null
  }
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from("fred_audit_log")
      .update({
        feedback_rating: feedback.rating,
        feedback_category: feedback.category,
        feedback_comment: feedback.comment,
        feedback_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("trace_id", traceId)
  } catch (err) {
    console.error("[audit] Failed to update feedback:", err)
  }
}

export async function updateAuditSentiment(
  traceId: string,
  sentiment: {
    label: string
    confidence: number
    stressLevel?: number
    coachingDiscomfort?: boolean
  }
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from("fred_audit_log")
      .update({
        sentiment_label: sentiment.label,
        sentiment_confidence: sentiment.confidence,
        stress_level: sentiment.stressLevel,
        coaching_discomfort: sentiment.coachingDiscomfort || false,
        updated_at: new Date().toISOString(),
      })
      .eq("trace_id", traceId)
  } catch (err) {
    console.error("[audit] Failed to update sentiment:", err)
  }
}
