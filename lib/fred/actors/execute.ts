/**
 * Execute Actor
 *
 * Executes the decided action and generates the final response.
 * Handles auto-execute, recommend, escalate, and clarify actions.
 */

import type { DecisionResult, ValidatedInput, FredResponse } from "../types";
import { logger } from "@/lib/logger";

/**
 * Execute the decision and generate the response
 */
export async function executeActor(
  decision: DecisionResult,
  validatedInput: ValidatedInput,
  userId: string,
  sessionId: string
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
