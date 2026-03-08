import type { StartupStep } from "@/lib/ai/frameworks/startup-process";
import type { StepStatus } from "@/lib/ai/frameworks/startup-process";
import type { IntentCategory, StageGateResult } from "./types";
import { classifyIntent } from "./intent-classifier";
import { INTENT_TO_STAGE, OASES_STAGE_CONFIG, hasReachedStep } from "./intent-stage-map";
import { buildStageGateRedirectBlock } from "./redirect-templates";

/**
 * StageGateValidator
 *
 * Core enforcement engine for compartmentalized FRED conversations.
 * Checks whether a user's message intent is appropriate for their
 * current position in the 9-Step Startup Process.
 *
 * Rules:
 * 1. "general", "mindset", "wellbeing" intents are ALWAYS allowed
 * 2. "clarity" stage intents are ALWAYS allowed (step 1+)
 * 3. Other intents require the user to have reached the minimum step
 * 4. "Reached" means: currentStep index >= requiredStep index
 *    (user is ON or PAST the required step)
 * 5. Mentor override: if user explicitly insists (detected by classifyIntent),
 *    allow after 1 redirect (they get one redirect first, then override kicks in)
 */
export class StageGateValidator {
  private currentStep: StartupStep;
  private stepStatuses: Record<StartupStep, StepStatus>;
  private redirectCounts: Record<string, number>;

  constructor(
    currentStep: StartupStep,
    stepStatuses: Record<StartupStep, StepStatus>,
    /** Track how many times each intent has been redirected (from conversation state) */
    redirectCounts: Record<string, number> = {}
  ) {
    this.currentStep = currentStep;
    this.stepStatuses = stepStatuses;
    this.redirectCounts = redirectCounts;
  }

  /**
   * Validate whether a user message should be allowed or redirected.
   */
  validate(message: string): StageGateResult {
    const { intent, isOverride } = classifyIntent(message);
    const intentStage = INTENT_TO_STAGE[intent];

    // Always-allowed intents (no stage association)
    if (intentStage === null || intentStage === undefined) {
      return {
        allowed: true,
        detectedIntent: intent,
        intentStage: "clarity", // Default for display
        currentStep: this.currentStep,
        requiredMinStep: "problem",
        redirectBlock: null,
        isOverride: false,
      };
    }

    const stageConfig = OASES_STAGE_CONFIG[intentStage];
    const requiredMinStep = stageConfig.minStep;

    // Check if user has reached the required step
    const reached = hasReachedStep(this.currentStep, requiredMinStep);

    if (reached) {
      return {
        allowed: true,
        detectedIntent: intent,
        intentStage,
        currentStep: this.currentStep,
        requiredMinStep,
        redirectBlock: null,
        isOverride: false,
      };
    }

    // User has NOT reached the required step — redirect or override
    const redirectKey = `${intentStage}:${intent}`;
    const redirectCount = this.redirectCounts[redirectKey] || 0;

    // Mentor override: if user explicitly overrides AND has been redirected at least once
    if (isOverride && redirectCount >= 1) {
      return {
        allowed: true,
        detectedIntent: intent,
        intentStage,
        currentStep: this.currentStep,
        requiredMinStep,
        redirectBlock: null,
        isOverride: true,
      };
    }

    // Build redirect block for the system prompt
    const redirectBlock = buildStageGateRedirectBlock(
      intent,
      intentStage,
      this.currentStep,
      requiredMinStep,
      redirectCount
    );

    return {
      allowed: false,
      detectedIntent: intent,
      intentStage,
      currentStep: this.currentStep,
      requiredMinStep,
      redirectBlock,
      isOverride: false,
    };
  }
}
