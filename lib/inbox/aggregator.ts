/**
 * Inbox Message Aggregator
 * Phase 19: Inbox Ops Agent
 *
 * Queries agent_tasks and maps completed tasks to prioritized
 * InboxMessages for the centralized message hub.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  InboxMessage,
  InboxFilters,
  InboxCounts,
  MessageSource,
  MessagePriority,
} from "./types";

// ============================================================================
// Source Mapping
// ============================================================================

/** Map agent_type column values to MessageSource */
function agentTypeToSource(agentType: string): MessageSource {
  switch (agentType) {
    case "founder_ops":
      return "founder-ops";
    case "fundraising":
      return "fundraising";
    case "growth":
      return "growth";
    default:
      return "system";
  }
}

/** Human-readable label for a source */
export function sourceLabel(source: MessageSource): string {
  switch (source) {
    case "founder-ops":
      return "Founder Ops";
    case "fundraising":
      return "Fundraising";
    case "growth":
      return "Growth";
    case "system":
      return "System";
  }
}

// ============================================================================
// Priority Logic
// ============================================================================

/** Priority sort order (lower = higher priority) */
const PRIORITY_ORDER: Record<MessagePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Determine priority from agent task data */
function determinePriority(
  agentType: string,
  output: Record<string, unknown> | null,
  createdAt: string
): MessagePriority {
  const outputStr = output ? JSON.stringify(output).toLowerCase() : "";

  // Urgent: output contains urgent/critical keywords
  if (outputStr.includes("urgent") || outputStr.includes("critical")) {
    return "urgent";
  }

  // High: fundraising tasks are time-sensitive
  if (agentType === "fundraising") {
    return "high";
  }

  // High: recent tasks (within 24 hours)
  const taskAge = Date.now() - new Date(createdAt).getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  if (taskAge < twentyFourHours) {
    return "high";
  }

  return "normal";
}

// ============================================================================
// Title & Summary Derivation
// ============================================================================

/** Derive a user-friendly title from task data */
function deriveTitle(
  taskType: string,
  description: string,
  agentType: string
): string {
  // Clean up task type for display
  const cleanType = taskType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const agentLabel = sourceLabel(agentTypeToSource(agentType));

  // Use description if short enough, otherwise use task type
  if (description.length <= 80) {
    return description;
  }

  return `${agentLabel}: ${cleanType}`;
}

/** Extract a summary from the task output */
function extractSummary(output: Record<string, unknown> | null): string {
  if (!output) return "Task completed with no output.";

  // Try common output fields
  const text =
    typeof output.summary === "string"
      ? output.summary
      : typeof output.result === "string"
        ? output.result
        : typeof output.text === "string"
          ? output.text
          : typeof output.message === "string"
            ? output.message
            : JSON.stringify(output);

  // Truncate to 200 chars
  if (text.length <= 200) return text;
  return text.slice(0, 197) + "...";
}

/** Get full detail text from output */
function extractDetail(output: Record<string, unknown> | null): string {
  if (!output) return "No details available.";

  const text =
    typeof output.result === "string"
      ? output.result
      : typeof output.text === "string"
        ? output.text
        : typeof output.summary === "string"
          ? output.summary
          : JSON.stringify(output, null, 2);

  return text;
}

// ============================================================================
// Action URL Mapping
// ============================================================================

/** Map agent type to relevant dashboard page */
function getActionUrl(agentType: string, taskType: string): string {
  switch (agentType) {
    case "fundraising":
      return "/dashboard/investor-readiness";
    case "growth":
      return "/dashboard/strategy";
    case "founder_ops":
      if (taskType.includes("email") || taskType.includes("draft")) {
        return "/dashboard/agents";
      }
      return "/dashboard/agents";
    default:
      return "/dashboard";
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Aggregate inbox messages from agent_tasks for a given user.
 *
 * Queries completed agent tasks, maps them to InboxMessage objects
 * with derived priority, then applies filters and pagination.
 */
export async function aggregateInboxMessages(
  userId: string,
  filters?: InboxFilters
): Promise<InboxMessage[]> {
  const supabase = await createClient();
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;

  // Build query for completed tasks
  let query = supabase
    .from("agent_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  // Filter by source (agent_type)
  if (filters?.source) {
    const agentType = filters.source === "founder-ops"
      ? "founder_ops"
      : filters.source;
    query = query.eq("agent_type", agentType);
  }

  // Fetch a larger window to allow post-query filtering
  const { data: tasks, error } = await query.limit(200);

  if (error) {
    console.error("[Inbox Aggregator] Query error:", error);
    return [];
  }

  if (!tasks || tasks.length === 0) return [];

  // Map to InboxMessage
  let messages: InboxMessage[] = tasks.map((task) => {
    const output = task.output as Record<string, unknown> | null;
    const source = agentTypeToSource(task.agent_type);
    const priority = determinePriority(task.agent_type, output, task.created_at);

    return {
      id: task.id,
      userId: task.user_id,
      source,
      priority,
      status: "unread" as const,
      title: deriveTitle(task.task_type, task.description, task.agent_type),
      summary: extractSummary(output),
      detail: extractDetail(output),
      actionUrl: getActionUrl(task.agent_type, task.task_type),
      agentTaskId: task.id,
      createdAt: task.created_at,
    };
  });

  // Apply priority filter
  if (filters?.priority) {
    messages = messages.filter((m) => m.priority === filters.priority);
  }

  // Apply status filter (all messages default to "unread" since we don't persist read state yet)
  if (filters?.status && filters.status !== "unread") {
    // Future: when read/actioned/dismissed states are persisted, filter here
    messages = messages.filter((m) => m.status === filters.status);
  }

  // Sort: urgent first, then high, then normal, then low. Within same priority, by recency
  messages.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Apply pagination
  return messages.slice(offset, offset + limit);
}

/**
 * Get inbox badge counts for a user.
 */
export async function getInboxCount(
  userId: string
): Promise<InboxCounts> {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("agent_tasks")
    .select("id, agent_type, output, created_at")
    .eq("user_id", userId)
    .eq("status", "complete");

  if (error || !tasks) {
    console.error("[Inbox Aggregator] Count query error:", error);
    return { total: 0, unread: 0, urgent: 0 };
  }

  let urgentCount = 0;
  for (const task of tasks) {
    const output = task.output as Record<string, unknown> | null;
    const priority = determinePriority(task.agent_type, output, task.created_at);
    if (priority === "urgent") urgentCount++;
  }

  return {
    total: tasks.length,
    unread: tasks.length, // all unread until read state is persisted
    urgent: urgentCount,
  };
}
