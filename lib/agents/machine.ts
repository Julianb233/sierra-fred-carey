/**
 * Agent Orchestrator State Machine
 * Phase 04: Studio Tier Features
 *
 * XState v5 state machine that routes dispatched tasks to the correct
 * specialist agent (Founder Ops, Fundraising, or Growth) via guards.
 *
 * Flow: idle -> routing -> executing_{agent} -> complete | error -> failed
 *
 * Pattern follows lib/fred/machine.ts (the FRED decision engine state machine).
 */

import { logger } from "@/lib/logger";
import { setup, assign, fromPromise } from "xstate";
import type {
  AgentTask,
  AgentResult,
  OrchestratorContext,
  OrchestratorEvent,
} from "./types";

// ============================================================================
// Initial Context
// ============================================================================

function createInitialContext(userId: string): OrchestratorContext {
  return {
    userId,
    currentTask: null,
    results: [],
    activeAgents: [],
    error: null,
  };
}

// ============================================================================
// State Machine Definition
// ============================================================================

export const agentOrchestratorMachine = setup({
  types: {
    context: {} as OrchestratorContext,
    events: {} as OrchestratorEvent,
    input: {} as { userId: string },
  },

  actors: {
    /**
     * Founder Ops Agent - handles operational tasks
     * Dynamic import to keep agent code tree-shakable
     */
    founderOpsAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runFounderOpsAgent } = await import("./founder-ops/agent");
        return runFounderOpsAgent(input);
      }
    ),

    /**
     * Fundraising Agent - handles investor outreach and pipeline
     */
    fundraisingAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runFundraisingAgent } = await import("./fundraising/agent");
        return runFundraisingAgent(input);
      }
    ),

    /**
     * Growth Agent - handles analytics and growth experiments
     */
    growthAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runGrowthAgent } = await import("./growth/agent");
        return runGrowthAgent(input);
      }
    ),
  },

  guards: {
    /**
     * Route to Founder Ops agent
     */
    isFounderOpsTask: ({ context }) => {
      return context.currentTask?.agentType === "founder_ops";
    },

    /**
     * Route to Fundraising agent
     */
    isFundraisingTask: ({ context }) => {
      return context.currentTask?.agentType === "fundraising";
    },

    /**
     * Route to Growth agent
     */
    isGrowthTask: ({ context }) => {
      return context.currentTask?.agentType === "growth";
    },
  },

  actions: {
    /**
     * Log state transition for observability
     */
    logTransition: ({ context, event }) => {
      logger.log(
        `[Agent Orchestrator] Transition | User: ${context.userId} | Event: ${event.type} | Task: ${context.currentTask?.id ?? "none"} | Agent: ${context.currentTask?.agentType ?? "none"}`
      );
    },

    /**
     * Store the dispatched task in context
     */
    storeTask: assign({
      currentTask: ({ event }) => {
        if (event.type === "DISPATCH") {
          return event.task;
        }
        return null;
      },
      activeAgents: ({ context, event }) => {
        if (event.type === "DISPATCH") {
          return [...context.activeAgents, event.task.agentType];
        }
        return context.activeAgents;
      },
    }),

    /**
     * Store agent result and clear active agent
     */
    storeResult: assign({
      results: ({ context, event }) => {
        // For onDone transitions, the result is in event.output
        const result = (event as any).output as AgentResult | undefined;
        if (result) {
          return [...context.results, result];
        }
        return context.results;
      },
      activeAgents: ({ context }) => {
        const agentType = context.currentTask?.agentType;
        return context.activeAgents.filter((a) => a !== agentType);
      },
    }),

    /**
     * Store error from agent failure
     */
    storeError: assign({
      error: ({ event }): Error | null => {
        // For onError transitions, the error is in event.error
        const err = (event as any).error;
        if (err instanceof Error) return err;
        if (err) return new Error(String(err));
        return new Error("Unknown agent error");
      },
      activeAgents: ({ context }) => {
        const agentType = context.currentTask?.agentType;
        return context.activeAgents.filter((a) => a !== agentType);
      },
    }),

    /**
     * Store error for unroutable task
     */
    storeRoutingError: assign({
      error: ({ context }): Error => {
        return new Error(
          `Unknown agent type: ${context.currentTask?.agentType ?? "undefined"}`
        );
      },
    }),

    /**
     * Clear current task on completion
     */
    clearTask: assign({
      currentTask: () => null,
    }),
  },
}).createMachine({
  id: "agent-orchestrator",
  initial: "idle",
  context: ({ input }) => createInitialContext(input.userId),

  states: {
    /**
     * Idle - waiting for a task to be dispatched
     */
    idle: {
      on: {
        DISPATCH: {
          target: "routing",
          actions: ["logTransition", "storeTask"],
        },
      },
    },

    /**
     * Routing - determine which specialist agent handles the task
     * Uses guards to inspect context.currentTask.agentType
     */
    routing: {
      always: [
        {
          guard: "isFounderOpsTask",
          target: "executing_founder_ops",
          actions: "logTransition",
        },
        {
          guard: "isFundraisingTask",
          target: "executing_fundraising",
          actions: "logTransition",
        },
        {
          guard: "isGrowthTask",
          target: "executing_growth",
          actions: "logTransition",
        },
        {
          target: "error",
          actions: ["logTransition", "storeRoutingError"],
        },
      ],
    },

    /**
     * Executing Founder Ops Agent
     */
    executing_founder_ops: {
      invoke: {
        src: "founderOpsAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: ["logTransition", "storeResult", "clearTask"],
        },
        onError: {
          target: "error",
          actions: ["logTransition", "storeError"],
        },
      },
      on: {
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Executing Fundraising Agent
     */
    executing_fundraising: {
      invoke: {
        src: "fundraisingAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: ["logTransition", "storeResult", "clearTask"],
        },
        onError: {
          target: "error",
          actions: ["logTransition", "storeError"],
        },
      },
      on: {
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Executing Growth Agent
     */
    executing_growth: {
      invoke: {
        src: "growthAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: ["logTransition", "storeResult", "clearTask"],
        },
        onError: {
          target: "error",
          actions: ["logTransition", "storeError"],
        },
      },
      on: {
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
      },
    },

    /**
     * Complete - task finished successfully
     */
    complete: {
      type: "final",
      entry: ["logTransition"],
    },

    /**
     * Error - recoverable error state
     * Can receive CANCEL to transition to failed
     */
    error: {
      entry: ["logTransition"],
      on: {
        CANCEL: {
          target: "failed",
          actions: "logTransition",
        },
        DISPATCH: {
          target: "routing",
          actions: ["logTransition", "storeTask"],
        },
      },
    },

    /**
     * Failed - final failure state
     */
    failed: {
      type: "final",
      entry: ["logTransition"],
    },
  },
});

export type AgentOrchestratorMachine = typeof agentOrchestratorMachine;
