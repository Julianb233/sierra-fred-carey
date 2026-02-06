/**
 * Founder Ops Agent
 * Phase 04: Studio Tier Features - Plan 02
 *
 * The first specialist agent in the virtual team.
 * Helps founders with operational tasks: email drafting,
 * task management, meeting prep, and weekly priority setting.
 *
 * Uses the base agent runner with Founder Ops-specific config.
 */

import { runAgent } from "../base-agent";
import { founderOpsTools } from "./tools";
import { FOUNDER_OPS_SYSTEM_PROMPT } from "./prompts";
import type { AgentTask, AgentResult } from "../types";

/**
 * Run the Founder Ops agent on a given task.
 *
 * The agent will use up to 8 tool-calling steps to complete the task,
 * selecting from draftEmail, createTask, scheduleMeeting, and weeklyPriorities
 * as needed based on the task description and input.
 *
 * @param task - The agent task to execute
 * @returns AgentResult with output text, tool calls, and token usage
 */
export async function runFounderOpsAgent(
  task: AgentTask
): Promise<AgentResult> {
  return runAgent(
    {
      agentType: "founder_ops",
      systemPrompt: FOUNDER_OPS_SYSTEM_PROMPT,
      tools: founderOpsTools,
      maxSteps: 8,
    },
    task
  );
}
