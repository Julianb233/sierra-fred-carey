/**
 * Execute Actor
 *
 * Executes the decided action and generates the final response.
 * Handles auto-execute, recommend, escalate, and clarify actions.
 */

import type { DecisionResult, ValidatedInput, FredResponse, ConversationStateContext } from "../types";
import { logger } from "@/lib/logger";

/**
 * Execute the decision and generate the response
 */
export async function executeActor(
  decision: DecisionResult,
  validatedInput: ValidatedInput,
  userId: string,
  sessionId: string,
  conversationState?: ConversationStateContext | null
): Promise<FredResponse> {
  logger.log(
    "[FRED] Executing action:",
    decision.action,
    "| Requires approval:",
    decision.requiresHumanApproval
  );

  // Log the decision to memory
  await logDecisionToMemory(decision, validatedInput, userId, sessionId);

  // Build the response based on action type
  const response = buildResponse(decision, validatedInput);

  // Add metadata
  response.metadata = {
    ...response.metadata,
    sessionId,
    procedureUsed: decision.procedureUsed,
    factorScores: decision.metadata?.factorScores,
  };

  // Phase 36: Post-response conversation state updates (fire-and-forget)
  updateConversationState(userId, validatedInput, decision, conversationState || null)
    .catch((err) => console.warn("[FRED Execute] State update failed:", err));

  return response;
}

/**
 * Log the decision to FRED's memory
 */
async function logDecisionToMemory(
  decision: DecisionResult,
  input: ValidatedInput,
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const { logDecision, storeEpisode } = await import("@/lib/db/fred-memory");

    // Map decision action to decision type
    const decisionTypeMap: Record<string, "auto" | "recommended" | "escalated"> = {
      auto_execute: "auto",
      recommend: "recommended",
      escalate: "escalated",
      clarify: "recommended",
      defer: "recommended",
    };

    // Log the decision
    await logDecision(userId, sessionId, {
      decisionType: decisionTypeMap[decision.action] || "recommended",
      inputContext: {
        message: input.originalMessage.substring(0, 500),
        intent: input.intent,
        urgency: input.urgency,
        sentiment: input.sentiment,
      },
      recommendation: {
        action: decision.action,
        content: decision.content,
        reasoning: decision.reasoning,
      },
      scores: decision.metadata?.factorScores as Record<string, number> | undefined,
      procedureUsed: decision.procedureUsed,
      confidence: decision.confidence,
    });

    // Store as episodic memory
    // Map our action to valid event types: "conversation" | "decision" | "outcome" | "feedback"
    const eventType = decision.action === "auto_execute" ? "conversation" as const : "decision" as const;

    await storeEpisode(
      userId,
      sessionId,
      eventType,
      {
        input: input.originalMessage,
        action: decision.action,
        response: decision.content,
        confidence: decision.confidence,
        sentiment: input.sentiment,
      },
      {
        importanceScore: decision.action === "escalate" ? 0.9 : decision.action === "recommend" ? 0.7 : 0.5,
        metadata: {
          intent: input.intent,
          urgency: input.urgency,
        },
      }
    );
  } catch (error) {
    // Memory logging is non-critical, don't fail the response
    console.error("[FRED] Error logging decision to memory:", error);
  }
}

/**
 * Build the response based on decision type
 */
function buildResponse(
  decision: DecisionResult,
  input: ValidatedInput
): FredResponse {
  const baseResponse: FredResponse = {
    content: decision.content,
    action: decision.action,
    confidence: decision.confidence,
    requiresApproval: decision.requiresHumanApproval,
    reasoning: decision.reasoning,
    metadata: {},
  };

  switch (decision.action) {
    case "auto_execute":
      return buildAutoExecuteResponse(baseResponse, decision, input);

    case "recommend":
      return buildRecommendResponse(baseResponse, decision);

    case "escalate":
      return buildEscalateResponse(baseResponse, decision);

    case "clarify":
      return buildClarifyResponse(baseResponse, decision);

    case "defer":
      return buildDeferResponse(baseResponse, decision);

    default:
      return baseResponse;
  }
}

/**
 * Build response for auto-execute action
 */
function buildAutoExecuteResponse(
  base: FredResponse,
  decision: DecisionResult,
  input: ValidatedInput
): FredResponse {
  // For greetings, keep it simple
  if (input.intent === "greeting") {
    return {
      ...base,
      content: generateGreetingResponse(),
    };
  }

  // For questions and information, provide the analysis
  if (input.intent === "question" || input.intent === "information") {
    return {
      ...base,
      content: decision.content,
      metadata: {
        ...base.metadata,
        responseType: "analysis",
      },
    };
  }

  // For feedback, acknowledge
  if (input.intent === "feedback") {
    return {
      ...base,
      content: generateFeedbackAcknowledgment(input),
    };
  }

  return base;
}

/**
 * Build response for recommend action
 */
function buildRecommendResponse(
  base: FredResponse,
  decision: DecisionResult
): FredResponse {
  return {
    ...base,
    approvalOptions: [
      {
        label: "Proceed with recommendation",
        value: "approve",
        description: "Execute the recommended action",
      },
      {
        label: "Request alternatives",
        value: "alternatives",
        description: "Show other options I've considered",
      },
      {
        label: "Decline",
        value: "decline",
        description: "Don't proceed with this recommendation",
      },
    ],
    metadata: {
      ...base.metadata,
      responseType: "recommendation",
      alternativesCount: decision.metadata?.alternativesCount || 0,
    },
  };
}

/**
 * Build response for escalate action
 */
function buildEscalateResponse(
  base: FredResponse,
  decision: DecisionResult
): FredResponse {
  return {
    ...base,
    approvalOptions: [
      {
        label: "Proceed anyway",
        value: "proceed",
        description: "I understand the risks and want to proceed",
      },
      {
        label: "Review risks in detail",
        value: "review_risks",
        description: "Show me more about the potential risks",
      },
      {
        label: "Explore alternatives",
        value: "alternatives",
        description: "What other options do I have?",
      },
      {
        label: "Defer decision",
        value: "defer",
        description: "I need more time to think about this",
      },
    ],
    metadata: {
      ...base.metadata,
      responseType: "escalation",
      risksCount: decision.metadata?.risksCount || 0,
    },
  };
}

/**
 * Build response for clarify action
 */
function buildClarifyResponse(
  base: FredResponse,
  decision: DecisionResult
): FredResponse {
  return {
    ...base,
    requiresApproval: false, // Clarification is more of a question than needing approval
    metadata: {
      ...base.metadata,
      responseType: "clarification",
      awaitingInput: true,
    },
  };
}

/**
 * Build response for defer action
 */
function buildDeferResponse(
  base: FredResponse,
  decision: DecisionResult
): FredResponse {
  return {
    ...base,
    requiresApproval: false,
    metadata: {
      ...base.metadata,
      responseType: "deferred",
    },
  };
}

/**
 * Generate a greeting response
 */
function generateGreetingResponse(): string {
  const greetings = [
    "Hey! How can I help you today?",
    "Hello! What's on your mind?",
    "Hi there! Ready to help you think through anything.",
    "Hey! What would you like to work on?",
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Generate feedback acknowledgment
 */
function generateFeedbackAcknowledgment(input: ValidatedInput): string {
  if (input.sentiment === "positive") {
    return "Glad that was helpful! Let me know if you need anything else.";
  }

  if (input.sentiment === "negative") {
    return "I hear you. Let me know how I can do better or if you'd like me to approach this differently.";
  }

  return "Got it, thanks for the feedback. What else can I help with?";
}

// ============================================================================
// Phase 36: Post-Response Conversation State Updates
// ============================================================================

/**
 * Post-response conversation state updates.
 * Stores evidence, updates diagnostic tags, and updates founder snapshot.
 * Non-blocking — failures are logged but never thrown.
 */
async function updateConversationState(
  userId: string,
  validatedInput: ValidatedInput,
  decision: DecisionResult,
  conversationState: ConversationStateContext | null
): Promise<void> {
  if (!conversationState) return;

  try {
    const {
      storeStepEvidence,
      updateDiagnosticTags,
      updateFounderSnapshot,
    } = await import("@/lib/db/conversation-state");

    // 1. Store evidence from user statements about the current step
    if (
      validatedInput.stepRelevance?.targetStep === conversationState.currentStep &&
      validatedInput.stepRelevance.confidence > 0.6
    ) {
      await storeStepEvidence(
        userId,
        conversationState.currentStep,
        "user_statement",
        validatedInput.originalMessage.slice(0, 500),
        { source: "conversation", confidence: validatedInput.stepRelevance.confidence }
      );
    }

    // 2. Update diagnostic tags based on conversation signals
    const tagUpdates = extractDiagnosticSignals(validatedInput);
    if (Object.keys(tagUpdates).length > 0) {
      await updateDiagnosticTags(userId, tagUpdates);
    }

    // 3. Update founder snapshot from entities
    const snapshotUpdates = extractSnapshotUpdates(validatedInput);
    if (Object.keys(snapshotUpdates).length > 0) {
      await updateFounderSnapshot(userId, snapshotUpdates);
    }

    // 4. Update Reality Lens dimensions from conversation signals (Phase 37)
    await updateRealityLensDimensions(userId, validatedInput);
  } catch (error) {
    console.warn("[FRED Execute] Failed to update conversation state:", error);
  }
}

/**
 * Extract diagnostic tags from the validated input.
 * Operating Bible Section 5.2: Silent diagnosis during early messages.
 */
function extractDiagnosticSignals(input: ValidatedInput): Record<string, string> {
  const tags: Record<string, string> = {};
  const msg = input.originalMessage.toLowerCase();

  // Positioning clarity signals
  if (/everyone|anybody|all\s+business/i.test(msg)) {
    tags.positioningClarity = "low";
  } else if (input.stepRelevance?.targetStep === "buyer" && input.stepRelevance.confidence > 0.7) {
    tags.positioningClarity = "med";
  }

  // Investor readiness signals
  if (/fundrais|investor|vc|valuation|series\s+[a-c]|term\s+sheet/i.test(msg)) {
    tags.investorReadinessSignal = "med";
  }

  // Stage detection
  if (/\bidea\b|concept|thinking about/i.test(msg)) {
    tags.stage = "idea";
  } else if (/\bmvp\b|prototype|building/i.test(msg)) {
    tags.stage = "pre-seed";
  } else if (/revenue|customers|paying/i.test(msg)) {
    tags.stage = "seed";
  } else if (/series|scale|expand|growing/i.test(msg)) {
    tags.stage = "growth";
  }

  return tags;
}

/**
 * Extract founder snapshot updates from entities.
 */
function extractSnapshotUpdates(input: ValidatedInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  // Extract traction from money entities
  const moneyEntities = input.entities.filter((e) => e.type === "money");
  if (moneyEntities.length > 0) {
    updates.traction = moneyEntities.map((e) => e.value).join(", ");
  }

  return updates;
}

// ============================================================================
// Phase 37: Reality Lens Dimension Updates (Post-Response)
// ============================================================================

/**
 * Extract Reality Lens dimension signals from the conversation.
 * Updates dimension status based on what the founder has shared.
 * Supports both PROMOTION (evidence strengthens dimension) and
 * DEMOTION (contradicting evidence weakens dimension).
 * Fire-and-forget.
 */
async function updateRealityLensDimensions(
  userId: string,
  validatedInput: ValidatedInput
): Promise<void> {
  const {
    updateRealityLensDimension,
    getRealityLensGate,
  } = await import("@/lib/db/conversation-state");

  const msg = validatedInput.originalMessage.toLowerCase();
  const entities = validatedInput.entities;

  // Load current gate state for demotion checks
  const currentGate = await getRealityLensGate(userId);
  if (!currentGate) return;

  // --- Promotion signals (evidence strengthens dimension) ---

  // Demand signals
  if (/\b(customer\w*|user\w*|buyer\w*)\b.*\b(interview|talk|spoke|feedback)\b/.test(msg) ||
      /\b(waitlist|pre-?order|loi|letter\s*of\s*intent)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "demand", "assumed");
  }
  if (/\b(paying|revenue|mrr|arr)\b/.test(msg) && entities.some(e => e.type === "money")) {
    await updateRealityLensDimension(userId, "demand", "validated");
  }

  // Economics signals
  if (/\b(unit\s*economics|margin|cac|ltv|cost\s*per)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "economics", "assumed");
  }
  if (/\b(profitable|positive\s*margin|ltv.*cac|cac.*ltv)\b/.test(msg) && entities.some(e => e.type === "money")) {
    await updateRealityLensDimension(userId, "economics", "validated");
  }

  // Feasibility signals
  if (/\b(built|launched|prototype|mvp|working\s*product|live)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "feasibility", "validated");
  }
  if (/\b(building|developing|coding|designing)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "feasibility", "assumed");
  }

  // Distribution signals
  if (/\b(channel|distribution|go.?to.?market|sales\s*process|acquisition)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "distribution", "assumed");
  }

  // Timing signals
  if (/\b(market\s*(shift|trend|growing)|regulation|technology.*ready|competitor.*just)\b/.test(msg)) {
    await updateRealityLensDimension(userId, "timing", "assumed");
  }

  // --- Demotion signals (contradicting evidence weakens dimension) ---

  // Demand demotion: pivot, lost customers, no customers
  if (/\b(pivot\w*|no\s*(customers?|users?|buyers?)|lost\s*(all|most|our)\s*(customers?|users?)|churn\w*\s*(all|most|100))\b/.test(msg)) {
    const current = currentGate.demand?.status;
    if (current === "validated" || current === "assumed") {
      await updateRealityLensDimension(userId, "demand", "weak",
        ["Founder indicated loss of customers or pivot — demand needs revalidation"]);
    }
  }

  // Feasibility demotion: technical failure, can't build it
  if (/\b(can'?t\s*build|technically\s*(impossible|infeasible)|failed\s*to\s*(build|launch|ship)|scrapped\s*(the\s*)?(product|mvp|prototype))\b/.test(msg)) {
    const current = currentGate.feasibility?.status;
    if (current === "validated" || current === "assumed") {
      await updateRealityLensDimension(userId, "feasibility", "weak",
        ["Founder indicated technical difficulty or product failure — feasibility needs reassessment"]);
    }
  }

  // Economics demotion: burning cash, negative margins
  if (/\b(burn\w*\s*(rate|cash|through)|negative\s*margin|losing\s*money\s*on\s*every|unsustainable\s*(economics|cost))\b/.test(msg)) {
    const current = currentGate.economics?.status;
    if (current === "validated" || current === "assumed") {
      await updateRealityLensDimension(userId, "economics", "weak",
        ["Founder indicated unsustainable economics — needs reassessment"]);
    }
  }

  // Distribution demotion: channel died, lost partnership
  if (/\b(channel\s*(died|stopped|no\s*longer)|lost\s*(our|the)\s*(partner|distribution|channel)|can'?t\s*reach\s*(customers?|buyers?))\b/.test(msg)) {
    const current = currentGate.distribution?.status;
    if (current === "validated" || current === "assumed") {
      await updateRealityLensDimension(userId, "distribution", "weak",
        ["Founder indicated distribution channel loss — needs new path"]);
    }
  }
}
