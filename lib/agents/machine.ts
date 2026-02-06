/**
 * Agent Orchestrator State Machine
 * Phase 04: Studio Tier Features
 *
 * XState v5 state machine that routes agent tasks to the correct
 * specialist agent (Founder Ops, Fundraising, Growth) based on
 * the task's agentType field.
 *
 * Flow: idle -> routing -> executing_* -> complete/error/failed
 *
 * Pattern follows lib/fred/machine.ts.
 */

import { setup, assign, fromPromise } from "xstate";
import type {
  AgentTask,
  AgentResult,
  OrchestratorContext,
  OrchestratorEvent,
} from "./types";

// ============================================================================
// State Machine Definition
// ============================================================================

export const agentOrchestratorMachine = setup({
  types: {
    context: {} as OrchestratorContext,
    events: {} as OrchestratorEvent,
    input: {} as { userId: string },
  },

  // ========================================================================
  // Actors (async functions invoked by states)
  // ========================================================================
  actors: {
    /**
     * Founder Ops Agent - handles operational tasks
     * (scheduling, email drafts, task management)
     */
    founderOpsAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runFounderOpsAgent } = await import(
          "./founder-ops/agent"
        );
        return runFounderOpsAgent(input);
      }
    ),

    /**
     * Fundraising Agent - handles investor outreach and pipeline
     */
    fundraisingAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runFundraisingAgent } = await import(
          "./fundraising/agent"
        );
        return runFundraisingAgent(input);
      }
    ),

    /**
     * Growth Agent - handles analytics, experiments, channel optimization
     */
    growthAgent: fromPromise<AgentResult, AgentTask>(
      async ({ input }) => {
        const { runGrowthAgent } = await import("./growth/agent");
        return runGrowthAgent(input);
      }
    ),
  },

  // ========================================================================
  // Guards (conditional transitions)
  // ========================================================================
  guards: {
    /**
     * Check if the current task should be routed to the Founder Ops agent
     */
    isFounderOpsTask: ({ context }) => {
      return context.currentTask?.agentType === "founder_ops";
    },

    /**
     * Check if the current task should be routed to the Fundraising agent
     */
    isFundraisingTask: ({ context }) => {
      return context.currentTask?.agentType === "fundraising";
    },

    /**
     * Check if the current task should be routed to the Growth agent
     */
    isGrowthTask: ({ context }) => {
      return context.currentTask?.agentType === "growth";
    },
  },

  // ========================================================================
  // Actions (side effects and context mutations)
  // ========================================================================
  actions: {
    /**
     * Log state transitions for observability
     */
    logTransition: ({ context, event }) => {
      console.log(
        `[AgentOrchestrator] Transition | User: ${context.userId} | Event: ${event.type} | Task: ${context.currentTask?.id ?? "none"}`
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
      error: () => null,
    }),

    /**
     * Store the agent result in the results array
     */
    storeResult: assign({
      results: ({ context, event }) => {
        // onDone events carry the result in event.output
        const output = (event as { output?: AgentResult }).output;
        if (output) {
          return [...context.results, output];
        }
        return context.results;
      },
    }),

    /**
     * Store error information
     */
    storeError: assign({
      error: ({ event }) => {
        // onError events carry the error in event.error
        const err = (event as { error?: unknown }).error;
        if (err instanceof Error) return err;
        if (err) return new Error(String(err));
        return new Error("Unknown agent error");
      },
    }),

    /**
     * Add agent to active agents list
     */
    addActiveAgent: assign({
      activeAgents: ({ context }) => {
        const agentType = context.currentTask?.agentType;
        if (agentType && !context.activeAgents.includes(agentType)) {
          return [...context.activeAgents, agentType];
        }
        return context.activeAgents;
      },
    }),

    /**
     * Remove agent from active agents list
     */
    removeActiveAgent: assign({
      activeAgents: ({ context }) => {
        const agentType = context.currentTask?.agentType;
        return context.activeAgents.filter((a) => a !== agentType);
      },
    }),

    /**
     * Clear the current task
     */
    clearTask: assign({
      currentTask: () => null,
    }),
  },
}).createMachine({
  id: "agent-orchestrator",
  initial: "idle",
  context: ({ input }) => ({
    userId: input.userId,
    currentTask: null,
    results: [],
    activeAgents: [],
    error: null,
  }),

  states: {
    // ====================================================================
    // Idle - waiting for a task to be dispatched
    // ====================================================================
    idle: {
      on: {
        DISPATCH: {
          target: "routing",
          actions: ["logTransition", "storeTask"],
        },
      },
    },

    // ====================================================================
    // Routing - determine which agent should handle the task
    // ====================================================================
    routing: {
      always: [
        {
          guard: "isFounderOpsTask",
          target: "executing_founder_ops",
          actions: ["logTransition", "addActiveAgent"],
        },
        {
          guard: "isFundraisingTask",
          target: "executing_fundraising",
          actions: ["logTransition", "addActiveAgent"],
        },
        {
          guard: "isGrowthTask",
          target: "executing_growth",
          actions: ["logTransition", "addActiveAgent"],
        },
        {
          target: "error",
          actions: [
            "logTransition",
            assign({
              error: () =>
                new Error(
                  "Unknown agent type - cannot route task"
                ),
            }),
          ],
        },
      ],
    },

    // ====================================================================
    // Executing: Founder Ops Agent
    // ====================================================================
    executing_founder_ops: {
      invoke: {
        src: "founderOpsAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: [
            "logTransition",
            "storeResult",
            "removeActiveAgent",
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            "storeError",
            "removeActiveAgent",
          ],
        },
      },
    },

    // ====================================================================
    // Executing: Fundraising Agent
    // ====================================================================
    executing_fundraising: {
      invoke: {
        src: "fundraisingAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: [
            "logTransition",
            "storeResult",
            "removeActiveAgent",
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            "storeError",
            "removeActiveAgent",
          ],
        },
      },
    },

    // ====================================================================
    // Executing: Growth Agent
    // ====================================================================
    executing_growth: {
      invoke: {
        src: "growthAgent",
        input: ({ context }) => context.currentTask!,
        onDone: {
          target: "complete",
          actions: [
            "logTransition",
            "storeResult",
            "removeActiveAgent",
          ],
        },
        onError: {
          target: "error",
          actions: [
            "logTransition",
            "storeError",
            "removeActiveAgent",
          ],
        },
      },
    },

    // ====================================================================
    // Complete - task finished successfully
    // ====================================================================
    complete: {
      type: "final",
      entry: ["logTransition", "clearTask"],
    },

    // ====================================================================
    // Error - recoverable error state
    // ====================================================================
    error: {
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

    // ====================================================================
    // Failed - final failure state
    // ====================================================================
    failed: {
      type: "final",
      entry: ["logTransition", "clearTask"],
    },
  },
});

export type AgentOrchestratorMachine = typeof agentOrchestratorMachine;
