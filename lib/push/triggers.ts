/**
 * Push Notification Triggers
 *
 * Convenience functions that fire push notifications for key application events.
 * All functions are fire-and-forget — they never throw and never block the caller.
 * When VAPID keys are not configured, every function is a silent no-op.
 */

import { sendPushToUser } from "@/lib/push";
import type { PushPayload } from "@/lib/push";

// ---------- Types ----------

export interface RedFlagTriggerData {
  id?: string;
  category: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface WellbeingAlertData {
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface AgentCompleteData {
  agentName: string;
  result: "success" | "failure" | "partial";
  summary?: string;
}

export interface InboxMessageData {
  id?: string;
  subject: string;
  preview: string;
  source?: string;
}

// ---------- Trigger Functions ----------

/**
 * Notify the user when a red flag is detected in their startup data.
 * Fire-and-forget — never throws.
 */
export function notifyRedFlag(userId: string, flag: RedFlagTriggerData): void {
  const payload: PushPayload = {
    title: `Red Flag: ${flag.category}`,
    body: flag.title,
    url: "/dashboard/red-flags",
    tag: `red-flag-${flag.id ?? flag.category}`,
    data: { type: "red_flag", flagId: flag.id, severity: flag.severity },
  };

  // Fire-and-forget
  sendPushToUser(userId, payload).catch(() => {
    // Intentionally swallowed — push delivery is best-effort
  });
}

/**
 * Notify the user when a wellbeing/burnout alert is raised.
 * Fire-and-forget — never throws.
 */
export function notifyWellbeingAlert(userId: string, alert: WellbeingAlertData): void {
  const payload: PushPayload = {
    title: `Wellbeing Alert: ${alert.type}`,
    body: alert.message,
    url: "/dashboard/wellbeing",
    tag: `wellbeing-${alert.type}`,
    data: { type: "wellbeing", alertType: alert.type, severity: alert.severity },
  };

  sendPushToUser(userId, payload).catch(() => {
    // Intentionally swallowed
  });
}

/**
 * Notify the user when an agent task completes.
 * Fire-and-forget — never throws.
 */
export function notifyAgentComplete(
  userId: string,
  agentName: string,
  result: AgentCompleteData,
): void {
  const statusLabel = result.result === "success" ? "completed" : result.result === "partial" ? "partially completed" : "failed";

  const payload: PushPayload = {
    title: `Agent ${agentName} ${statusLabel}`,
    body: result.summary ?? `The ${agentName} agent has ${statusLabel}.`,
    url: "/dashboard",
    tag: `agent-${agentName}`,
    data: { type: "agent_complete", agentName, result: result.result },
  };

  sendPushToUser(userId, payload).catch(() => {
    // Intentionally swallowed
  });
}

/**
 * Notify the user when a new inbox message arrives.
 * Fire-and-forget — never throws.
 */
export function notifyInboxMessage(userId: string, message: InboxMessageData): void {
  const payload: PushPayload = {
    title: message.subject,
    body: message.preview,
    url: "/dashboard/inbox",
    tag: `inbox-${message.id ?? "new"}`,
    data: { type: "inbox", messageId: message.id, source: message.source },
  };

  sendPushToUser(userId, payload).catch(() => {
    // Intentionally swallowed
  });
}
