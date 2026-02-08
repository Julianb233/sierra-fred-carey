/**
 * Push Notification Triggers
 *
 * Convenience functions that fire push notifications for key application events.
 * All functions are fire-and-forget — they never throw and never block the caller.
 * When VAPID keys are not configured, every function is a silent no-op.
 *
 * Each trigger:
 * 1. Checks the user's push notification category preferences before sending
 * 2. Includes a contextual deep link URL for click-to-navigate
 */

import { sendPushToUser } from "@/lib/push";
import type { PushPayload } from "@/lib/push";
import { isCategoryEnabled } from "@/lib/push/preferences";
import { createServiceClient } from "@/lib/supabase/server";

// ---------- Delivery Logging ----------

async function logNotificationDelivery(
  userId: string,
  category: string,
  payload: PushPayload,
  result: { sent: number; failed: number },
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("push_notification_logs").insert({
      user_id: userId,
      category,
      title: payload.title,
      body: payload.body ?? null,
      url: payload.url ?? null,
      status: result.failed > 0 && result.sent === 0 ? "failed" : "sent",
      error_message: result.failed > 0 ? `${result.failed} subscription(s) failed` : null,
    });
  } catch {
    // Best-effort logging — never block the caller
  }
}

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
 * Deep link: /dashboard (red flags widget on main dashboard)
 */
export function notifyRedFlag(userId: string, flag: RedFlagTriggerData): void {
  // Fire-and-forget with preference check
  void (async () => {
    try {
      const enabled = await isCategoryEnabled(userId, "red_flags");
      if (!enabled) return;

      const payload: PushPayload = {
        title: `Red Flag: ${flag.category}`,
        body: flag.title,
        url: "/dashboard",
        tag: `red-flag-${flag.id ?? flag.category}`,
        data: { type: "red_flag", flagId: flag.id, severity: flag.severity },
      };

      const result = await sendPushToUser(userId, payload);
      await logNotificationDelivery(userId, "red_flags", payload, result);
    } catch {
      // Intentionally swallowed — push delivery is best-effort
    }
  })();
}

/**
 * Notify the user when a wellbeing/burnout alert is raised.
 * Fire-and-forget — never throws.
 * Deep link: /dashboard/wellbeing
 */
export function notifyWellbeingAlert(userId: string, alert: WellbeingAlertData): void {
  void (async () => {
    try {
      const enabled = await isCategoryEnabled(userId, "wellbeing_alerts");
      if (!enabled) return;

      const payload: PushPayload = {
        title: `Wellbeing Alert: ${alert.type}`,
        body: alert.message,
        url: "/dashboard/wellbeing",
        tag: `wellbeing-${alert.type}`,
        data: { type: "wellbeing", alertType: alert.type, severity: alert.severity },
      };

      const result = await sendPushToUser(userId, payload);
      await logNotificationDelivery(userId, "wellbeing_alerts", payload, result);
    } catch {
      // Intentionally swallowed
    }
  })();
}

/**
 * Notify the user when an agent task completes.
 * Fire-and-forget — never throws.
 * Deep link: /dashboard/agents
 */
export function notifyAgentComplete(
  userId: string,
  agentName: string,
  result: AgentCompleteData,
): void {
  void (async () => {
    try {
      const enabled = await isCategoryEnabled(userId, "agent_completions");
      if (!enabled) return;

      const statusLabel = result.result === "success" ? "completed" : result.result === "partial" ? "partially completed" : "failed";

      const payload: PushPayload = {
        title: `Agent ${agentName} ${statusLabel}`,
        body: result.summary ?? `The ${agentName} agent has ${statusLabel}.`,
        url: "/dashboard/agents",
        tag: `agent-${agentName}`,
        data: { type: "agent_complete", agentName, result: result.result },
      };

      const sendResult = await sendPushToUser(userId, payload);
      await logNotificationDelivery(userId, "agent_completions", payload, sendResult);
    } catch {
      // Intentionally swallowed
    }
  })();
}

/**
 * Notify the user when a new inbox message arrives.
 * Fire-and-forget — never throws.
 * Deep link: /dashboard/inbox
 */
export function notifyInboxMessage(userId: string, message: InboxMessageData): void {
  void (async () => {
    try {
      const enabled = await isCategoryEnabled(userId, "inbox_messages");
      if (!enabled) return;

      const payload: PushPayload = {
        title: message.subject,
        body: message.preview,
        url: "/dashboard/inbox",
        tag: `inbox-${message.id ?? "new"}`,
        data: { type: "inbox", messageId: message.id, source: message.source },
      };

      const sendResult = await sendPushToUser(userId, payload);
      await logNotificationDelivery(userId, "inbox_messages", payload, sendResult);
    } catch {
      // Intentionally swallowed
    }
  })();
}
