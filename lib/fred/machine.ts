/**
 * FRED State Machine Definition
 *
 * The core decision engine implemented as an XState v5 state machine.
 * Flow: IDLE → INTAKE → VALIDATION → MENTAL_MODELS → SYNTHESIS → DECIDE → EXECUTE/HUMAN_REVIEW
 */

import { setup, assign, fromPromise } from "xstate";
import type {
  FredContext,
  FredEvent,
  FredError,
  UserInput,
  ValidatedInput,
  MentalModelResult,
  SynthesisResult,
  DecisionResult,
  MemoryContext,
  FredConfig,
  ConversationStateContext,
} from "./types";

// ============================================================================
// Actor Imports (async functions for each state)
// ============================================================================

import { validateInputActor } from "./actors/validate-input";
import { loadMemoryActor } from "./actors/load-memory";
import { applyMentalModelsActor } from "./actors/mental-models";
import { synthesizeActor } from "./actors/synthesize";
import { decideActor } from "./actors/decide";
import { executeActor } from "./actors/execute";
import { logger } from "@/lib/logger";

// ============================================================================
// Initial Context
// ============================================================================

function createInitialContext(
  userId: string,
  sessionId: string,
  founderContext?: string,
  conversationState?: ConversationStateContext | null,
  chatMode?: boolean
): FredContext {
  return {
    sessionId,
    userId,
    input: null,
    validatedInput: null,
    mentalModels: [],
    synthesis: null,
    decision: null,
    scores: null,
    error: null,
    retryCount: 0,
    startedAt: null,
    completedAt: null,
    memoryContext: null,
    founderContext: founderContext || null,
    conversationState: conversationState || null,
    chatMode: chatMode ?? true,
  };
}

// ============================================================================
// State Machine Definition
// ============================================================================

export const fredMachine = setup({
  types: {
    context: {} as FredContext,
    events: {} as FredEvent,
    input: {} as { userId: string; sessionId: string; config?: Partial<FredConfig>; founderContext?: string; conversationState?: ConversationStateContext | null; chatMode?: boolean },
  },

  actors: {
    loadMemory: fromPromise<MemoryContext, { userId: string; sessionId: string }>(
      async ({ input }) => loadMemoryActor(input.userId, input.sessionId)
    ),

    validateInput: fromPromise<ValidatedInput, { input: UserInput; memoryContext: MemoryContext | null; conversationState: ConversationStateContext | null }>(
      async ({ input }) => validateInputActor(input.input, input.memoryContext, input.conversationState)
    ),

    applyMentalModels: fromPromise<MentalModelResult[], { validatedInput: ValidatedInput; memoryContext: MemoryContext | null }>(
      async ({ input }) => applyMentalModelsActor(input.validatedInput, input.memoryContext)
    ),

    synthesize: fromPromise<SynthesisResult, { validatedInput: ValidatedInput; mentalModels: MentalModelResult[]; memoryContext: MemoryContext | null; conversationState: ConversationStateContext | null }>(
      async ({ input }) => synthesizeActor(input.validatedInput, input.mentalModels, input.memoryContext, input.conversationState)
    ),

    decide: fromPromise<DecisionResult, { synthesis: SynthesisResult; validatedInput: ValidatedInput; founderContext: string | null; conversationState: ConversationStateContext | null }>(
      async ({ input }) => decideActor(input.synthesis, input.validatedInput, input.founderContext, input.conversationState)
    ),

    execute: fromPromise<void, { decision: DecisionResult; validatedInput: ValidatedInput; userId: string; sessionId: string; conversationState: ConversationStateContext | null }>(
      async ({ input }) => {
        await executeActor(input.decision, input.validatedInput, input.userId, input.sessionId, input.conversationState);
      }
    ),
  },

  guards: {
    /**
     * Can FRED auto-decide without human approval?
     * In chatMode (default), always auto-decide — the chat UI has no
     * approval mechanism, so entering human_review would deadlock.
     * For non-chat flows, require high confidence + auto_execute action.
     */
    canAutoDecide: ({ context, event }) => {
      // Chat mode: always auto-decide (no approval UI exists)
      if (context.chatMode) return true;

      // Non-chat mode: require explicit auto_execute action
      const decision = (event as any)?.output || context.decision;
      if (!decision) return false;
      return (
        !decision.requiresHumanApproval &&
        decision.action === "auto_execute"
      );
    },

    /**
     * Does the input need clarification before proceeding?
     */
    needsClarification: ({ context }) => {
      if (!context.validatedInput) return false;
      return (
        context.validatedInput.clarificationNeeded.filter((c) => c.required).length > 0
      );
    },

    /**
     * Can we retry after an error?
     */
    canRetry: ({ context }) => context.retryCount < 3,

    /**
     * Is this a simple question that doesn't need full analysis?
     */
    isSimpleQuestion: ({ context }) => {
      if (!context.validatedInput) return false;
      return (
        context.validatedInput.intent === "question" &&
        context.validatedInput.confidence >= 0.9
      );
    },

    /**
     * Does the decision require escalation?
     */
    requiresEscalation: ({ context }) => {
      if (!context.decision) return false;
      return context.decision.action === "escalate";
    },
  },

  actions: {
    /**
     * Log state transition for observability
     */
    logTransition: ({ context, event }) => {
      logger.log(
        `[FRED] Transition | Session: ${context.sessionId} | Event: ${event.type} | Retry: ${context.retryCount}`
      );
    },

    /**
     * Set the start timestamp
     */
    setStartTime: assign({
      startedAt: () => new Date(),
    }),

    /**
     * Set the completion timestamp
     */
    setCompleteTime: assign({
      completedAt: () => new Date(),
    }),

    /**
     * Store input from START event
     */
    storeInput: assign({
      input: ({ event }) => {
        if (event.type === "START") {
          return event.input;
        }
        return null;
      },
    }),

    /**
     * Store memory context
     */
    storeMemoryContext: assign({
      memoryContext: ({ event }) => {
        if (event.type === "MEMORY_LOADED") {
          return event.context;
        }
        return null;
      },
    }),

    /**
     * Store validated input
     */
    storeValidatedInput: assign({
      validatedInput: ({ event }) => {
        if (event.type === "VALIDATE_COMPLETE") {
          return event.result;
        }
        return null;
      },
    }),

    /**
     * Store mental model results
     */
    storeMentalModels: assign({
      mentalModels: ({ event }) => {
        if (event.type === "MODELS_COMPLETE") {
          return event.results;
        }
        return [];
      },
    }),

    /**
     * Store synthesis result
     */
    storeSynthesis: assign({
      synthesis: ({ event }) => {
        if (event.type === "SYNTHESIS_COMPLETE") {
          return event.result;
        }
        return null;
      },
      scores: ({ event }) => {
        if (event.type === "SYNTHESIS_COMPLETE") {
          return event.result.factors;
        }
        return null;
      },
    }),

    /**
     * Store decision result
     */
    storeDecision: assign({
      decision: ({ event }) => {
        if (event.type === "DECISION_COMPLETE") {
          return event.result;
        }
        return null;
      },
    }),

    /**
     * Store error
     */
    storeError: assign({
      error: ({ event }): FredError | null => {
        if (event.type === "ERROR") {
          return event.error;
        }
        return null;
      },
    }),

    /**
     * Increment retry count
     */
    incrementRetry: assign({
      retryCount: ({ context }) => context.retryCount + 1,
    }),

    /**
     * Clear error on retry
     */
    clearError: assign({
      error: () => null,
    }),

    /**
     * Incorporate human feedback on rejection
     */
    incorporateFeedback: assign({
      input: ({ context, event }) => {
        if (event.type === "HUMAN_REJECTED" && context.input) {
          return {
            ...context.input,
            context: {
              ...context.input.context,
              humanFeedback: event.feedback,
              previousRecommendation: context.synthesis?.recommendation,
            },
          };
        }
        return context.input;
      },
    }),
  },
}).createMachine({
  id: "fred",
  initial: "idle",
  context: ({ input }) => createInitialContext(input.userId, input.sessionId, input.founderContext, input.conversationState, input.chatMode),

  states: {
    /**
     * Idle - Waiting for input
     */
    idle: {
      on: {
        START: {
          target: "loading_memory",
          actions: ["logTransition", "setStartTime", "storeInput"],
        },
        USER_INPUT: {
          target: "loading_memory",
          actions: [
            "logTransition",
            "setStartTime",
            assign({ input: ({ event }) => (event as any).input }),
          ],
        },
        ERROR: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }) => (event as any).error,
            }),
          ],
        },
      },
    },

    /**
     * Loading Memory - Load user context from memory
     */
    loading_memory: {
      on: {
        CANCEL: {
          target: "complete",
          actions: "logTransition",
        },
      },
      invoke: {
        src: "loadMemory",
        input: ({ context }) => ({
          userId: context.userId,
          sessionId: context.sessionId,
        }),
        onDone: {
          target: "intake",
          actions: [
            "logTransition",
            assign({ memoryContext: ({ event }) => event.output }),
          ],
        },
        onError: {
          // Memory loading is non-critical, continue without it
          target: "intake",
          actions: [
            "logTransition",
            assign({ memoryContext: () => null }),
          ],
        },
      },
    },

    /**
     * Intake - Validate and parse user input
     */
    intake: {
      invoke: {
        src: "validateInput",
        input: ({ context }) => ({
          input: context.input!,
          memoryContext: context.memoryContext,
          conversationState: context.conversationState,
        }),
        onDone: {
          target: "validation",
          actions: [
            "logTransition",
            assign({ validatedInput: ({ event }) => event.output }),
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }): FredError => ({
                code: "VALIDATION_FAILED",
                message: event.error instanceof Error ? event.error.message : "Validation failed",
                state: "intake",
                cause: event.error instanceof Error ? event.error : undefined,
                retryable: true,
                timestamp: new Date(),
              }),
            }),
          ],
        },
      },
    },

    /**
     * Validation - Check if clarification needed
     */
    validation: {
      always: [
        {
          guard: "needsClarification",
          target: "clarification",
          actions: "logTransition",
        },
        {
          target: "mental_models",
          actions: "logTransition",
        },
      ],
    },

    /**
     * Clarification - Wait for user to provide more info
     */
    clarification: {
      on: {
        CLARIFICATION_PROVIDED: {
          target: "intake",
          actions: [
            "logTransition",
            assign({
              input: ({ event }) => event.input,
              retryCount: () => 0, // Reset retry on new input
            }),
          ],
        },
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Mental Models - Apply relevant mental models to analyze the situation
     */
    mental_models: {
      invoke: {
        src: "applyMentalModels",
        input: ({ context }) => ({
          validatedInput: context.validatedInput!,
          memoryContext: context.memoryContext,
        }),
        onDone: {
          target: "synthesis",
          actions: [
            "logTransition",
            assign({ mentalModels: ({ event }) => event.output }),
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }): FredError => ({
                code: "MENTAL_MODEL_FAILED",
                message: event.error instanceof Error ? event.error.message : "Mental model analysis failed",
                state: "mental_models",
                cause: event.error instanceof Error ? event.error : undefined,
                retryable: true,
                timestamp: new Date(),
              }),
            }),
          ],
        },
      },
    },

    /**
     * Synthesis - Synthesize insights into a recommendation
     */
    synthesis: {
      invoke: {
        src: "synthesize",
        input: ({ context }) => ({
          validatedInput: context.validatedInput!,
          mentalModels: context.mentalModels,
          memoryContext: context.memoryContext,
          conversationState: context.conversationState,
        }),
        onDone: {
          target: "decide",
          actions: [
            "logTransition",
            assign({
              synthesis: ({ event }) => event.output,
              scores: ({ event }) => event.output.factors,
            }),
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }): FredError => ({
                code: "SYNTHESIS_FAILED",
                message: event.error instanceof Error ? event.error.message : "Synthesis failed",
                state: "synthesis",
                cause: event.error instanceof Error ? event.error : undefined,
                retryable: true,
                timestamp: new Date(),
              }),
            }),
          ],
        },
      },
    },

    /**
     * Decide - Determine action: auto-execute, recommend, or escalate
     */
    decide: {
      invoke: {
        src: "decide",
        input: ({ context }) => ({
          synthesis: context.synthesis!,
          validatedInput: context.validatedInput!,
          founderContext: context.founderContext,
          conversationState: context.conversationState,
        }),
        onDone: [
          {
            guard: "canAutoDecide",
            target: "execute",
            actions: [
              "logTransition",
              assign({ decision: ({ event }) => event.output }),
            ],
          },
          {
            target: "human_review",
            actions: [
              "logTransition",
              assign({ decision: ({ event }) => event.output }),
            ],
          },
        ],
        onError: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }): FredError => ({
                code: "DECISION_FAILED",
                message: event.error instanceof Error ? event.error.message : "Decision failed",
                state: "decide",
                cause: event.error instanceof Error ? event.error : undefined,
                retryable: true,
                timestamp: new Date(),
              }),
            }),
          ],
        },
      },
    },

    /**
     * Human Review - Wait for human approval
     */
    human_review: {
      on: {
        HUMAN_APPROVED: {
          target: "execute",
          actions: "logTransition",
        },
        HUMAN_REJECTED: {
          target: "synthesis",
          actions: ["logTransition", "incorporateFeedback"],
        },
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Execute - Execute the decision (store to memory, trigger actions)
     */
    execute: {
      invoke: {
        src: "execute",
        input: ({ context }) => ({
          decision: context.decision!,
          validatedInput: context.validatedInput!,
          userId: context.userId,
          sessionId: context.sessionId,
          conversationState: context.conversationState,
        }),
        onDone: {
          target: "complete",
          actions: ["logTransition", "setCompleteTime"],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: ({ event }): FredError => ({
                code: "EXECUTION_FAILED",
                message: event.error instanceof Error ? event.error.message : "Execution failed",
                state: "execute",
                cause: event.error instanceof Error ? event.error : undefined,
                retryable: false,
                timestamp: new Date(),
              }),
            }),
          ],
        },
      },
    },

    /**
     * Complete - Final success state
     */
    complete: {
      type: "final",
      entry: ["logTransition"],
    },

    /**
     * Error - Recoverable error state
     */
    error: {
      on: {
        RETRY: [
          {
            guard: "canRetry",
            target: "intake",
            actions: ["logTransition", "incrementRetry", "clearError"],
          },
          {
            target: "failed",
            actions: "logTransition",
          },
        ],
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Failed - Final failure state
     */
    failed: {
      type: "final",
      entry: ["logTransition", "setCompleteTime"],
    },
  },
});

export type FredMachine = typeof fredMachine;
