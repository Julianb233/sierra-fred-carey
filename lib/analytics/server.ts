/**
 * Server-side PostHog Analytics
 *
 * Phase 30-01: Server-side analytics for tracking events from API routes
 * and server components. Uses posthog-node with singleton pattern and
 * lazy initialization.
 */

import { PostHog } from "posthog-node";
import { logger } from "@/lib/logger";

let client: PostHog | null = null;

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

/**
 * Get or create the server-side PostHog client.
 * Returns null when POSTHOG_API_KEY is not set.
 */
function getClient(): PostHog | null {
  if (!POSTHOG_API_KEY) return null;
  if (client) return client;

  try {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10000,
    });
    logger.debug("Server-side PostHog client initialized");
    return client;
  } catch (error) {
    logger.warn("Failed to initialize server-side PostHog client", { error });
    return null;
  }
}

/**
 * Track an event from the server side.
 * No-ops when POSTHOG_API_KEY is not set.
 */
export function serverTrack(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({
      distinctId: userId,
      event,
      properties,
    });
  } catch (error) {
    logger.warn("Server-side PostHog capture failed", { error });
  }
}

/**
 * Identify a user from the server side with optional traits.
 * No-ops when POSTHOG_API_KEY is not set.
 */
export function serverIdentify(
  userId: string,
  traits?: Record<string, unknown>
): void {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.identify({
      distinctId: userId,
      properties: traits,
    });
  } catch (error) {
    logger.warn("Server-side PostHog identify failed", { error });
  }
}

/**
 * Flush any pending events. Call before process exit.
 */
export async function flushAnalytics(): Promise<void> {
  if (!client) return;

  try {
    await client.flush();
  } catch (error) {
    logger.warn("Failed to flush PostHog events", { error });
  }
}

/**
 * Shutdown the PostHog client cleanly.
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;

  try {
    await client.shutdown();
    client = null;
  } catch (error) {
    logger.warn("Failed to shutdown PostHog client", { error });
  }
}

// Flush pending events on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    if (client) {
      client.flush().catch(() => {
        // Ignore flush errors during shutdown
      });
    }
  });
}
