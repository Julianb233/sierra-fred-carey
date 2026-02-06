/**
 * Fundraising Agent Runner
 * Phase 04: Studio Tier Features
 *
 * Specialist agent for fundraising activities:
 * - Investor research and targeting
 * - Outreach email drafting
 * - Pipeline analysis and prioritization
 * - Meeting preparation
 *
 * Uses the base agent runner with fundraising-specific tools and system prompt.
 */

import { runAgent } from '../base-agent';
import { fundraisingTools } from './tools';
import { FUNDRAISING_SYSTEM_PROMPT } from './prompts';
import type { AgentTask, AgentResult } from '../types';

/**
 * Run the Fundraising specialist agent on a given task.
 *
 * The agent has access to 4 domain tools:
 * - investorResearch: Find matching investors by stage/sector/check size
 * - outreachDraft: Draft cold or warm outreach emails
 * - pipelineAnalysis: Analyze and prioritize investor pipeline
 * - meetingPrep: Prepare talking points and materials for meetings
 *
 * @param task - The agent task containing the user's fundraising request
 * @returns AgentResult with structured output from tool calls
 */
export async function runFundraisingAgent(task: AgentTask): Promise<AgentResult> {
  return runAgent(
    {
      agentType: 'fundraising',
      systemPrompt: FUNDRAISING_SYSTEM_PROMPT,
      tools: fundraisingTools,
      maxSteps: 8,
    },
    task
  );
}
