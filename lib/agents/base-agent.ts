/**
 * Base Agent Runner
 * Phase 04: Studio Tier Features
 * Phase 21: Tier-based model routing
 *
 * Wraps Vercel AI SDK generateText with tools and stopWhen
 * to provide a reusable agent execution function.
 * Each specialist agent provides its own config (system prompt, tools, maxSteps).
 *
 * NOTE: Does NOT use circuit breaker or fallback chain.
 * The orchestrator handles retries at a higher level.
 */

import { generateText, stepCountIs, type ToolSet } from 'ai';
import { getModel } from '@/lib/ai/providers';
import { getModelForTier } from '@/lib/ai/tier-routing';
import type { ProviderKey } from '@/lib/ai/providers';
import type { AgentTask, AgentResult, BaseAgentConfig } from './types';

/**
 * Run an agent with the given configuration and task.
 *
 * Uses Vercel AI SDK generateText with tools and stopWhen(stepCountIs(N))
 * to execute a multi-step tool-calling loop. The AI model will
 * call tools as needed and iterate until it produces a final response
 * or hits the step limit.
 *
 * @param config - Agent configuration (system prompt, tools, maxSteps)
 * @param task - The agent task to execute
 * @param userTier - Optional user subscription tier for model routing (defaults to "free")
 * @returns AgentResult with output text, tool calls, and token usage
 */
export async function runAgent(
  config: BaseAgentConfig,
  task: AgentTask,
  userTier?: string
): Promise<AgentResult> {
  try {
    // Use tier-routed model if no explicit model override in config;
    // otherwise fall back to the config's model or 'primary'
    const providerKey: ProviderKey = config.model
      ? (config.model as ProviderKey)
      : getModelForTier(userTier || 'free', 'agent');

    const model = getModel(providerKey);

    const result = await generateText({
      model,
      system: config.systemPrompt,
      prompt: buildPrompt(task),
      tools: config.tools as ToolSet,
      stopWhen: stepCountIs(config.maxSteps),
    });

    // Extract tool calls from all steps
    // In AI SDK 6, tool call properties use `input` (not `args`)
    const toolCalls = result.steps.flatMap((step) =>
      (step.toolCalls || []).map((tc) => ({
        toolName: tc.toolName as string,
        args: ((tc as Record<string, unknown>).input ?? {}) as Record<string, unknown>,
        result: null as unknown,
      }))
    );

    return {
      agentId: config.agentType,
      taskId: task.id,
      output: result.text,
      toolCalls,
      status: 'complete',
      tokenUsage: {
        prompt: result.totalUsage.inputTokens ?? 0,
        completion: result.totalUsage.outputTokens ?? 0,
        total:
          (result.totalUsage.inputTokens ?? 0) +
          (result.totalUsage.outputTokens ?? 0),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      `[Agent:${config.agentType}] Task ${task.id} failed:`,
      message
    );

    return {
      agentId: config.agentType,
      taskId: task.id,
      output: '',
      toolCalls: [],
      status: 'failed',
      error: message,
    };
  }
}

/**
 * Build the prompt from an AgentTask.
 * Includes the task description and any structured input as context.
 */
function buildPrompt(task: AgentTask): string {
  const parts: string[] = [];

  parts.push(`Task: ${task.description}`);

  if (task.input && Object.keys(task.input).length > 0) {
    parts.push(`\nContext:\n${JSON.stringify(task.input, null, 2)}`);
  }

  return parts.join('\n');
}
