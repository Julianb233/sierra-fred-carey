import type { StartupStep } from "@/lib/ai/frameworks/startup-process";

/** The 5 Oases stages that compartmentalize FRED conversations */
export type OasesStage = "clarity" | "validation" | "build" | "launch" | "grow";

/** Fine-grained intent categories detected from user messages */
export type IntentCategory =
  // clarity stage
  | "problem_definition" | "idea_validation" | "customer_interviews" | "market_research"
  // validation stage
  | "market_testing" | "mvp_planning" | "pricing" | "competitive_analysis"
  // build stage
  | "product_development" | "pitch_deck_creation" | "team_building" | "strategy_docs"
  // launch stage
  | "investor_outreach" | "fundraising" | "pitch_preparation" | "investor_targeting"
  // grow stage
  | "scaling" | "fund_matching" | "advanced_analytics" | "partnerships"
  // always allowed
  | "general" | "mindset" | "wellbeing";

/** Result of stage gate validation */
export interface StageGateResult {
  allowed: boolean;
  /** The intent detected from the user's message */
  detectedIntent: IntentCategory;
  /** The Oases stage this intent belongs to */
  intentStage: OasesStage;
  /** The user's current step in the 9-Step Process */
  currentStep: StartupStep;
  /** The minimum step required for this intent */
  requiredMinStep: StartupStep;
  /** If not allowed, the redirect prompt block to inject into system prompt */
  redirectBlock: string | null;
  /** Whether the user invoked the mentor override */
  isOverride: boolean;
}

/** Configuration for each Oases stage */
export interface OasesStageConfig {
  stage: OasesStage;
  label: string;
  /** The minimum StartupStep the user must have validated (or be on) to access this stage */
  minStep: StartupStep;
  /** Intent categories that belong to this stage */
  intents: IntentCategory[];
  /** Fred-style redirect message when user tries to skip ahead */
  redirectTemplate: string;
}
