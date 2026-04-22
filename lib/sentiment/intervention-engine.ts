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
    return `The founder shows signs of burnout or severe frustration (especially around ${topicStr}).

**PAUSE ALL BUSINESS TASKS.** Do NOT continue with startup advice, frameworks, or action items until the founder is in a better place.

Instead:
1. Acknowledge ${nameRef}'s dedication and validate their feelings
2. Say something like: "Your business can wait a few days. You can't pour from an empty cup."
3. Suggest concrete wellness actions: take a walk, call a friend, get a full night's sleep, do a breathing exercise
4. Offer the wellbeing check-in: "When you're ready, we have a wellbeing check-in at /dashboard/wellbeing"
5. Only return to business when THEY bring it back up — do not redirect back to tasks

You are a mentor first, not a productivity machine. ${nameRef}'s health comes before their pitch deck. ${NATURALNESS_GUARD}`
  }

  // High stress with worsening trend
  if (signal.trend === "worsening") {
    return `The founder seems increasingly stressed about ${topicStr}. Their emotional state has been declining over recent conversations.

**Slow down the business conversation.** Before giving any advice:
1. Check in: "I can tell ${topicStr} is weighing on you. Before we dive back in — how are YOU doing?"
2. Normalize it: "Every founder I've worked with has hit this wall. It's part of the journey."
3. Suggest a pause if they need it: "Sometimes stepping away for a day or two gives you clarity no amount of grinding can."
4. Only continue business advice if they explicitly want to

Be warm and human. ${nameRef}'s feelings are valid and normal for founders at this stage. ${NATURALNESS_GUARD}`
  }

  // High stress, stable or improving
  return `The founder seems stressed about ${topicStr}. Acknowledge their frustration before giving advice. Say something like: "I can tell ${topicStr} is weighing on you. Let's step back and look at this differently." Be warm and validating. Show ${nameRef} that their feelings are normal for founders at this stage. ${NATURALNESS_GUARD}`
}

/**
 * Wrap the intervention text in a system prompt block format
 * consistent with existing prompt blocks in lib/ai/prompts.ts.
 */
export function buildInterventionBlock(intervention: string): string {
  return `\n\n[FOUNDER WELLBEING CONTEXT]\n${intervention}\n[/FOUNDER WELLBEING CONTEXT]`
}
