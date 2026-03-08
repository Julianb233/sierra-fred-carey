import type { IntentCategory, OasesStage } from "./types";
import type { StartupStep } from "@/lib/ai/frameworks/startup-process";
import { STARTUP_STEPS } from "@/lib/ai/frameworks/startup-process";
import { OASES_STAGE_CONFIG } from "./intent-stage-map";

/** Human-readable labels for intent categories */
const INTENT_LABELS: Record<IntentCategory, string> = {
  problem_definition: "defining the problem",
  idea_validation: "validating your idea",
  customer_interviews: "customer interviews",
  market_research: "market research",
  market_testing: "market testing",
  mvp_planning: "MVP planning",
  pricing: "pricing strategy",
  competitive_analysis: "competitive analysis",
  product_development: "product development",
  pitch_deck_creation: "pitch deck",
  team_building: "team building",
  strategy_docs: "strategy documents",
  investor_outreach: "investor outreach",
  fundraising: "fundraising",
  pitch_preparation: "pitch preparation",
  investor_targeting: "investor targeting",
  scaling: "scaling",
  fund_matching: "fund matching and networking",
  advanced_analytics: "advanced analytics",
  partnerships: "partnerships",
  general: "general discussion",
  mindset: "mindset",
  wellbeing: "wellbeing",
};

/**
 * Build a redirect prompt block for the system prompt.
 *
 * This instructs FRED to redirect the founder back to their current step
 * when they attempt to skip ahead. The language is warm but firm, per
 * Fred Cary's requirement: "Gentle redirects when user tries to skip."
 *
 * The redirect is a PROMPT INSTRUCTION — it tells FRED what to say,
 * it does not hardcode the response.
 */
export function buildStageGateRedirectBlock(
  intent: IntentCategory,
  intentStage: OasesStage,
  currentStep: StartupStep,
  requiredMinStep: StartupStep,
  redirectCount: number = 0
): string {
  const intentLabel = INTENT_LABELS[intent] || intent.replace(/_/g, " ");
  const currentStepConfig = STARTUP_STEPS[currentStep];
  const requiredStepConfig = STARTUP_STEPS[requiredMinStep];
  const stageConfig = OASES_STAGE_CONFIG[intentStage];

  // After 2 redirects, enter compromise mode (same pattern as Reality Lens gate)
  if (redirectCount >= 2) {
    return `## STAGE GATE — MENTOR OVERRIDE ACTIVE (This Turn)

The founder has asked about **${intentLabel}** multiple times (${redirectCount + 1} requests).
You have redirected them before. They are persistent.

**Switch to mentor override mode:**
1. Acknowledge their persistence: "I hear you — you want to work on ${intentLabel}. Let's do it."
2. Help them with what they asked for
3. BUT be transparent about the gaps. Weave warnings INTO the work:
   - They haven't completed **Step ${currentStepConfig.stepNumber}: ${currentStepConfig.name}** yet
   - Flag specific assumptions that are unvalidated as you go
   - Note where investors or customers would push back
4. End with what would make this work STRONGER (the upstream truth they're missing)

The goal is to be USEFUL while honest. Work built on unvalidated assumptions is still better than a frustrated founder who quits.`;
  }

  // Standard redirect
  const redirectMessage = stageConfig.redirectTemplate.replace("{intent_label}", intentLabel);

  return `## STAGE GATE — REDIRECT (Active This Turn)

The founder is asking about **${intentLabel}** (${intentStage} stage).
They are currently on **Step ${currentStepConfig.stepNumber}: ${currentStepConfig.name}**.
This topic requires at least **Step ${requiredStepConfig.stepNumber}: ${requiredStepConfig.name}**.

**Your response MUST:**
1. Acknowledge what they asked about — do NOT dismiss it or ignore it
2. Explain why you need to work through the current step first. Use this guidance:
   "${redirectMessage}"
3. Redirect to a specific, actionable question or task for Step ${currentStepConfig.stepNumber}: ${currentStepConfig.name}
4. Be warm but firm — do not let the founder skip ahead
5. Frame it as protecting them, not blocking them: "I want to make sure this is built on solid ground"

**Do NOT:**
- Ignore their request entirely
- Be condescending or lecture them
- Use phrases like "you're not ready" — instead say "let's make sure the foundation is solid first"
- Block indefinitely — if they push back again, you'll switch to helping them while being transparent about gaps`;
}

/**
 * Build a proactive guidance block for the system prompt.
 *
 * This is the "FRED tells users what to do" requirement from Fred Cary.
 * Instead of asking "what do you need?", FRED proactively guides based
 * on the user's current step.
 */
export function buildProactiveGuidanceBlock(
  currentStep: StartupStep,
  stageLabel: string
): string {
  const stepConfig = STARTUP_STEPS[currentStep];
  if (!stepConfig) return "";

  return `## PROACTIVE GUIDANCE MODE (Always Active)

You are in **${stageLabel}** stage. The founder is on **Step ${stepConfig.stepNumber}: ${stepConfig.name}**.

**Your default behavior this session:**
- TELL the founder what to focus on, don't ask "what do you need?"
- Open with something like: "Based on where you are, here's what matters most right now..."
- Drive toward the step's required output: "${stepConfig.requiredOutput}"
- Ask the step's priority questions one at a time (don't dump all at once)
- When they complete something, acknowledge it and move to the next action

**You are a process-driven mentor, not a chatbot.** You have a plan for this founder. Execute it.`;
}
