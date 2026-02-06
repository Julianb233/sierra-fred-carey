/**
 * Agent Tasks Database Operations
 * Phase 04: Studio Tier Features
 *
 * CRUD operations for the agent_tasks table.
 * Follows the pattern from lib/db/documents.ts using Supabase client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AgentTask, AgentType, AgentStatus } from '@/lib/agents/types';

// Lazy-initialized Supabase client to avoid build-time crashes when env vars aren't set
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Proxy for backward compatibility — all usages of `supabase` now go through lazy init
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ============================================================================
// Create
// ============================================================================

/**
 * Create a new agent task
 */
export async function createAgentTask(params: {
  userId: string;
  agentType: AgentType;
  taskType: string;
  description: string;
  input?: Record<string, unknown>;
}): Promise<AgentTask> {
  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      user_id: params.userId,
      agent_type: params.agentType,
      task_type: params.taskType,
      description: params.description,
      input: params.input || {},
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create agent task: ${error.message}`);
  }

  return mapAgentTask(data);
}

// ============================================================================
// Read
// ============================================================================

/**
 * Get a single agent task by ID
 */
export async function getAgentTask(taskId: string): Promise<AgentTask | null> {
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get agent task: ${error.message}`);
  }

  return mapAgentTask(data);
}

/**
 * Get agent tasks for a user with optional filters
 */
export async function getAgentTasks(
  userId: string,
  opts?: {
    agentType?: AgentType;
    status?: AgentStatus;
    limit?: number;
    offset?: number;
  }
): Promise<AgentTask[]> {
  try {
    let query = supabase
      .from('agent_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (opts?.agentType) {
      query = query.eq('agent_type', opts.agentType);
    }
    if (opts?.status) {
      query = query.eq('status', opts.status);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }
    if (opts?.offset) {
      query = query.range(opts.offset, opts.offset + (opts.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      // PGRST205 = table doesn't exist (migrations not applied)
      if (error.code === 'PGRST205' || error.message?.includes('relation') || error.code === '42P01') {
        console.warn('[getAgentTasks] Table does not exist, returning empty array');
        return [];
      }
      throw new Error(`Failed to get agent tasks: ${error.message}`);
    }

    return (data || []).map(mapAgentTask);
  } catch (err) {
    // Gracefully handle missing table or connection issues
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('PGRST205')) {
      console.warn('[getAgentTasks] Table does not exist, returning empty array');
      return [];
    }
    throw err;
  }
}

/**
 * Get active (pending or running) agent tasks for a user
 */
export async function getActiveAgentTasks(userId: string): Promise<AgentTask[]> {
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get active agent tasks: ${error.message}`);
  }

  return (data || []).map(mapAgentTask);
}

// ============================================================================
// Update
// ============================================================================

/**
 * Update an agent task by ID
 */
export async function updateAgentTask(
  taskId: string,
  updates: Partial<{
    status: AgentStatus;
    output: Record<string, unknown>;
    error: string;
    startedAt: Date;
    completedAt: Date;
  }>
): Promise<AgentTask> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.output !== undefined) dbUpdates.output = updates.output;
  if (updates.error !== undefined) dbUpdates.error = updates.error;
  if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt.toISOString();
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt.toISOString();

  const { data, error } = await supabase
    .from('agent_tasks')
    .update(dbUpdates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update agent task: ${error.message}`);
  }

  return mapAgentTask(data);
}

// ============================================================================
// Mapper
// ============================================================================

/**
 * Map database row to AgentTask interface
 */
function mapAgentTask(row: Record<string, unknown>): AgentTask {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    agentType: row.agent_type as AgentType,
    taskType: row.task_type as string,
    description: row.description as string,
    status: row.status as AgentStatus,
    input: (row.input as Record<string, unknown>) || {},
    output: row.output as Record<string, unknown> | undefined,
    error: row.error as string | undefined,
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
