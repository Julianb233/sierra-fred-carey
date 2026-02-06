/**
 * Agent Type System
 * Phase 04: Studio Tier Features
 *
 * Shared types for the virtual agent system.
 * Used by the orchestrator, base agent, specialist agents, and DB operations.
 */

// ============================================================================
// Core Agent Types
// ============================================================================

/**
 * The three specialist agent types in the Studio tier
 */
export type AgentType = 'founder_ops' | 'fundraising' | 'growth';

/**
 * Agent task lifecycle status
 */
export type AgentStatus = 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';

/**
 * Agent task record - represents a unit of work dispatched to an agent
 */
export interface AgentTask {
  id: string;
  userId: string;
  agentType: AgentType;
  taskType: string;
  description: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Agent Result Types
// ============================================================================

/**
 * Result returned by an agent after executing a task
 */
export interface AgentResult {
  agentId: AgentType;
  taskId: string;
  output: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  status: 'complete' | 'failed';
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ============================================================================
// Agent Configuration Types
// ============================================================================

/**
 * Configuration for the base agent runner
 */
export interface BaseAgentConfig {
  /** Which agent type this configuration is for */
  agentType: AgentType;
  /** System prompt defining the agent's personality and capabilities */
  systemPrompt: string;
  /** Tools available to this agent (AI SDK tool definitions) */
  tools: Record<string, any>;
  /** Maximum number of tool-call steps the agent can take */
  maxSteps: number;
  /** Optional model override (defaults to 'primary') */
  model?: string;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

/**
 * Context for the agent orchestrator state machine
 */
export interface OrchestratorContext {
  userId: string;
  currentTask: AgentTask | null;
  results: AgentResult[];
  activeAgents: string[];
  error: Error | null;
}

/**
 * Events the agent orchestrator can receive
 */
export type OrchestratorEvent =
  | { type: 'DISPATCH'; task: AgentTask }
  | { type: 'AGENT_COMPLETE'; agentId: string; result: AgentResult }
  | { type: 'AGENT_ERROR'; agentId: string; error: Error }
  | { type: 'CANCEL' };
