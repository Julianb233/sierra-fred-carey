/**
 * Agent Task Detail API Route
 * Phase 04: Studio Tier Features - Plan 02
 *
 * GET /api/agents/:agentId - Get a specific agent task by ID
 *
 * The :agentId path segment is actually the task ID.
 * Returns 404 if the task doesn't exist or doesn't belong to the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { getAgentTask, updateAgentTask } from "@/lib/db/agent-tasks";

// ============================================================================
// GET /api/agents/:agentId - Get agent task details
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
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

    // 3. Extract task ID from path params
    const { agentId: taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // 3. Fetch task
    const task = await getAgentTask(taskId);

    // 4. Check if task exists
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Agent task not found" },
        { status: 404 }
      );
    }

    // 5. Verify ownership (security check)
    if (task.userId !== userId) {
      // Return 404 instead of 403 to avoid leaking task existence
      return NextResponse.json(
        { success: false, error: "Agent task not found" },
        { status: 404 }
      );
    }

    // 6. Return task
    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error("[Agent API] GET detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent task" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/agents/:agentId - Cancel an agent task
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
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

    // 3. Extract task ID
    const { agentId: taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // 4. Fetch task
    const task = await getAgentTask(taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Agent task not found" },
        { status: 404 }
      );
    }

    // 5. Verify ownership
    if (task.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Agent task not found" },
        { status: 404 }
      );
    }

    // 6. Check if task can be cancelled
    if (["complete", "failed", "cancelled"].includes(task.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel task with status: ${task.status}` },
        { status: 400 }
      );
    }

    // 7. Cancel the task
    const updated = await updateAgentTask(taskId, {
      status: "cancelled",
      completedAt: new Date(),
      error: "Cancelled by user",
    });

    return NextResponse.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Agent API] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel agent task" },
      { status: 500 }
    );
  }
}
