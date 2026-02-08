/**
 * Web Push Notification Utilities
 *
 * Sends browser push notifications via the Web Push protocol (RFC 8030).
 * Uses lazy initialization -- all functions no-op gracefully when VAPID
 * keys are not configured, following the same pattern as Sentry init.
 */

import { logger } from "@/lib/logger";

// ---------- Types ----------

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  /** Arbitrary extra data forwarded to the SW notification event */
  data?: Record<string, unknown>;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

interface WebPushSendFn {
  (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: {
      vapidDetails?: { subject: string; publicKey: string; privateKey: string };
      TTL?: number;
    },
  ): Promise<unknown>;
}

// ---------- Lazy-loaded web-push ----------

let _sendNotification: WebPushSendFn | null = null;
let _initAttempted = false;

async function initWebPush(): Promise<WebPushSendFn | null> {
  if (_initAttempted) return _sendNotification;
  _initAttempted = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    logger.info(
      "[push] VAPID keys not configured -- web push notifications disabled",
    );
    return null;
  }

  try {
    const webPush = await import("web-push");
    webPush.setVapidDetails(subject, publicKey, privateKey);
    _sendNotification = webPush.sendNotification;
    logger.info("[push] web-push initialised");
  } catch (err) {
    logger.error("[push] Failed to initialise web-push", err);
    _sendNotification = null;
  }

  return _sendNotification;
}

// ---------- Public API ----------

/**
 * Return the VAPID public key (needed by PushManager.subscribe on the client).
 * Returns null when not configured.
 */
export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

/**
 * Send a push notification to a single subscription.
 * Returns true on success, false on failure (expired / invalid subscription).
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: PushPayload,
): Promise<boolean> {
  const sendFn = await initWebPush();
  if (!sendFn) return false;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const privateKey = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT!;

  try {
    await sendFn(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify(payload),
      {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 60 * 60, // 1 hour
      },
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404 or 410 means the subscription is expired/invalid
    if (status === 404 || status === 410) {
      logger.info("[push] Subscription expired", { endpoint: subscription.endpoint });
    } else {
      logger.error("[push] Failed to send notification", err);
    }
    return false;
  }
}

/**
 * Send a push notification to all subscriptions belonging to a user.
 * Automatically removes expired/invalid subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; removed: number }> {
  const sendFn = await initWebPush();
  if (!sendFn) return { sent: 0, failed: 0, removed: 0 };

  // Dynamic import to avoid circular dependency issues at module load time
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    if (error) logger.error("[push] Failed to fetch subscriptions", error);
    return { sent: 0, failed: 0, removed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: PushSubscriptionRecord) => {
      const ok = await sendPushNotification(sub, payload);
      if (ok) {
        sent++;
      } else {
        failed++;
        // Remove expired/invalid subscriptions
        const { error: delError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        if (!delError) removed++;
      }
    }),
  );

  // Log any unexpected rejections (should not happen since sendPushNotification catches)
  results.forEach((r) => {
    if (r.status === "rejected") {
      logger.error("[push] Unexpected rejection in sendPushToUser", r.reason);
    }
  });

  logger.info("[push] sendPushToUser complete", { userId, sent, failed, removed });
  return { sent, failed, removed };
}
