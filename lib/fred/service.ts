/**
 * FRED Service
 *
 * Main service for interacting with FRED's cognitive engine.
 * Uses XState v5 for deterministic state management.
 */

import { createActor, waitFor } from "xstate";
import { fredMachine } from "./machine";
import type { FredContext, FredResponse, UserInput, ConversationStateContext } from "./types";
import { FredObservability } from "./observability";

export interface FredServiceOptions {
  userId: string;
  sessionId: string;
  enableObservability?: boolean;
  /** Dynamic founder context string for prompt personalization (Phase 34) */
  founderContext?: string;
  /** Conversation state for structured flow (Phase 36) */
  conversationState?: ConversationStateContext | null;
  /** Pre-loaded semantic facts to avoid duplicate getAllUserFacts DB call */
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>;
  onStateChange?: (state: string, context: FredContext) => void;
  onError?: (error: Error) => void;
}

export interface ProcessResult {
  response: FredResponse;
  finalState: string;
  context: FredContext;
  duration: number;
}

/**
 * FRED Service class for processing user inputs
 */
export class FredService {
  private options: FredServiceOptions;
  private observability: FredObservability | null = null;

  constructor(options: FredServiceOptions) {
    this.options = {
      enableObservability: true,
      ...options,
    };

    if (this.options.enableObservability) {
      this.observability = new FredObservability(options.sessionId);
    }
  }

  /**
   * Process a user input through FRED's cognitive pipeline
   */
  async process(input: UserInput): Promise<ProcessResult> {
    const startTime = Date.now();

    // Create a new actor for this input
    const actor = createActor(fredMachine, {
      input: {
        userId: this.options.userId,
        sessionId: this.options.sessionId,
        founderContext: this.options.founderContext,
        conversationState: this.options.conversationState || null,
        preloadedFacts: this.options.preloadedFacts,
        chatMode: true,
      },
    });

    // Set up state change listener
    if (this.options.onStateChange) {
      actor.subscribe((snapshot) => {
        const stateValue = typeof snapshot.value === "string"
          ? snapshot.value
          : JSON.stringify(snapshot.value);
        this.options.onStateChange?.(stateValue, snapshot.context);
      });
    }

    // Set up observability
    if (this.observability) {
      this.observability.attachToActor(actor);
    }

    try {
      // Start the actor
      actor.start();

      // Send the input event
      actor.send({ type: "USER_INPUT", input });

      // Wait for the actor to reach a final state
      const snapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("failed") ||
          state.matches("error"),
        { timeout: 60000 } // 60 second timeout
      );

      const duration = Date.now() - startTime;

      // Extract the response
      const response = this.extractResponse(snapshot.context);

      // Log completion
      this.observability?.logCompletion(response, duration);

      return {
        response,
        finalState: typeof snapshot.value === "string"
          ? snapshot.value
          : JSON.stringify(snapshot.value),
        context: snapshot.context,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Log error
      this.observability?.logError(err, duration);
      this.options.onError?.(err);

      // Return error response
      return {
        response: this.createErrorResponse(err),
        finalState: "error",
        context: {
          userId: this.options.userId,
          sessionId: this.options.sessionId,
          input: null,
          validatedInput: null,
          memoryContext: null,
          mentalModels: [],
          synthesis: null,
          decision: null,
          scores: null,
          startedAt: null,
          completedAt: null,
          error: {
            code: "UNKNOWN_ERROR",
            message: err.message,
            state: "unknown",
            timestamp: new Date(),
            retryable: false,
          },
          retryCount: 0,
          founderContext: this.options.founderContext || null,
          conversationState: this.options.conversationState || null,
          chatMode: true,
        },
        duration,
      };
    } finally {
      actor.stop();
    }
  }

  /**
   * Process input with streaming updates
   */
  async *processStream(input: UserInput): AsyncGenerator<{
    state: string;
    context: FredContext;
    isComplete: boolean;
  }> {
    const actor = createActor(fredMachine, {
      input: {
        userId: this.options.userId,
        sessionId: this.options.sessionId,
        founderContext: this.options.founderContext,
        conversationState: this.options.conversationState || null,
        preloadedFacts: this.options.preloadedFacts,
        chatMode: true,
      },
    });

    let isComplete = false;
    const streamTimeout = 60_000; // 60s safety net — no chat message should take this long
    const streamStart = Date.now();

    // Event-driven state change notification to avoid polling latency
    let resolveStateChange: (() => void) | null = null;

    // Create a promise that resolves when complete
    const completionPromise = new Promise<void>((resolve) => {
      actor.subscribe((snapshot) => {
        // Notify the polling loop immediately on any state change
        resolveStateChange?.();
        resolveStateChange = null;

        if (
          snapshot.matches("complete") ||
          snapshot.matches("failed") ||
          snapshot.matches("error")
        ) {
          isComplete = true;
          resolve();
        }
      });
    });

    try {
      actor.start();
      actor.send({ type: "USER_INPUT", input });

      // Yield state updates until complete or timeout
      while (!isComplete) {
        // Safety net: abort if stream exceeds timeout
        if (Date.now() - streamStart > streamTimeout) {
          console.error("[FRED] processStream timeout — aborting after", streamTimeout, "ms");
          break;
        }

        const snapshot = actor.getSnapshot();
        const stateValue = typeof snapshot.value === "string"
          ? snapshot.value
          : JSON.stringify(snapshot.value);

        yield {
          state: stateValue,
          context: snapshot.context,
          isComplete: false,
        };

        // Wait for state change event, completion, or safety fallback timeout
        await Promise.race([
          completionPromise,
          new Promise<void>((resolve) => {
            resolveStateChange = resolve;
          }),
          new Promise((resolve) => setTimeout(resolve, 50)), // safety fallback
        ]);
      }

      // Yield final state
      const finalSnapshot = actor.getSnapshot();
      const finalStateValue = typeof finalSnapshot.value === "string"
        ? finalSnapshot.value
        : JSON.stringify(finalSnapshot.value);

      yield {
        state: finalStateValue,
        context: finalSnapshot.context,
        isComplete: true,
      };
    } finally {
      actor.stop();
    }
  }

  /**
   * Handle human approval response
   */
  async handleApproval(
    context: FredContext,
    approved: boolean,
    feedback?: string
  ): Promise<ProcessResult> {
    const startTime = Date.now();

    // For now, we'll create a new actor and fast-forward to human_review state
    // In a production system, this would resume the existing actor
    const actor = createActor(fredMachine, {
      input: {
        userId: this.options.userId,
        sessionId: this.options.sessionId,
        founderContext: this.options.founderContext,
        conversationState: this.options.conversationState || null,
      },
    });

    try {
      actor.start();

      // Reconstruct the state by setting context
      // Note: In production, we'd persist and restore actor state
      const snapshot = actor.getSnapshot();

      if (approved) {
        actor.send({ type: "HUMAN_APPROVED" });
      } else {
        actor.send({ type: "HUMAN_REJECTED" });
      }

      const finalSnapshot = await waitFor(
        actor,
        (state) =>
          state.matches("complete") ||
          state.matches("failed"),
        { timeout: 30000 }
      );

      const duration = Date.now() - startTime;
      const response = this.extractResponse(finalSnapshot.context);

      return {
        response,
        finalState: typeof finalSnapshot.value === "string"
          ? finalSnapshot.value
          : JSON.stringify(finalSnapshot.value),
        context: finalSnapshot.context,
        duration,
      };
    } finally {
      actor.stop();
    }
  }

  /**
   * Extract response from context
   */
  private extractResponse(context: FredContext): FredResponse {
    if (context.decision) {
      return {
        content: context.decision.content,
        action: context.decision.action,
        confidence: context.decision.confidence,
        requiresApproval: context.decision.requiresHumanApproval,
        reasoning: context.decision.reasoning,
        metadata: context.decision.metadata,
      };
    }

    if (context.error) {
      return this.createErrorResponse(new Error(context.error.message));
    }

    return {
      content: "I wasn't able to process that request. Please try again.",
      action: "defer",
      confidence: 0,
      requiresApproval: false,
      metadata: {},
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: Error): FredResponse {
    return {
      content: "I encountered an issue processing your request. Please try again or rephrase your question.",
      action: "defer",
      confidence: 0,
      requiresApproval: false,
      reasoning: `Error: ${error.message}`,
      metadata: {
        error: true,
        errorMessage: error.message,
      },
    };
  }

  /**
   * Get observability metrics
   */
  getMetrics() {
    return this.observability?.getMetrics() || null;
  }
}

/**
 * Create a FRED service instance
 */
export function createFredService(options: FredServiceOptions): FredService {
  return new FredService(options);
}

/**
 * Quick helper for one-off processing
 */
export async function processWithFred(
  userId: string,
  sessionId: string,
  message: string
): Promise<FredResponse> {
  const service = createFredService({ userId, sessionId });
  const result = await service.process({ message, timestamp: new Date() });
  return result.response;
}
