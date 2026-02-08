/**
 * Client-side PostHog Analytics
 *
 * Phase 30-01: Product analytics with PostHog integration.
 * All functions no-op gracefully when NEXT_PUBLIC_POSTHOG_KEY is not set,
 * following the lazy init pattern used throughout Sahara.
 */

import posthog from "posthog-js";
import { logger } from "@/lib/logger";

let initialized = false;

const POSTHOG_KEY = typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""
  : "";

const POSTHOG_HOST = typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com"
  : "https://app.posthog.com";

/**
 * Initialize PostHog on the client side.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!POSTHOG_KEY) {
    logger.debug("PostHog analytics disabled (no NEXT_PUBLIC_POSTHOG_KEY)");
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      persistence: "localStorage+cookie",
      loaded: () => {
        logger.debug("PostHog analytics initialized");
      },
    });
    initialized = true;
  } catch (error) {
    logger.warn("Failed to initialize PostHog analytics", { error });
  }
}

/**
 * Identify a user in PostHog with optional traits.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  if (!initialized || !POSTHOG_KEY) return;

  try {
    posthog.identify(userId, traits);
  } catch (error) {
    logger.warn("Failed to identify user in PostHog", { error });
  }
}

/**
 * Track a custom event in PostHog.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!initialized || !POSTHOG_KEY) return;

  try {
    posthog.capture(event, properties);
  } catch (error) {
    logger.warn("Failed to track event in PostHog", { error });
  }
}

/**
 * Reset the current user identity (e.g., on logout).
 */
export function resetUser(): void {
  if (!initialized || !POSTHOG_KEY) return;

  try {
    posthog.reset();
  } catch (error) {
    logger.warn("Failed to reset PostHog user", { error });
  }
}

/**
 * Check if analytics has been initialized.
 */
export function isAnalyticsInitialized(): boolean {
  return initialized;
}

/**
 * Direct access to the PostHog instance for advanced usage.
 * Returns undefined if not initialized.
 */
export function getPostHogInstance(): typeof posthog | undefined {
  if (!initialized || !POSTHOG_KEY) return undefined;
  return posthog;
}

export { posthog };
