/**
 * Growth Agent
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Specialist agent for growth strategy and experimentation.
 * Helps founders with data-driven growth decisions including:
 * - Channel analysis and budget allocation
 * - A/B test and experiment design
 * - Conversion funnel optimization
 * - Growth-oriented content strategy
 *
 * Uses the base agent runner with Growth-specific tools and system prompt.
 */

import { runAgent } from '../base-agent';
import { GROWTH_SYSTEM_PROMPT } from './prompts';
import { growthTools } from './tools';
import type { AgentTask, AgentResult } from '../types';

/**
 * Run the Growth Agent on a given task.
 *
 * The agent uses generateText with tools in a multi-step loop,
 * calling growth-specific tools (channelAnalysis, experimentDesign,
 * funnelAnalysis, contentStrategy) as needed to fulfill the task.
 *
 * @param task - The agent task to execute
 * @returns AgentResult with output text, tool calls, and token usage
 */
export async function runGrowthAgent(task: AgentTask): Promise<AgentResult> {
  return runAgent(
    {
      agentType: 'growth',
      systemPrompt: GROWTH_SYSTEM_PROMPT,
      tools: growthTools,
      maxSteps: 8,
    },
    task
  );
}
