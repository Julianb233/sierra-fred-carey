/**
 * Inbox Message Types
 * Phase 19: Inbox Ops Agent
 *
 * Type definitions for the centralized message hub that aggregates
 * agent outputs, recommendations, and action items.
 */

/** Priority level for inbox messages */
export type MessagePriority = "urgent" | "high" | "normal" | "low";

/** Source agent/system that generated the message */
export type MessageSource = "founder-ops" | "fundraising" | "growth" | "system";

/** Read/action status of a message */
export type MessageStatus = "unread" | "read" | "actioned" | "dismissed";

/** A single inbox message aggregated from agent tasks */
export interface InboxMessage {
  id: string;
  userId: string;
  source: MessageSource;
  priority: MessagePriority;
  status: MessageStatus;
  title: string;
  summary: string;
  detail?: string;
  actionUrl?: string;
  agentTaskId?: string;
  createdAt: string;
  readAt?: string;
}

/** Filters for querying inbox messages */
export interface InboxFilters {
  source?: MessageSource;
  priority?: MessagePriority;
  status?: MessageStatus;
  limit?: number;
  offset?: number;
}

/** Metadata counts for inbox badges */
export interface InboxCounts {
  total: number;
  unread: number;
  urgent: number;
}
