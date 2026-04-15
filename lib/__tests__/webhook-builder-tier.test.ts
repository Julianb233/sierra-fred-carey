/**
 * Webhook BUILDER Tier Integration Tests
 *
 * Tests the Stripe webhook handler's ability to process BUILDER ($39) tier
 * checkout events end-to-end, including the critical C3 pitfall where
 * subscription.updated arrives before checkout.session.completed.
 *
 * Phase: 91-03
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

// Mock environment variables
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_fake");
vi.stubEnv("NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID", "price_builder_test_123");

const mockConstructWebhookEvent = vi.fn();
const mockGetSubscription = vi.fn();

vi.mock("@/lib/stripe/server", () => ({
  constructWebhookEvent: (...args: unknown[]) => mockConstructWebhookEvent(...args),
  getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
}));

const mockCreateOrUpdateSubscription = vi.fn().mockResolvedValue({
  userId: "user-123",
  stripeCustomerId: "cus_builder_123",
  stripeSubscriptionId: "sub_builder_123",
  stripePriceId: "price_builder_test_123",
  status: "active",
});
const mockGetSubscriptionByCustomerId = vi.fn();
const mockRecordStripeEvent = vi.fn();
const mockGetStripeEventById = vi.fn();
const mockMarkEventAsProcessed = vi.fn().mockResolvedValue(undefined);
const mockMarkEventAsFailed = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db/subscriptions", () => ({
  createOrUpdateSubscription: (...args: unknown[]) => mockCreateOrUpdateSubscription(...args),
  getSubscriptionByCustomerId: (...args: unknown[]) => mockGetSubscriptionByCustomerId(...args),
  recordStripeEvent: (...args: unknown[]) => mockRecordStripeEvent(...args),
  getStripeEventById: (...args: unknown[]) => mockGetStripeEventById(...args),
  markEventAsProcessed: (...args: unknown[]) => mockMarkEventAsProcessed(...args),
  markEventAsFailed: (...args: unknown[]) => mockMarkEventAsFailed(...args),
}));

const mockServerTrack = vi.fn();
vi.mock("@/lib/analytics/server", () => ({
  serverTrack: (...args: unknown[]) => mockServerTrack(...args),
}));

vi.mock("@/lib/analytics/events", () => ({
  ANALYTICS_EVENTS: {
    SUBSCRIPTION: {
      CHECKOUT_COMPLETED: "subscription.checkout_completed",
      TIER_CHANGED: "subscription.tier_changed",
    },
  },
}));

vi.mock("@/lib/sentry", () => ({
  captureError: vi.fn(),
  captureMessage: vi.fn(),
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const BUILDER_PRICE_ID = "price_builder_test_123";

function makeStripeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_builder_123",
    customer: "cus_builder_123",
    status: "active",
    metadata: {},
    items: {
      data: [
        {
          price: { id: BUILDER_PRICE_ID },
        },
      ],
    } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function makeRequest(body = "webhook-payload"): NextRequest {
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": "sig_test_valid",
      "content-type": "application/json",
    },
  });
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("Stripe Webhook — BUILDER Tier Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: recordStripeEvent returns a valid event (not already claimed)
    mockRecordStripeEvent.mockResolvedValue({
      id: "evt-db-id-123",
      stripeEventId: "evt_test_123",
      type: "checkout.session.completed",
      status: "pending",
    });
  });

  it("Scenario 1: createOrUpdateSubscription called with BUILDER price ID on checkout", async () => {
    const subscription = makeStripeSubscription();

    mockConstructWebhookEvent.mockResolvedValue({
      id: "evt_test_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          mode: "subscription",
          subscription: "sub_builder_123",
          client_reference_id: "user-123",
          customer: "cus_builder_123",
        },
      },
    });

    mockGetSubscription.mockResolvedValue(subscription);

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    // Verify createOrUpdateSubscription was called with the BUILDER price ID
    expect(mockCreateOrUpdateSubscription).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateOrUpdateSubscription.mock.calls[0][0];
    expect(callArgs.stripePriceId).toBe(BUILDER_PRICE_ID);
    expect(callArgs.userId).toBe("user-123");
    expect(callArgs.stripeSubscriptionId).toBe("sub_builder_123");
    expect(callArgs.status).toBe("active");

    // Verify analytics tracked the checkout
    expect(mockServerTrack).toHaveBeenCalledWith(
      "user-123",
      "subscription.checkout_completed",
      expect.objectContaining({ priceId: BUILDER_PRICE_ID })
    );
  });

  it("Scenario 2: checkout.session.completed happy path marks event as processed", async () => {
    const subscription = makeStripeSubscription();

    mockConstructWebhookEvent.mockResolvedValue({
      id: "evt_test_checkout_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_456",
          mode: "subscription",
          subscription: "sub_builder_123",
          client_reference_id: "user-123",
          customer: "cus_builder_123",
        },
      },
    });

    mockGetSubscription.mockResolvedValue(subscription);

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockCreateOrUpdateSubscription).toHaveBeenCalledTimes(1);
    expect(mockMarkEventAsProcessed).toHaveBeenCalledWith("evt-db-id-123");
    expect(mockMarkEventAsFailed).not.toHaveBeenCalled();
  });

  it("Scenario 3: subscription.updated before session.completed resolves userId via DB fallback", async () => {
    // subscription.updated arrives — metadata.userId is NOT set yet (race condition)
    const subscription = makeStripeSubscription({
      metadata: {}, // No userId in metadata
    });

    mockConstructWebhookEvent.mockResolvedValue({
      id: "evt_test_sub_updated_1",
      type: "customer.subscription.updated",
      data: { object: subscription },
    });

    // DB fallback: we already have a subscription record from a prior event
    mockGetSubscriptionByCustomerId.mockResolvedValue({
      userId: "user-123",
      stripeCustomerId: "cus_builder_123",
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    // userId resolved via DB fallback -> createOrUpdateSubscription called
    expect(mockCreateOrUpdateSubscription).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateOrUpdateSubscription.mock.calls[0][0];
    expect(callArgs.userId).toBe("user-123");
    expect(callArgs.stripePriceId).toBe(BUILDER_PRICE_ID);

    // Verify the DB fallback was invoked
    expect(mockGetSubscriptionByCustomerId).toHaveBeenCalledWith("cus_builder_123");

    // Should NOT have failed
    expect(mockMarkEventAsFailed).not.toHaveBeenCalled();
    expect(mockMarkEventAsProcessed).toHaveBeenCalledWith("evt-db-id-123");
  });

  it("Scenario 4: subscription.updated with no userId resolution marks event as failed", async () => {
    // subscription.updated — no metadata, no DB record
    const subscription = makeStripeSubscription({
      metadata: {},
    });

    mockConstructWebhookEvent.mockResolvedValue({
      id: "evt_test_sub_updated_2",
      type: "customer.subscription.updated",
      data: { object: subscription },
    });

    // DB fallback returns nothing — no prior subscription exists
    mockGetSubscriptionByCustomerId.mockResolvedValue(null);

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    // Should NOT have updated subscription (no userId)
    expect(mockCreateOrUpdateSubscription).not.toHaveBeenCalled();

    // Should have marked event as failed
    expect(mockMarkEventAsFailed).toHaveBeenCalledWith(
      "evt-db-id-123",
      expect.stringContaining("No userId found")
    );
  });
});
