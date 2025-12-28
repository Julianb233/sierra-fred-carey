/**
 * A/B Testing Auto-Promotion Module
 * Centralized exports for experiment auto-promotion functionality
 */

// Promotion rules and eligibility
export {
  evaluatePromotionEligibility,
  performSafetyChecks,
  isExcludedFromAutoPromotion,
  getPromotionRulesForEnvironment,
  DEFAULT_PROMOTION_RULES,
  AGGRESSIVE_PROMOTION_RULES,
  AUTO_PROMOTION_EXCLUDE_LIST,
  type PromotionRules,
  type PromotionSafetyCheck,
  type PromotionEligibility,
} from "./promotion-rules";

// Auto-promotion engine
export {
  checkPromotionEligibility,
  promoteWinningVariant,
  rollbackPromotion,
  getPromotionHistory,
  checkAllExperimentsForPromotion,
  type PromotionAuditLog,
  type PromotionResult,
  type RollbackResult,
} from "./auto-promotion";
