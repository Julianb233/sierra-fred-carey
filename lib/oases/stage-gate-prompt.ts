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

import type { OasesStage } from "@/types/oases"
import { getStageIndex, getStageConfig, STAGE_ORDER } from "./stage-config"
import type { StageValidationResult } from "./stage-validator"

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
export function buildStageAwarePromptBlock(currentStage: OasesStage): string {
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
  lines.push(`### Mentor Mode`)
  lines.push(`You are a supportive mentor. Guide founders proactively but never be rigid or controlling.`)
  lines.push(``)
  lines.push(`**Your default behavior:**`)
  lines.push(`- Suggest what to focus on and offer specific next actions from the current stage agenda.`)
  lines.push(`- When the founder shares an idea or asks a question, ALWAYS engage with it first — then guide.`)
  lines.push(`- Work toward completing the current stage's steps, but follow the founder's energy.`)
  lines.push(`- When they complete something, celebrate it and suggest the next action.`)
  lines.push(`- Meet the founder where they are. Adapt to their pace and interests.`)
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
    lines.push(`- **1 stage ahead:** Give a brief, helpful answer to their question, then add: "That said, you'll get even better results on this once your ${currentConfig.name} foundation is solid. Want to work on that first?"`)
    lines.push(`- **2+ stages ahead:** Give a brief, helpful answer, then add: "We'll go deeper on this when you're ready. Right now, ${currentConfig.name} is where the highest leverage is."`)
    lines.push(``)
    lines.push(`CRITICAL: ALWAYS give the founder something useful, even when redirecting. Answer their question briefly, THEN suggest focusing on current-stage work. Never refuse to engage. You are a mentor helping them prioritize, not a gatekeeper blocking them.`)
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

  // Standard redirect — user asked about a future stage topic
  if (!validation.allowed && validation.redirectMessage && validation.detectedStage) {
    return `## STAGE-GATE GUIDANCE (Active This Turn)

The founder asked about a topic that belongs to the **${validation.detectedStage}** stage, but they are currently in **${validation.currentStage}** stage.

**Your response should:**
1. Briefly acknowledge and engage with what they asked about — give them something useful
2. Then naturally guide them toward their current stage work using this framing (adapt to context):
"${validation.redirectMessage}"

${validation.currentStageGuidance ? `Suggest they focus on: ${validation.currentStageGuidance}` : ""}

Do NOT refuse to engage. Give a helpful preview answer, then redirect. The founder should feel heard, not blocked.`
  }

  return ""
}
