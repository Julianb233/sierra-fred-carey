import type { OasesStage, OasesStageConfig, IntentCategory } from "./types";
import type { StartupStep } from "@/lib/ai/frameworks/startup-process";
import { STEP_ORDER } from "@/lib/ai/frameworks/startup-process";

/**
 * Maps each Oases stage to its minimum required StartupStep and associated intents.
 *
 * Stage -> Minimum Step mapping:
 * - clarity:    "problem" (step 1) — always accessible
 * - validation: "validation" (step 5) — must have problem, buyer, edge, solution defined
 * - build:      "gtm" (step 6) — must have validated demand
 * - launch:     "execution" (step 7) — must have GTM defined
 * - grow:       "pilot" (step 8) — must have run a pilot
 */
export const OASES_STAGE_CONFIG: Record<OasesStage, OasesStageConfig> = {
  clarity: {
    stage: "clarity",
    label: "Clarity",
    minStep: "problem",
    intents: ["problem_definition", "idea_validation", "customer_interviews", "market_research"],
    redirectTemplate: "", // Always accessible
  },
  validation: {
    stage: "validation",
    label: "Validation",
    minStep: "validation",
    intents: ["market_testing", "mvp_planning", "pricing", "competitive_analysis"],
    redirectTemplate: "I know you're eager to test the market, but we need to nail down the fundamentals first. Let's make sure you have a clear problem, a defined buyer, and a focused solution before we start validating. Otherwise, you'll be testing the wrong thing.",
  },
  build: {
    stage: "build",
    label: "Build",
    minStep: "gtm",
    intents: ["product_development", "pitch_deck_creation", "team_building", "strategy_docs"],
    redirectTemplate: "Building is exciting, but building the wrong thing is expensive. Before we work on {intent_label}, let's make sure you've validated that customers actually want this and you know how you'll reach them. That's the foundation everything else sits on.",
  },
  launch: {
    stage: "launch",
    label: "Launch",
    minStep: "execution",
    intents: ["investor_outreach", "fundraising", "pitch_preparation", "investor_targeting"],
    redirectTemplate: "I've seen too many founders chase investors before they have something worth investing in. Before we talk about {intent_label}, let's make sure you've got validated demand, a working GTM motion, and execution discipline. Investors will ask — and you'll need real answers.",
  },
  grow: {
    stage: "grow",
    label: "Grow",
    minStep: "pilot",
    intents: ["scaling", "fund_matching", "advanced_analytics", "partnerships"],
    redirectTemplate: "Scaling before you've proven the model is how companies run out of money. Before we work on {intent_label}, let's finish the contained pilot and know what works. Then we scale what's proven, not what's assumed.",
  },
};

/** Reverse lookup: intent -> Oases stage */
export const INTENT_TO_STAGE: Record<IntentCategory, OasesStage | null> = (() => {
  const map: Record<string, OasesStage | null> = {
    general: null,
    mindset: null,
    wellbeing: null,
  };
  for (const [stage, config] of Object.entries(OASES_STAGE_CONFIG)) {
    for (const intent of config.intents) {
      map[intent] = stage as OasesStage;
    }
  }
  return map as Record<IntentCategory, OasesStage | null>;
})();

/**
 * Check if the user's current step meets or exceeds the required minimum step.
 * Uses STEP_ORDER index comparison.
 */
export function hasReachedStep(currentStep: StartupStep, requiredStep: StartupStep): boolean {
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const requiredIdx = STEP_ORDER.indexOf(requiredStep);
  return currentIdx >= requiredIdx;
}
