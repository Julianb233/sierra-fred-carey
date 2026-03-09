/**
 * Oases Stage Validator
 *
 * Validates whether a user's chat message matches their current Oases stage
 * or belongs to a future stage. Provides warm redirect messages in Fred Cary's
 * mentoring voice when users try to jump ahead.
 *
 * Phase 80: Added redirect counting, mentor override after 2 redirects,
 * and enhanced result types for the chat pipeline.
 */

import type { OasesStage } from "@/types/oases"
import { classifyIntent } from "./intent-classifier"
import { getStageIndex, getStageConfig, STAGE_ORDER, STAGE_CONFIG } from "./stage-config"

export interface StageValidationResult {
  allowed: boolean
  currentStage: OasesStage
  detectedStage: OasesStage | null
  redirectMessage: string | null
  currentStageGuidance: string | null
  /** Phase 80: Whether mentor override was triggered (user insisted + was redirected before) */
  isOverride: boolean
  /** Phase 80: Key for tracking redirect counts (e.g., "build:pitch_deck_creation") */
  redirectKey: string | null
}

/**
 * Validate whether a user's message is appropriate for their current Oases stage.
 *
 * Returns allowed: true if the topic matches the current or earlier stage,
 * or if no stage-specific topic was detected (general conversation).
 *
 * Returns allowed: false with a warm redirect message if the topic belongs
 * to a future stage.
 *
 * Phase 80: Supports redirect counting and mentor override.
 * - redirectCounts: Record<string, number> tracking how many times each topic was redirected
 * - After 2 redirects for the same topic, enters MENTOR OVERRIDE mode (allowed: true, isOverride: true)
 * - When classifyIntent returns isOverride AND redirectCounts >= 1, also enters override mode
 */
export function validateStageAccess(
  message: string,
  currentStage: OasesStage,
  redirectCounts: Record<string, number> = {}
): StageValidationResult {
  const classification = classifyIntent(message)
  const { detectedStage, confidence, isOverride: userInsists } = classification

  // General conversation or low confidence — always allow
  if (detectedStage === null || confidence === "low") {
    return {
      allowed: true,
      currentStage,
      detectedStage: null,
      redirectMessage: null,
      currentStageGuidance: null,
      isOverride: false,
      redirectKey: null,
    }
  }

  const currentIndex = getStageIndex(currentStage)
  const detectedIndex = getStageIndex(detectedStage)

  // Topic matches current or earlier stage — allowed
  if (detectedIndex <= currentIndex) {
    return {
      allowed: true,
      currentStage,
      detectedStage,
      redirectMessage: null,
      currentStageGuidance: null,
      isOverride: false,
      redirectKey: null,
    }
  }

  // Topic belongs to a future stage — check for override conditions
  const currentConfig = getStageConfig(currentStage)
  const detectedConfig = getStageConfig(detectedStage)
  const stageGap = detectedIndex - currentIndex

  const redirectKey = `${detectedStage}:${classification.matchedTopic || "general"}`
  const topicRedirectCount = redirectCounts[redirectKey] ?? 0

  const stepsGuidance = currentConfig.steps
    .map((s) => s.label)
    .join(", ")

  const currentStageGuidance = `In ${currentConfig.name}, focus on: ${stepsGuidance}. Which of these would you like to tackle?`

  // Phase 80: Mentor override — user has been redirected 2+ times OR explicitly insists after 1+ redirect
  if (topicRedirectCount >= 2 || (userInsists && topicRedirectCount >= 1)) {
    const overrideMessage =
      `I hear you — you want to work on ${detectedConfig.name.toLowerCase()} topics. Let's do it. ` +
      `But I want to be upfront: your ${currentConfig.name} foundation isn't fully solid yet, ` +
      `so I'll flag the gaps as we go.`

    return {
      allowed: true,
      currentStage,
      detectedStage,
      redirectMessage: overrideMessage,
      currentStageGuidance,
      isOverride: true,
      redirectKey,
    }
  }

  // Standard redirect
  let redirectMessage: string

  if (stageGap === 1) {
    redirectMessage =
      `I can see you're eager to get to ${detectedConfig.name} — that's a great sign. ` +
      `But right now, let's make sure your ${currentConfig.name} foundation is solid. ` +
      currentStageGuidance
  } else {
    redirectMessage =
      `We'll absolutely get to ${detectedConfig.name} — but we need to walk before we run. ` +
      `You're in ${currentConfig.name} right now, and getting this right is what makes everything downstream work. ` +
      currentStageGuidance
  }

  return {
    allowed: false,
    currentStage,
    detectedStage,
    redirectMessage,
    currentStageGuidance,
    isOverride: false,
    redirectKey,
  }
}

/**
 * Build a prompt block that instructs FRED about stage-gate enforcement.
 *
 * Injected into FRED's system prompt so the LLM knows which topics are
 * appropriate and how to redirect when users try to jump ahead.
 */
export function buildStageGatePromptBlock(currentStage: OasesStage): string {
  const currentIndex = getStageIndex(currentStage)
  const currentConfig = getStageConfig(currentStage)

  // Build list of current stage steps as agenda
  const currentSteps = currentConfig.steps
    .map((s, i) => `${i + 1}. ${s.label} — ${s.description}`)
    .join("\n")

  // Build allowed topics (current + earlier stages)
  const allowedTopics: string[] = []
  for (let i = 0; i <= currentIndex; i++) {
    const stage = STAGE_ORDER[i]
    const config = getStageConfig(stage)
    allowedTopics.push(`- **${config.name}**: ${config.steps.map((s) => s.label).join(", ")}`)
  }

  // Build restricted topics (later stages)
  const restrictedTopics: string[] = []
  for (let i = currentIndex + 1; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i]
    const config = getStageConfig(stage)
    const topics = config.steps.map((s) => s.label).join(", ")
    restrictedTopics.push(`- **${config.name}** (Stage ${i + 1}): ${topics}`)
  }

  let block = `## STAGE GATE ENFORCEMENT

**Current Stage:** ${currentConfig.name} — "${currentConfig.tagline}"
**Stage ${currentIndex + 1} of ${STAGE_ORDER.length}**

### Your Agenda for ${currentConfig.name}
${currentSteps}

### Allowed Topics
Topics from the founder's current and completed stages:
${allowedTopics.join("\n")}

### General Conversation
Greetings, emotional support, wellbeing check-ins, general startup questions, and motivational topics are ALWAYS allowed regardless of stage.
`

  if (restrictedTopics.length > 0) {
    block += `
### Restricted Topics (Later Stages)
The following topics belong to LATER stages. Do NOT help with these even if the founder insists. Redirect warmly.
${restrictedTopics.join("\n")}

### Redirect Instructions
When the founder brings up a restricted topic:
- **1 stage ahead:** "I can see you're eager to get to [Stage Name] — that's a great sign. But right now, let's make sure your ${currentConfig.name} foundation is solid. [Suggest current stage steps]."
- **2+ stages ahead:** "We'll absolutely get to [Stage Name] — but we need to walk before we run. You're in ${currentConfig.name} right now, and getting this right is what makes everything downstream work. [Suggest current stage steps]."

CRITICAL: Never be condescending. Frame redirects as strategic sequencing — "Let's nail X first" not "You can't do that yet." You are a mentor guiding them through the right order, not a gatekeeper blocking them.
`
  }

  return block
}
