/**
 * Structured Output Schemas
 *
 * Zod schemas for AI-generated structured outputs.
 * These ensure type-safe, validated responses from AI models.
 */

import { z } from "zod";

// ============================================================================
// FRED Decision Flow Schemas
// ============================================================================

/**
 * Entity extracted from user input
 */
export const entitySchema = z.object({
  type: z.enum([
    "money",
    "time",
    "percentage",
    "person",
    "company",
    "product",
    "metric",
    "date",
    "other",
  ]),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
});

/**
 * Clarification needed from the user
 */
export const clarificationSchema = z.object({
  question: z.string(),
  priority: z.enum(["required", "recommended", "optional"]),
  context: z.string().optional(),
});

/**
 * Validated input from the intake stage
 */
export const validatedInputSchema = z.object({
  intent: z.enum([
    "question",
    "decision_request",
    "information",
    "feedback",
    "greeting",
    "unclear",
  ]),
  entities: z.array(entitySchema),
  confidence: z.number().min(0).max(1),
  clarificationNeeded: z.array(clarificationSchema),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]).optional(),
  urgency: z.enum(["critical", "high", "medium", "low"]).optional(),
  topic: z.string().optional(),
});

/**
 * Mental model analysis result
 */
export const mentalModelSchema = z.object({
  model: z.enum([
    "first_principles",
    "pre_mortem",
    "opportunity_cost",
    "five_whys",
    "inversion",
    "second_order",
  ]),
  analysis: z.record(z.string(), z.unknown()),
  relevance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  insights: z.array(z.string()),
});

/**
 * Alternative option in synthesis
 */
export const alternativeSchema = z.object({
  description: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  whyNotRecommended: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
});

/**
 * Risk identified in synthesis
 */
export const riskSchema = z.object({
  description: z.string(),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  mitigation: z.string().optional(),
});

/**
 * Synthesis result from combining mental models
 */
export const synthesisSchema = z.object({
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternatives: z.array(alternativeSchema),
  risks: z.array(riskSchema).optional(),
  assumptions: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
});

/**
 * Final decision result
 */
export const decisionSchema = z.object({
  action: z.enum(["auto_execute", "recommend", "escalate", "clarify"]),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  requiresHumanApproval: z.boolean(),
  reasoning: z.string(),
  followUpQuestions: z.array(z.string()).optional(),
});

// ============================================================================
// 7-Factor Scoring Schemas
// ============================================================================

/**
 * Individual factor score
 */
export const factorScoreSchema = z.object({
  value: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  evidence: z.array(z.string()),
});

/**
 * All 7 factor scores
 */
export const factorScoresSchema = z.object({
  strategicAlignment: factorScoreSchema,
  leverage: factorScoreSchema,
  speed: factorScoreSchema,
  revenue: factorScoreSchema,
  time: factorScoreSchema,
  risk: factorScoreSchema,
  relationships: factorScoreSchema,
});

/**
 * Composite scoring result
 */
export const compositeScoreSchema = z.object({
  value: z.number().min(0).max(1),
  percentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no", "strong_no"]),
  factors: factorScoresSchema,
  uncertaintyRange: z.tuple([z.number(), z.number()]),
  summary: z.string(),
});

// ============================================================================
// Reality Lens Schemas
// ============================================================================

/**
 * Reality Lens factor assessment
 */
export const realityFactorSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["strong", "moderate", "weak", "critical"]),
  summary: z.string(),
  details: z.array(z.string()),
  recommendations: z.array(z.string()),
});

/**
 * Reality Lens full assessment
 */
export const realityLensSchema = z.object({
  feasibility: realityFactorSchema,
  economics: realityFactorSchema,
  demand: realityFactorSchema,
  distribution: realityFactorSchema,
  timing: realityFactorSchema,
  overallScore: z.number().min(0).max(100),
  overallAssessment: z.string(),
  criticalConcerns: z.array(z.string()),
  keyStrengths: z.array(z.string()),
});

// ============================================================================
// Investor Readiness Schemas
// ============================================================================

/**
 * Investor readiness dimension
 */
export const readinessDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  assessment: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  priorityActions: z.array(z.string()),
});

/**
 * Full investor readiness assessment
 */
export const investorReadinessSchema = z.object({
  overallScore: z.number().min(0).max(100),
  readinessLevel: z.enum([
    "not_ready",
    "early_stage",
    "developing",
    "ready",
    "highly_prepared",
  ]),
  dimensions: z.object({
    team: readinessDimensionSchema,
    market: readinessDimensionSchema,
    product: readinessDimensionSchema,
    traction: readinessDimensionSchema,
    financials: readinessDimensionSchema,
    pitch: readinessDimensionSchema,
  }),
  summary: z.string(),
  topPriorities: z.array(z.string()),
});

// ============================================================================
// Document Analysis Schemas
// ============================================================================

/**
 * Pitch deck slide analysis
 */
export const slideAnalysisSchema = z.object({
  slideNumber: z.number(),
  slideType: z.enum([
    "cover",
    "problem",
    "solution",
    "market",
    "product",
    "traction",
    "team",
    "financials",
    "ask",
    "other",
  ]),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  suggestions: z.array(z.string()),
});

/**
 * Full pitch deck review
 */
export const pitchDeckReviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  slides: z.array(slideAnalysisSchema),
  missingSlides: z.array(z.string()),
  structureScore: z.number().min(0).max(100),
  contentScore: z.number().min(0).max(100),
  designScore: z.number().min(0).max(100),
  topStrengths: z.array(z.string()),
  topImprovements: z.array(z.string()),
});

// ============================================================================
// Chat/Conversation Schemas
// ============================================================================

/**
 * Chat response with metadata
 */
export const chatResponseSchema = z.object({
  content: z.string(),
  intent: z.enum(["answer", "clarify", "suggest", "acknowledge", "redirect"]),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional(),
  followUp: z.string().optional(),
});

/**
 * Conversation summary
 */
export const conversationSummarySchema = z.object({
  mainTopics: z.array(z.string()),
  keyDecisions: z.array(z.string()),
  actionItems: z.array(z.string()),
  openQuestions: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Entity = z.infer<typeof entitySchema>;
export type Clarification = z.infer<typeof clarificationSchema>;
export type ValidatedInput = z.infer<typeof validatedInputSchema>;
export type MentalModelResult = z.infer<typeof mentalModelSchema>;
export type Alternative = z.infer<typeof alternativeSchema>;
export type Risk = z.infer<typeof riskSchema>;
export type SynthesisResult = z.infer<typeof synthesisSchema>;
export type DecisionResult = z.infer<typeof decisionSchema>;
export type FactorScore = z.infer<typeof factorScoreSchema>;
export type FactorScores = z.infer<typeof factorScoresSchema>;
export type CompositeScore = z.infer<typeof compositeScoreSchema>;
export type RealityFactor = z.infer<typeof realityFactorSchema>;
export type RealityLens = z.infer<typeof realityLensSchema>;
export type ReadinessDimension = z.infer<typeof readinessDimensionSchema>;
export type InvestorReadiness = z.infer<typeof investorReadinessSchema>;
export type SlideAnalysis = z.infer<typeof slideAnalysisSchema>;
export type PitchDeckReview = z.infer<typeof pitchDeckReviewSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
