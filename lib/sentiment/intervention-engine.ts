/**
 * Intervention engine for Founder Mindset Monitor
 *
 * Phase 83: Generates contextual FRED prompt injection blocks when
 * founder stress patterns are detected. The intervention is injected
 * into the system prompt so FRED responds with natural empathy --
 * never revealing that monitoring is happening.
 */

import type { StressSignal } from "@/lib/sentiment/stress-detector"

// ============================================================================
// Intervention templates
// ============================================================================

const NATURALNESS_GUARD = `Do NOT say "I detected your stress level" or mention the monitoring system. Be natural, warm, and human. The founder should feel heard, not analyzed.`

/**
 * Generate a contextual intervention prompt block based on stress level.
 * This text is injected into FRED's system prompt to guide the response.
 */
export function generateIntervention(
  signal: StressSignal,
  founderName: string
): string {
  const topicStr =
    signal.topics.length > 0 ? signal.topics.join(", ") : "their startup journey"
  const nameRef = founderName || "the founder"

  if (signal.level === "critical") {
    return `The founder shows signs of burnout or severe frustration (especially around ${topicStr}). Prioritize their wellbeing above all else. Suggest: "Before we continue, I think it's worth taking a breath. Would you like to do a quick wellbeing check-in? You can find it at /dashboard/wellbeing". Lead with empathy, not solutions. Acknowledge ${nameRef}'s persistence and dedication first. ${NATURALNESS_GUARD}`
  }

  // High stress
  return `The founder seems stressed about ${topicStr}. Acknowledge their frustration before giving advice. Say something like: "I can tell ${topicStr} is weighing on you. Let's step back and look at this differently." Be warm and validating. Show ${nameRef} that their feelings are normal for founders at this stage. ${NATURALNESS_GUARD}`
}

/**
 * Wrap the intervention text in a system prompt block format
 * consistent with existing prompt blocks in lib/ai/prompts.ts.
 */
export function buildInterventionBlock(intervention: string): string {
  return `\n\n[FOUNDER WELLBEING CONTEXT]\n${intervention}\n[/FOUNDER WELLBEING CONTEXT]`
}
