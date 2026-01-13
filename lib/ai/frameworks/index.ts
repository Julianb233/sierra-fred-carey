/**
 * Fred Cary AI Frameworks
 * Export all frameworks for unified access
 */

// Startup Process Framework
export {
  type StartupStep,
  type StepStatus,
  type StepValidation,
  type StartupProcessState,
  STARTUP_STEPS,
  STEP_ORDER,
  getNextStep,
  getPreviousStep,
  createInitialState,
  generateStepPrompt,
  generateFullProcessPrompt,
} from "./startup-process";

// Positioning Readiness Framework
export {
  type PositioningGrade,
  type CategoryScore,
  type PositioningCategory,
  type PositioningAssessment,
  type PositioningSignals,
  POSITIONING_CATEGORIES,
  CATEGORY_ORDER,
  scoreToGrade,
  gradeToScore,
  calculateOverallGrade,
  generatePositioningPrompt,
  detectPositioningSignals,
  needsPositioningFramework,
  POSITIONING_INTRODUCTION_LANGUAGE,
} from "./positioning";

// Investor Lens Framework
export {
  type InvestorStage,
  type InvestorVerdict,
  type InvestorEvaluation,
  type CoreVCAxis,
  type StageSpecificCriteria,
  type InvestorReadinessSignals,
  CORE_VC_AXES,
  HIDDEN_VC_FILTERS,
  STAGE_CRITERIA,
  detectInvestorSignals,
  needsInvestorLens,
  INVESTOR_LENS_INTRODUCTION,
  DECK_REQUEST_RULES,
  generateInvestorLensPrompt,
  shouldRequestDeck,
} from "./investor-lens";
