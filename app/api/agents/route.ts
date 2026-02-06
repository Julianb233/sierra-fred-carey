/**
 * Agent API Routes
 * Phase 04: Studio Tier Features - Plan 02
 *
 * POST /api/agents - Dispatch a task to an agent (Studio tier required)
 * GET  /api/agents - List agent tasks for the authenticated user
 *
 * Shared by all agent types (founder_ops, fundraising, growth).
 * Agent execution is fire-and-forget to avoid request timeouts.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import {
  getUserTier,
  createTierErrorResponse,
} from "@/lib/api/tier-middleware";
import {
  createAgentTask,
  getAgentTasks,
  getActiveAgentTasks,
  updateAgentTask,
} from "@/lib/db/agent-tasks";
import { createActor } from "xstate";
import { agentOrchestratorMachine } from "@/lib/agents/machine";
import type { AgentType, AgentStatus } from "@/lib/agents/types";

// ============================================================================
// Request Validation
// ============================================================================

const dispatchSchema = z.object({
  agentType: z.enum(["founder_ops", "fundraising", "growth"]),
  taskType: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  input: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Constants
// ============================================================================

/** Maximum concurrent active agent tasks per user */
const MAX_ACTIVE_TASKS = 5;

/** Maximum execution time for agent tasks (ms) */
const AGENT_TIMEOUT_MS = 60_000;

// ============================================================================
// POST /api/agents - Dispatch a task to an agent
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = dispatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { agentType, taskType, description, input } = parsed.data;

    // 3. Check Studio tier gating
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // 4. Rate limit - check active task count
    const activeTasks = await getActiveAgentTasks(userId);
    if (activeTasks.length >= MAX_ACTIVE_TASKS) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many active agent tasks",
          message: `You have ${activeTasks.length} active tasks. Please wait for some to complete before dispatching more.`,
          limit: MAX_ACTIVE_TASKS,
          active: activeTasks.length,
        },
        { status: 429 }
      );
    }

    // 5. Create task in database
    const task = await createAgentTask({
      userId,
      agentType,
      taskType,
      description,
      input: input || {},
    });

    // 6. Start agent execution asynchronously (fire-and-forget)
    // The orchestrator runs in the background and updates the DB task status.
    // We do NOT await completion -- agents may take 30+ seconds.
    startAgentExecution(userId, task.id, task).catch((err) => {
      console.error(
        `[Agent API] Failed to start agent execution for task ${task.id}:`,
        err
      );
    });

    // 7. Return immediately with task ID
    return NextResponse.json(
      {
        success: true,
        taskId: task.id,
        status: "pending",
        agentType,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle auth errors (thrown as Response by requireAuth)
    if (error instanceof Response) return error;

    console.error("[Agent API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch agent task" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/agents - List agent tasks
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier gating
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType") as AgentType | null;
    const status = searchParams.get("status") as AgentStatus | null;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate enum values if provided
    const validAgentTypes: AgentType[] = [
      "founder_ops",
      "fundraising",
      "growth",
    ];
    const validStatuses: AgentStatus[] = [
      "pending",
      "running",
      "complete",
      "failed",
      "cancelled",
    ];

    if (agentType && !validAgentTypes.includes(agentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid agentType. Must be one of: ${validAgentTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 4. Fetch tasks
    const tasks = await getAgentTasks(userId, {
      agentType: agentType || undefined,
      status: status || undefined,
      limit,
      offset,
    });

    // 5. Return tasks
    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
      limit,
      offset,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error("[Agent API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent tasks" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Agent Execution (Fire-and-Forget)
// ============================================================================

/**
 * Start agent execution in the background.
 * Creates an XState actor from the orchestrator machine,
 * dispatches the task, and updates the DB as the agent progresses.
 */
async function startAgentExecution(
  userId: string,
  taskId: string,
  task: { id: string; agentType: AgentType; taskType: string; description: string; input: Record<string, unknown> }
) {
  try {
    // Mark task as running
    await updateAgentTask(taskId, {
      status: "running",
      startedAt: new Date(),
    });

    // Create the orchestrator actor
    const actor = createActor(agentOrchestratorMachine, {
      input: { userId },
    });

    // Listen for state transitions to update DB
    actor.subscribe({
      next: (state) => {
        if (state.matches("complete")) {
          const latestResult = state.context.results[state.context.results.length - 1];
          updateAgentTask(taskId, {
            status: "complete",
            output: latestResult
              ? {
                  text: latestResult.output,
                  toolCalls: latestResult.toolCalls,
                  tokenUsage: latestResult.tokenUsage,
                }
              : {},
            completedAt: new Date(),
          }).catch((err) =>
            console.error(`[Agent API] Failed to update task ${taskId} to complete:`, err)
          );
        }

        if (state.matches("error") || state.matches("failed")) {
          const errorMsg =
            state.context.error?.message || "Agent execution failed";
          updateAgentTask(taskId, {
            status: "failed",
            error: errorMsg,
            completedAt: new Date(),
          }).catch((err) =>
            console.error(`[Agent API] Failed to update task ${taskId} to failed:`, err)
          );
        }
      },
      error: (err) => {
        console.error(`[Agent API] Orchestrator error for task ${taskId}:`, err);
        updateAgentTask(taskId, {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        }).catch(() => {});
      },
    });

    // Start the actor and dispatch the task
    actor.start();
    actor.send({
      type: "DISPATCH",
      task: {
        id: task.id,
        userId,
        agentType: task.agentType,
        taskType: task.taskType,
        description: task.description,
        status: "running",
        input: task.input,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Timeout: force-fail tasks that run too long
    setTimeout(async () => {
      try {
        const snapshot = actor.getSnapshot();
        if (!snapshot.matches("complete") && !snapshot.matches("error") && !snapshot.matches("failed")) {
          console.warn(`[Agent API] Task ${taskId} timed out after ${AGENT_TIMEOUT_MS}ms`);
          actor.stop();
          await updateAgentTask(taskId, {
            status: "failed",
            error: `Agent execution timed out after ${AGENT_TIMEOUT_MS / 1000}s`,
            completedAt: new Date(),
          });
        }
      } catch {
        // Actor may already be stopped
      }
    }, AGENT_TIMEOUT_MS);
  } catch (error) {
    console.error(`[Agent API] startAgentExecution failed for task ${taskId}:`, error);
    await updateAgentTask(taskId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
    });
  }
}
