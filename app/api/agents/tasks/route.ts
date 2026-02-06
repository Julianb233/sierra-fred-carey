/**
 * Agent Tasks API
 * Phase 04: Studio Tier Features - Plan 04
 *
 * GET /api/agents/tasks - List recent agent task results for the authenticated user
 *
 * Returns up to 50 recent tasks across all agent types.
 * Used by the agent dashboard to display task history.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { getAgentTasks } from "@/lib/db/agent-tasks";
import type { AgentType, AgentStatus } from "@/lib/agents/types";

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

    // 3. Parse optional query params
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType") as AgentType | null;
    const status = searchParams.get("status") as AgentStatus | null;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );

    // 3. Validate enum values if provided
    const validAgentTypes: AgentType[] = ["founder_ops", "fundraising", "growth"];
    const validStatuses: AgentStatus[] = ["pending", "running", "complete", "failed", "cancelled"];

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
    });

    // 5. Return tasks
    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    // Handle auth errors (thrown as Response by requireAuth)
    if (error instanceof Response) return error;

    console.error("[Agent Tasks API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent tasks" },
      { status: 500 }
    );
  }
}
