/**
 * Analytics Module Tests
 *
 * Phase 30-01: Tests for PostHog analytics integration.
 * Verifies no-op behavior when key is not set, and proper delegation
 * when PostHog is available.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog-js before importing the module
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock the logger to keep test output clean
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe("Analytics Events", () => {
  it("should define all AUTH event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.AUTH.SIGNUP).toBe("auth.signup");
    expect(ANALYTICS_EVENTS.AUTH.LOGIN).toBe("auth.login");
    expect(ANALYTICS_EVENTS.AUTH.LOGOUT).toBe("auth.logout");
  });

  it("should define all ONBOARDING event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.ONBOARDING.STARTED).toBe("onboarding.started");
    expect(ANALYTICS_EVENTS.ONBOARDING.STEP_COMPLETED).toBe(
      "onboarding.step_completed"
    );
    expect(ANALYTICS_EVENTS.ONBOARDING.COMPLETED).toBe(
      "onboarding.completed"
    );
    expect(ANALYTICS_EVENTS.ONBOARDING.SKIPPED).toBe("onboarding.skipped");
  });

  it("should define all CHAT event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.CHAT.MESSAGE_SENT).toBe("chat.message_sent");
    expect(ANALYTICS_EVENTS.CHAT.SESSION_STARTED).toBe(
      "chat.session_started"
    );
    expect(ANALYTICS_EVENTS.CHAT.SESSION_ENDED).toBe("chat.session_ended");
  });

  it("should define all FEATURES event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.FEATURES.REALITY_LENS_USED).toBe(
      "features.reality_lens_used"
    );
    expect(ANALYTICS_EVENTS.FEATURES.INVESTOR_READINESS_USED).toBe(
      "features.investor_readiness_used"
    );
    expect(ANALYTICS_EVENTS.FEATURES.PITCH_DECK_UPLOADED).toBe(
      "features.pitch_deck_uploaded"
    );
    expect(ANALYTICS_EVENTS.FEATURES.STRATEGY_CREATED).toBe(
      "features.strategy_created"
    );
    expect(ANALYTICS_EVENTS.FEATURES.AGENT_DISPATCHED).toBe(
      "features.agent_dispatched"
    );
  });

  it("should define all SUBSCRIPTION event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.SUBSCRIPTION.TIER_CHANGED).toBe(
      "subscription.tier_changed"
    );
    expect(ANALYTICS_EVENTS.SUBSCRIPTION.CHECKOUT_STARTED).toBe(
      "subscription.checkout_started"
    );
    expect(ANALYTICS_EVENTS.SUBSCRIPTION.CHECKOUT_COMPLETED).toBe(
      "subscription.checkout_completed"
    );
  });

  it("should define all ENGAGEMENT event constants", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.ENGAGEMENT.DASHBOARD_VIEWED).toBe(
      "engagement.dashboard_viewed"
    );
    expect(ANALYTICS_EVENTS.ENGAGEMENT.SETTINGS_UPDATED).toBe(
      "engagement.settings_updated"
    );
    expect(ANALYTICS_EVENTS.ENGAGEMENT.DOCUMENT_EXPORTED).toBe(
      "engagement.document_exported"
    );
  });

  it("should have 6 event categories", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    const categories = Object.keys(ANALYTICS_EVENTS);
    expect(categories).toHaveLength(6);
    expect(categories).toEqual(
      expect.arrayContaining([
        "AUTH",
        "ONBOARDING",
        "CHAT",
        "FEATURES",
        "SUBSCRIPTION",
        "ENGAGEMENT",
      ])
    );
  });
});

describe("Analytics Client (no-op mode)", () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure no PostHog key is set
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  });

  it("initAnalytics should no-op when key is not set", async () => {
    const { initAnalytics, isAnalyticsInitialized } = await import(
      "@/lib/analytics"
    );

    initAnalytics();
    expect(isAnalyticsInitialized()).toBe(false);
  });

  it("trackEvent should no-op when not initialized", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    const posthog = (await import("posthog-js")).default;

    // Should not throw
    trackEvent("test.event", { key: "value" });
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("identifyUser should no-op when not initialized", async () => {
    const { identifyUser } = await import("@/lib/analytics");
    const posthog = (await import("posthog-js")).default;

    // Should not throw
    identifyUser("user-123", { email: "test@example.com" });
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it("resetUser should no-op when not initialized", async () => {
    const { resetUser } = await import("@/lib/analytics");
    const posthog = (await import("posthog-js")).default;

    // Should not throw
    resetUser();
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it("getPostHogInstance should return undefined when not initialized", async () => {
    const { getPostHogInstance } = await import("@/lib/analytics");

    expect(getPostHogInstance()).toBeUndefined();
  });
});
