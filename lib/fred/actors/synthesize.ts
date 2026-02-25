/**
 * Synthesize Actor
 *
 * Synthesizes insights from mental models into a cohesive recommendation
 * with 7-factor scoring.
 */

import { logger } from "@/lib/logger";
import { FRED_BIO } from "@/lib/fred-brain";
import type {
  ValidatedInput,
  MentalModelResult,
  MemoryContext,
  SynthesisResult,
  FactorScores,
  Alternative,
  Risk,
  RedFlag,
  ConversationStateContext,
} from "../types";
import { DEFAULT_FRED_CONFIG } from "../types";
import { detectRedFlags } from "../risks/detection-engine";
import {
  scoreDecision,
  detectDecisionType,
  DEFAULT_SCORING_CONFIG,
  type DecisionContext,
  type CompositeScore,
} from "../scoring";

/**
 * Synthesize all analysis into a recommendation
 */
export async function synthesizeActor(
  validatedInput: ValidatedInput,
  mentalModels: MentalModelResult[],
  memoryContext: MemoryContext | null,
  conversationState?: ConversationStateContext | null
): Promise<SynthesisResult> {
  logger.log(
    "[FRED] Synthesizing from",
    mentalModels.length,
    "mental models"
  );

  // Collect all insights from mental models
  const allInsights = mentalModels.flatMap((m) => m.insights);

  // Calculate 7-factor scores (may use AI for decision requests)
  const factors = await calculateFactorScores(validatedInput, mentalModels, memoryContext);

  // Generate the primary recommendation
  const recommendation = generateRecommendation(
    validatedInput,
    mentalModels,
    factors
  );

  // Generate alternatives
  const alternatives = generateAlternatives(validatedInput, mentalModels);

  // Identify risks
  const risks = identifyRisks(validatedInput, mentalModels);

  // Detect and classify red flags from identified risks
  const redFlagSynthesis: SynthesisResult = {
    recommendation: "", confidence: 0, reasoning: "",
    factors, alternatives: [], assumptions: [],
    risks, nextSteps: [], followUpQuestions: [],
  };
  const redFlags = detectRedFlags(redFlagSynthesis, "");

  // Build reasoning chain (Phase 36: includes step context)
  const stepContext = buildStepContext(conversationState || null);
  const reasoning = buildReasoning(validatedInput, mentalModels, factors) + stepContext;

  // Calculate confidence
  const confidence = calculateConfidence(mentalModels, validatedInput);

  // Generate assumptions
  const assumptions = extractAssumptions(mentalModels);

  // Generate next steps
  const nextSteps = generateNextSteps(validatedInput, factors);

  // Generate follow-up questions
  const followUpQuestions = generateFollowUpQuestions(
    validatedInput,
    mentalModels
  );

  return {
    recommendation,
    confidence,
    reasoning,
    factors,
    alternatives,
    assumptions,
    risks,
    nextSteps,
    followUpQuestions,
    redFlags,
  };
}

/**
 * Calculate 7-factor scores based on Fred Cary's methodology
 * Uses AI-powered scoring for decision_request intents, heuristics for simpler queries
 */
async function calculateFactorScores(
  input: ValidatedInput,
  models: MentalModelResult[],
  memory: MemoryContext | null
): Promise<FactorScores> {
  // For decision requests, try AI-powered scoring
  if (input.intent === "decision_request" && process.env.OPENAI_API_KEY) {
    try {
      const aiScores = await getAIFactorScores(input, memory);
      if (aiScores) {
        return aiScores;
      }
    } catch (error) {
      console.error("[FRED] AI scoring failed, falling back to heuristics:", error);
    }
  }

  // Fallback to heuristic scoring
  return calculateHeuristicFactorScores(input, models, memory);
}

/**
 * Get AI-powered factor scores using the scoring engine
 */
async function getAIFactorScores(
  input: ValidatedInput,
  memory: MemoryContext | null
): Promise<FactorScores | null> {
  try {
    // Build context from memory
    const context: DecisionContext = {
      goals: memory?.relevantFacts
        .filter((f) => f.category === "startup_facts")
        .map((f) => `${f.key}: ${JSON.stringify(f.value)}`)
        .slice(0, 5),
      recentDecisions: memory?.recentDecisions
        .slice(0, 3)
        .map((d) => ({
          summary: d.decisionType,
          outcome: d.outcome ? JSON.stringify(d.outcome) : undefined,
        })),
    };

    // Detect decision type
    const decisionType = detectDecisionType(input.originalMessage);

    // Score the decision — respects DEFAULT_SCORING_CONFIG.useAIScoring (false by default)
    const compositeScore = await scoreDecision(
      input.originalMessage,
      context,
      { decisionType, useAI: DEFAULT_SCORING_CONFIG.useAIScoring }
    );

    // Convert CompositeScore factors to our FactorScores format
    return convertToFactorScores(compositeScore);
  } catch (error) {
    console.error("[FRED] AI scoring error:", error);
    return null;
  }
}

/**
 * Convert CompositeScore from scoring engine to FactorScores
 */
function convertToFactorScores(score: CompositeScore): FactorScores {
  return {
    strategicAlignment: score.factors.strategicAlignment.value,
    leverage: score.factors.leverage.value,
    speed: score.factors.speed.value,
    revenue: score.factors.revenue.value,
    time: score.factors.time.value,
    risk: score.factors.risk.value,
    relationships: score.factors.relationships.value,
    composite: score.percentage,
  };
}

/**
 * Calculate heuristic-based factor scores (fallback)
 */
function calculateHeuristicFactorScores(
  input: ValidatedInput,
  models: MentalModelResult[],
  memory: MemoryContext | null
): FactorScores {
  const weights = DEFAULT_FRED_CONFIG.factorWeights;

  // Base scores
  let strategicAlignment = 0.7;
  let leverage = 0.6;
  let speed = 0.5;
  let revenue = 0.5;
  let time = 0.6; // Inverted: higher = less time required
  let risk = 0.6; // Inverted: higher = lower risk
  let relationships = 0.7;

  // Adjust based on input characteristics
  if (input.urgency === "critical" || input.urgency === "high") {
    speed += 0.2;
    time -= 0.2; // More time pressure
  }

  if (input.sentiment === "negative") {
    risk -= 0.1;
  }

  // Adjust based on mental model insights
  const premortem = models.find((m) => m.model === "pre_mortem");
  if (premortem && premortem.analysis.failureModes) {
    const failureCount = (premortem.analysis.failureModes as string[]).length;
    risk -= failureCount * 0.05; // More failure modes = higher risk
  }

  const opportunityCost = models.find((m) => m.model === "opportunity_cost");
  if (opportunityCost && opportunityCost.analysis.resources) {
    const resources = opportunityCost.analysis.resources as Record<string, boolean>;
    if (resources.time) time -= 0.1;
    if (resources.money) leverage += 0.1; // Money involvement often = high leverage
  }

  // Adjust based on memory context
  if (memory && memory.recentDecisions.length > 0) {
    // Has decision history - can be more confident in alignment
    strategicAlignment += 0.1;
  }

  // Clamp all values between 0 and 1
  strategicAlignment = clamp(strategicAlignment);
  leverage = clamp(leverage);
  speed = clamp(speed);
  revenue = clamp(revenue);
  time = clamp(time);
  risk = clamp(risk);
  relationships = clamp(relationships);

  // Calculate weighted composite score (0-100)
  const composite = Math.round(
    (strategicAlignment * weights.strategicAlignment +
      leverage * weights.leverage +
      speed * weights.speed +
      revenue * weights.revenue +
      time * weights.time +
      risk * weights.risk +
      relationships * weights.relationships) *
      100
  );

  return {
    strategicAlignment,
    leverage,
    speed,
    revenue,
    time,
    risk,
    relationships,
    composite,
  };
}

/**
 * Generate the primary recommendation
 */
function generateRecommendation(
  input: ValidatedInput,
  models: MentalModelResult[],
  factors: FactorScores
): string {
  // Collect high-confidence insights
  const topInsights = models
    .filter((m) => m.confidence >= 0.7)
    .flatMap((m) => m.insights)
    .slice(0, 3);

  // Build recommendation based on input type
  if (input.intent === "decision_request") {
    if (factors.composite >= 70) {
      return `After looking at this from ${models.length} angles, I'd say go for it. Here's why: ${topInsights.join(". ")}`;
    } else if (factors.composite >= 50) {
      return `This one's a toss-up. I've seen similar decisions go both ways across my ${FRED_BIO.companiesFounded}+ companies. Consider: ${topInsights.join(". ")} The score of ${factors.composite}/100 tells me you need more data before committing.`;
    } else {
      return `I'm going to be honest with you -- I have concerns here. ${topInsights.join(". ")} I'd either rethink the approach or gather more information before moving forward.`;
    }
  }

  if (input.intent === "question") {
    return `Here's what I see: ${topInsights.join(". ")}`;
  }

  // Default response
  return `Here's the bottom line: ${topInsights.slice(0, 2).join(". ")}`;
}

/**
 * Generate alternative options
 */
function generateAlternatives(
  input: ValidatedInput,
  models: MentalModelResult[]
): Alternative[] {
  const alternatives: Alternative[] = [];

  if (input.intent === "decision_request") {
    // Always suggest "do nothing" as an alternative
    alternatives.push({
      description: "Maintain status quo / defer decision",
      pros: ["No immediate resource commitment", "More time to gather information"],
      cons: ["Opportunity cost", "Potential loss of momentum"],
      whyNotRecommended: "May miss time-sensitive opportunities",
      score: 40,
    });

    // Suggest a modified approach
    alternatives.push({
      description: "Proceed with reduced scope / pilot approach",
      pros: ["Lower risk", "Faster learnings", "Preserves optionality"],
      cons: ["May not capture full potential", "Could delay larger benefits"],
      whyNotRecommended: "Smaller impact but worth considering if risk tolerance is low",
      score: 65,
    });
  }

  return alternatives;
}

/**
 * Identify risks from the analysis
 */
function identifyRisks(
  input: ValidatedInput,
  models: MentalModelResult[]
): Risk[] {
  const risks: Risk[] = [];

  // Extract risks from pre-mortem
  const premortem = models.find((m) => m.model === "pre_mortem");
  if (premortem && premortem.analysis.failureModes) {
    const failureModes = premortem.analysis.failureModes as string[];
    failureModes.slice(0, 3).forEach((mode, index) => {
      risks.push({
        description: mode,
        likelihood: 0.3 - index * 0.05, // Decreasing likelihood for later items
        impact: 0.6,
        mitigation: "Address early in planning phase",
      });
    });
  }

  // Add urgency-related risk
  if (input.urgency === "critical") {
    risks.push({
      description: "Time pressure may lead to suboptimal decision",
      likelihood: 0.4,
      impact: 0.5,
      mitigation: "Identify must-have vs nice-to-have criteria upfront",
    });
  }

  // Add information risk
  if (input.clarificationNeeded.length > 0) {
    risks.push({
      description: "Incomplete information may affect recommendation quality",
      likelihood: 0.5,
      impact: 0.4,
      mitigation: "Gather missing information before final decision",
    });
  }

  return risks;
}

/**
 * Build the reasoning chain
 */
function buildReasoning(
  input: ValidatedInput,
  models: MentalModelResult[],
  factors: FactorScores
): string {
  const parts: string[] = [];

  // Start with what was analyzed
  parts.push(
    `Analyzed your ${input.intent.replace("_", " ")} using ${models.length} mental models.`
  );

  // Add factor highlights
  const highFactors: string[] = [];
  const lowFactors: string[] = [];

  if (factors.strategicAlignment >= 0.7) highFactors.push("strategic alignment");
  if (factors.strategicAlignment <= 0.4) lowFactors.push("strategic alignment");
  if (factors.leverage >= 0.7) highFactors.push("leverage potential");
  if (factors.risk <= 0.4) lowFactors.push("risk level");
  if (factors.risk >= 0.7) highFactors.push("manageable risk");

  if (highFactors.length > 0) {
    parts.push(`Strengths: ${highFactors.join(", ")}.`);
  }
  if (lowFactors.length > 0) {
    parts.push(`Areas to watch: ${lowFactors.join(", ")}.`);
  }

  // Add top model insight
  const topModel = models.find((m) => m.relevance >= 0.8);
  if (topModel && topModel.insights.length > 0) {
    parts.push(`Key insight from ${topModel.model.replace("_", " ")}: ${topModel.insights[0]}`);
  }

  // Add composite score context
  parts.push(
    `Overall score: ${factors.composite}/100 based on 7-factor weighted analysis.`
  );

  return parts.join(" ");
}

/**
 * Calculate overall confidence
 */
function calculateConfidence(
  models: MentalModelResult[],
  input: ValidatedInput
): number {
  // Start with base confidence
  let confidence = 0.7;

  // Adjust based on model confidences
  if (models.length > 0) {
    const avgModelConfidence =
      models.reduce((sum, m) => sum + m.confidence, 0) / models.length;
    confidence = confidence * 0.5 + avgModelConfidence * 0.5;
  }

  // Adjust based on input clarity
  confidence *= input.confidence;

  // Reduce if clarification needed
  if (input.clarificationNeeded.length > 0) {
    confidence -= input.clarificationNeeded.length * 0.1;
  }

  // Reduce if sentiment is mixed (uncertainty)
  if (input.sentiment === "mixed") {
    confidence -= 0.1;
  }

  return clamp(confidence);
}

/**
 * Extract assumptions made in the analysis
 */
function extractAssumptions(models: MentalModelResult[]): string[] {
  const assumptions: string[] = [];

  // Add standard assumptions
  assumptions.push("User has provided accurate context");
  assumptions.push("Current market conditions remain relatively stable");

  // Extract from first principles if available
  const firstPrinciples = models.find((m) => m.model === "first_principles");
  if (firstPrinciples && firstPrinciples.analysis.assumptions) {
    const fpAssumptions = firstPrinciples.analysis.assumptions as string[];
    assumptions.push(...fpAssumptions.slice(0, 2));
  }

  return assumptions.slice(0, 4);
}

/**
 * Generate actionable next steps
 */
function generateNextSteps(
  input: ValidatedInput,
  factors: FactorScores
): string[] {
  const steps: string[] = [];

  if (input.intent === "decision_request") {
    if (factors.composite >= 70) {
      steps.push("Document the decision rationale for future reference");
      steps.push("Identify key milestones to track progress");
      steps.push("Communicate decision to relevant stakeholders");
    } else if (factors.composite >= 50) {
      steps.push("Gather additional data on areas of uncertainty");
      steps.push("Consult with relevant domain experts");
      steps.push("Define criteria that would change the recommendation");
    } else {
      steps.push("Explore alternative approaches");
      steps.push("Identify what would need to change for this to be viable");
      steps.push("Consider smaller experiments to test assumptions");
    }
  } else {
    steps.push("Consider if additional context would help refine this analysis");
    steps.push("Share findings with relevant stakeholders");
  }

  return steps;
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(
  input: ValidatedInput,
  models: MentalModelResult[]
): string[] {
  const questions: string[] = [];

  // Add clarification-based questions
  input.clarificationNeeded.forEach((c) => {
    questions.push(c.question);
  });

  // Add model-based questions
  const fiveWhys = models.find((m) => m.model === "five_whys");
  if (fiveWhys && fiveWhys.analysis.whyChain) {
    const chain = fiveWhys.analysis.whyChain as string[];
    questions.push(...chain.slice(0, 1));
  }

  // Add standard follow-ups based on intent
  if (input.intent === "decision_request" && questions.length < 2) {
    questions.push("What constraints or requirements haven't been mentioned yet?");
    questions.push("How would you define success for this decision?");
  }

  return questions.slice(0, 3);
}

/**
 * Clamp a value between 0 and 1
 */
function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Build step-aware context for synthesis.
 * Ensures FRED's recommendation considers what's been validated.
 */
function buildStepContext(conversationState: ConversationStateContext | null): string {
  if (!conversationState) return "";

  const current = conversationState.currentStep;
  const validated = Object.entries(conversationState.stepStatuses)
    .filter(([, s]) => s === "validated")
    .map(([k]) => k);
  const blockers = conversationState.currentBlockers;

  let ctx = ` | Process position: Step "${current}"`;
  if (validated.length > 0) {
    ctx += ` | Validated: ${validated.join(", ")}`;
  }
  if (blockers.length > 0) {
    ctx += ` | Blockers: ${blockers.join("; ")}`;
  }
  return ctx;
}
