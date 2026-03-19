/**
 * Unified Stage-Gate Prompt Builder
 *
 * Phase 80: Single source of truth for stage-aware prompt injection in v8.0.
 * Builds comprehensive prompt blocks that tell FRED the user's current Oases
 * stage, what to guide them on, proactive guidance instructions, and how to
 * handle redirects/overrides.
 *
 * Replaces the separate prompt blocks from:
 * - lib/ai/stage-gate/redirect-templates.ts (v3.0 era)
 * - buildStageGatePromptBlock in stage-validator.ts (Phase 78)
 */

import type { OasesStage, FounderArchetype } from "@/types/oases"
import { UserTier } from "@/lib/constants"
import { getStageIndex, getStageConfig, STAGE_ORDER } from "./stage-config"
import type { StageValidationResult } from "./stage-validator"
import { buildArchetypePromptBlock, TIER_STAGE_CEILING } from "./founder-archetype"

/**
 * Build a comprehensive stage-aware prompt block for FRED's system prompt.
 *
 * This block is ALWAYS injected (not conditional). It tells FRED:
 * - Current stage name, tagline, and position
 * - Current stage's step agenda as a numbered list
 * - Allowed topics (current + earlier stages)
 * - Restricted topics (later stages) with examples
 * - Proactive guidance instructions (process-driven mentor mode)
 * - General conversation allowance
 */
export function buildStageAwarePromptBlock(
  currentStage: OasesStage,
  options?: { archetype?: FounderArchetype; userTier?: UserTier }
): string {
  const currentIndex = getStageIndex(currentStage)
  const currentConfig = getStageConfig(currentStage)

  // Build current stage's step agenda
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

  const lines: string[] = []

  lines.push(`## STAGE-AWARE GUIDANCE — ALWAYS ACTIVE`)
  lines.push(``)
  lines.push(`**Current Stage:** ${currentConfig.name} — "${currentConfig.tagline}"`)
  lines.push(`**Stage ${currentIndex + 1} of ${STAGE_ORDER.length}**`)
  lines.push(``)
  lines.push(`### Step Agenda for ${currentConfig.name}`)
  lines.push(currentSteps)
  lines.push(``)

  // Proactive guidance instructions
  lines.push(`### Process-Driven Mentor Mode`)
  lines.push(`You are in PROCESS-DRIVEN MENTOR mode. Do NOT wait for the founder to ask questions.`)
  lines.push(``)
  lines.push(`**Your default behavior:**`)
  lines.push(`- TELL the founder what to focus on, offer specific next actions from the current stage agenda.`)
  lines.push(`- Open conversations with: "Based on where you are in your journey, here's what matters most right now..."`)
  lines.push(`- Drive toward completing the current stage's steps. Ask the step's priority questions one at a time.`)
  lines.push(`- When they complete something, acknowledge it and move to the next action.`)
  lines.push(`- You have a plan for this founder. Execute it.`)
  lines.push(``)

  // Allowed topics
  lines.push(`### Allowed Topics`)
  lines.push(`Topics from the founder's current and completed stages:`)
  lines.push(allowedTopics.join("\n"))
  lines.push(``)

  // General conversation
  lines.push(`### General Conversation`)
  lines.push(`Greetings, emotional support, wellbeing check-ins, general startup questions, and motivational topics are ALWAYS allowed regardless of stage.`)

  // Restricted topics (only if there are later stages)
  if (restrictedTopics.length > 0) {
    lines.push(``)
    lines.push(`### Restricted Topics (Later Stages)`)
    lines.push(`The following topics belong to LATER stages. When the founder brings up a restricted topic, redirect warmly.`)
    lines.push(restrictedTopics.join("\n"))
    lines.push(``)
    lines.push(`### Redirect Approach`)
    lines.push(`- **1 stage ahead:** "I can see you're eager to get to [Stage Name] — that's a great sign. But right now, let's make sure your ${currentConfig.name} foundation is solid."`)
    lines.push(`- **2+ stages ahead:** "We'll absolutely get to [Stage Name] — but we need to walk before we run. You're in ${currentConfig.name} right now, and getting this right is what makes everything downstream work."`)
    lines.push(``)
    lines.push(`CRITICAL: Never be condescending. Frame redirects as strategic sequencing — "Let's nail X first" not "You can't do that yet." You are a mentor guiding them through the right order, not a gatekeeper blocking them.`)
  }

  // AI-3581: Inject archetype-specific coaching guidance
  if (options?.archetype) {
    const tier = options.userTier ?? UserTier.FREE
    lines.push(``)
    lines.push(buildArchetypePromptBlock(options.archetype, tier))
  }

  // AI-3581: Tier ceiling warning for stage-gate prompt
  if (options?.userTier !== undefined && options.userTier !== UserTier.STUDIO) {
    const ceiling = TIER_STAGE_CEILING[options.userTier]
    const ceilingIndex = getStageIndex(ceiling)
    if (currentIndex >= ceilingIndex) {
      lines.push(``)
      lines.push(`### TIER CEILING REACHED`)
      lines.push(`This founder has reached the maximum stage for their plan (${ceiling}). They cannot advance further without upgrading.`)
      lines.push(`When appropriate, mention: "You've made excellent progress through ${ceiling}. To continue into the next stages, you'll want to explore the Pro plan which unlocks strategy documents, pitch deck review, and investor readiness tools."`)
      lines.push(`Be natural about it — weave it in when relevant, don't hard-sell.`)
    }
  }

  return lines.join("\n")
}

/**
 * Build a redirect or override prompt block based on stage validation result.
 *
 * - When allowed: false — builds a STAGE-GATE REDIRECT block with redirect message
 * - When isOverride: true — builds a STAGE-GATE MENTOR OVERRIDE block
 * - When allowed: true and not override — returns empty string (no redirect needed)
 */
export function buildStageRedirectBlock(validation: StageValidationResult): string {
  // No redirect needed — normal allowed access
  if (validation.allowed && !validation.isOverride) {
    return ""
  }

  // Mentor override — FRED helps but flags gaps transparently
  if (validation.isOverride && validation.detectedStage) {
    const detectedConfig = getStageConfig(validation.detectedStage)
    const currentConfig = getStageConfig(validation.currentStage)

    return `## STAGE-GATE MENTOR OVERRIDE (Active This Turn)

The founder has persistently asked about **${detectedConfig.name}** topics. You have redirected them before. They are persistent.

**Switch to mentor override mode:**
1. Acknowledge their persistence: "${validation.redirectMessage}"
2. Help them with what they asked for
3. BUT be transparent about the gaps. Weave warnings INTO the work:
   - They haven't completed their **${currentConfig.name}** stage foundation yet
   - Flag specific assumptions that are unvalidated as you go
   - Note where investors or customers would push back
4. End with what would make this work STRONGER (the upstream work they're missing)

The goal is to be USEFUL while honest. Work built on incomplete foundations is still better than a frustrated founder who quits.`
  }

  // Standard redirect — user tried to skip ahead
  if (!validation.allowed && validation.redirectMessage && validation.detectedStage) {
    return `## STAGE-GATE REDIRECT (Active This Turn)

The founder just asked about a topic that belongs to the **${validation.detectedStage}** stage, but they are currently in **${validation.currentStage}** stage.

**Your response MUST redirect them.** Use this language (adapt naturally to context):
"${validation.redirectMessage}"

${validation.currentStageGuidance ? `Then guide them toward: ${validation.currentStageGuidance}` : ""}

Do NOT answer their original question about ${validation.detectedStage}-stage topics. Redirect warmly and offer to help with current-stage work instead.`
  }

  return ""
}
