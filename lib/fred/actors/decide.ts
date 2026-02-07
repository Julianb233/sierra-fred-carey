/**
 * Decide Actor
 *
 * Determines the appropriate action based on synthesis results:
 * - auto_execute: FRED acts without human approval
 * - recommend: FRED recommends, awaits human approval
 * - escalate: Requires human decision (FRED provides analysis only)
 * - clarify: Need more information before proceeding
 */

import type {
  SynthesisResult,
  ValidatedInput,
  DecisionResult,
  DecisionAction,
} from "../types";
import { DEFAULT_FRED_CONFIG } from "../types";
import { logger } from "@/lib/logger";
import { FRED_BIO } from "@/lib/fred-brain";

/**
 * Decide what action to take based on synthesis
 */
export async function decideActor(
  synthesis: SynthesisResult,
  validatedInput: ValidatedInput
): Promise<DecisionResult> {
  logger.log(
    "[FRED] Deciding action | Confidence:",
    synthesis.confidence,
    "| Score:",
    synthesis.factors.composite
  );

  // Determine the action
  const action = determineAction(synthesis, validatedInput);

  // Determine if human approval is required
  const requiresHumanApproval = checkRequiresHumanApproval(
    action,
    synthesis,
    validatedInput
  );

  // Build the response content
  const content = buildResponseContent(action, synthesis, validatedInput);

  // Build reasoning for the decision
  const reasoning = buildDecisionReasoning(action, synthesis, validatedInput);

  return {
    action,
    content,
    confidence: synthesis.confidence,
    requiresHumanApproval,
    reasoning,
    procedureUsed: determineProcedureUsed(validatedInput),
    metadata: {
      factorScores: synthesis.factors,
      alternativesCount: synthesis.alternatives.length,
      risksCount: synthesis.risks.length,
      inputIntent: validatedInput.intent,
      inputUrgency: validatedInput.urgency,
    },
  };
}

/**
 * Determine the appropriate action based on synthesis and input
 */
function determineAction(
  synthesis: SynthesisResult,
  input: ValidatedInput
): DecisionAction {
  const { confidence, factors } = synthesis;
  const threshold = DEFAULT_FRED_CONFIG.autoDecideThreshold;

  // If clarification is needed, return clarify
  if (input.clarificationNeeded.some((c) => c.required)) {
    return "clarify";
  }

  // Simple questions can be auto-responded
  if (input.intent === "question" && confidence >= 0.8) {
    return "auto_execute";
  }

  // Greetings are always auto-responded
  if (input.intent === "greeting") {
    return "auto_execute";
  }

  // Information acknowledgment
  if (input.intent === "information" && confidence >= 0.7) {
    return "auto_execute";
  }

  // Decision requests need more careful handling
  if (input.intent === "decision_request") {
    // Check if this is a high-stakes decision
    const isHighStakes = checkHighStakes(synthesis, input);

    if (isHighStakes) {
      // High stakes always escalate
      return "escalate";
    }

    // Check reversibility
    const isReversible = checkReversibility(input);

    // High confidence + reversible + good score = auto-execute
    if (
      confidence >= threshold &&
      isReversible &&
      factors.composite >= 70 &&
      factors.risk >= 0.6 // Low risk (inverted scale)
    ) {
      return "auto_execute";
    }

    // Medium confidence or medium score = recommend
    if (confidence >= 0.65 && factors.composite >= 50) {
      return "recommend";
    }

    // Low confidence or concerning scores = escalate
    return "escalate";
  }

  // Feedback is acknowledged
  if (input.intent === "feedback") {
    return "auto_execute";
  }

  // Unknown intent = escalate for safety
  if (input.intent === "unknown") {
    return "clarify";
  }

  // Default to recommend
  return "recommend";
}

/**
 * Check if this is a high-stakes decision that should always be escalated
 */
function checkHighStakes(
  synthesis: SynthesisResult,
  input: ValidatedInput
): boolean {
  // High financial stakes
  const hasLargeMoney = input.entities.some(
    (e) =>
      e.type === "money" &&
      (e.value.toLowerCase().includes("million") ||
        e.value.toLowerCase().includes("billion") ||
        parseMoneyValue(e.value) > 100000)
  );
  if (hasLargeMoney) return true;

  // High impact risks identified
  const highImpactRisks = synthesis.risks.filter((r) => r.impact >= 0.7);
  if (highImpactRisks.length >= 2) return true;

  // Irreversible keywords detected
  const irreversibleKeywords = [
    "fire",
    "terminate",
    "quit",
    "resign",
    "sue",
    "legal",
    "lawsuit",
    "contract",
    "sign",
    "commit",
    "acquire",
    "merger",
    "shutdown",
    "close",
  ];
  const hasIrreversible = input.keywords.some((k) =>
    irreversibleKeywords.includes(k.toLowerCase())
  );
  if (hasIrreversible) return true;

  // Very low risk score (high risk)
  if (synthesis.factors.risk < 0.3) return true;

  return false;
}

/**
 * Check if the decision is reversible
 */
function checkReversibility(input: ValidatedInput): boolean {
  const irreversibleKeywords = [
    "permanent",
    "forever",
    "final",
    "irreversible",
    "fire",
    "terminate",
    "shut down",
    "close",
    "sign",
    "commit",
    "announce",
  ];

  return !input.keywords.some((k) =>
    irreversibleKeywords.includes(k.toLowerCase())
  );
}

/**
 * Parse money value from string
 */
function parseMoneyValue(value: string): number {
  const cleaned = value.replace(/[$,]/g, "").toLowerCase();

  if (cleaned.includes("million") || cleaned.includes("m")) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
    return num * 1000000;
  }

  if (cleaned.includes("billion") || cleaned.includes("b")) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
    return num * 1000000000;
  }

  if (cleaned.includes("k")) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
    return num * 1000;
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Check if human approval is required
 */
function checkRequiresHumanApproval(
  action: DecisionAction,
  synthesis: SynthesisResult,
  input: ValidatedInput
): boolean {
  // Clarify always needs human input
  if (action === "clarify") return true;

  // Escalate always needs human decision
  if (action === "escalate") return true;

  // Recommend awaits approval
  if (action === "recommend") return true;

  // Auto-execute doesn't need approval
  if (action === "auto_execute") return false;

  // Default to requiring approval
  return true;
}

/**
 * Build the response content based on action
 */
function buildResponseContent(
  action: DecisionAction,
  synthesis: SynthesisResult,
  input: ValidatedInput
): string {
  switch (action) {
    case "auto_execute":
      return synthesis.recommendation;

    case "recommend":
      const nextStepsText = synthesis.nextSteps.slice(0, 2).join("\n- ");
      return `Here's my take, based on what I've seen across ${FRED_BIO.companiesFounded}+ companies:\n\n${synthesis.recommendation}\n\n**Next Steps:**\n- ${nextStepsText}\n\n*Confidence: ${Math.round(synthesis.confidence * 100)}%*`;

    case "escalate":
      const risksText = synthesis.risks
        .slice(0, 2)
        .map((r) => r.description)
        .join("\n- ");
      const alternativesText = synthesis.alternatives
        .slice(0, 2)
        .map((a) => `${a.description} (Score: ${a.score})`)
        .join("\n- ");
      return `**Let me be straight with you -- this is a big one.**\n\n${synthesis.recommendation}\n\nIn my ${FRED_BIO.yearsExperience}+ years, I've seen decisions like this go sideways when founders rush. Here's what you need to weigh:\n\n**Key Risks:**\n- ${risksText}\n\n**Alternatives Worth Considering:**\n- ${alternativesText}\n\n**My Assessment:** Score ${synthesis.factors.composite}/100 | Confidence ${Math.round(synthesis.confidence * 100)}%\n\n*This is your call. I'm giving you the data -- you make the decision.*`;

    case "clarify":
      const questions = synthesis.followUpQuestions.slice(0, 2);
      const clarifications = input.clarificationNeeded.filter((c) => c.required);
      const allQuestions = [
        ...clarifications.map((c) => c.question),
        ...questions,
      ].slice(0, 3);
      return `I want to give you a solid answer, but I need a few more details first:\n\n${allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;

    case "defer":
      return "I don't have enough context to give you useful advice right now. Let's come back to this when we have more to work with.";

    default:
      return synthesis.recommendation;
  }
}

/**
 * Build reasoning for why this action was chosen
 */
function buildDecisionReasoning(
  action: DecisionAction,
  synthesis: SynthesisResult,
  input: ValidatedInput
): string {
  const parts: string[] = [];

  parts.push(`Intent: ${input.intent}`);
  parts.push(`Confidence: ${Math.round(synthesis.confidence * 100)}%`);
  parts.push(`Composite Score: ${synthesis.factors.composite}/100`);

  switch (action) {
    case "auto_execute":
      parts.push(
        "Auto-executing because: high confidence, acceptable risk, and appropriate scope."
      );
      break;
    case "recommend":
      parts.push(
        "Recommending with approval because: moderate confidence or impact requires human judgment."
      );
      break;
    case "escalate":
      parts.push(
        "Escalating because: significant stakes, multiple risks, or low confidence."
      );
      break;
    case "clarify":
      parts.push(
        "Requesting clarification because: missing required information."
      );
      break;
  }

  return parts.join(" | ");
}

/**
 * Determine which procedure was used
 */
function determineProcedureUsed(input: ValidatedInput): string {
  switch (input.intent) {
    case "decision_request":
      return "seven_factor_scoring";
    case "question":
      return "analysis_framework";
    default:
      return "analysis_framework";
  }
}
