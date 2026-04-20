/**
 * Tier Resolution Tests
 *
 * Phase 91-02: Comprehensive tests for BUILDER tier resolution across all code paths.
 * Covers: getTierFromString, canAccessFeature, getUpgradeTier, getPlanByPriceId,
 *         getPlanById, getProfileTier (bug fix), getUserTier (subscription path).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UserTier,
  getTierFromString,
  canAccessFeature,
  getUpgradeTier,
} from "@/lib/constants";
import { getPlanByPriceId, getPlanById, PLANS } from "@/lib/stripe/config";

// ============================================================================
// Pure function tests (no mocks needed)
// ============================================================================

describe("getTierFromString", () => {
  it("returns BUILDER for 'builder'", () => {
    expect(getTierFromString("builder")).toBe(UserTier.BUILDER);
  });

  it("returns BUILDER for 'BUILDER' (case insensitive)", () => {
    expect(getTierFromString("BUILDER")).toBe(UserTier.BUILDER);
  });

  it("returns PRO for 'pro'", () => {
    expect(getTierFromString("pro")).toBe(UserTier.PRO);
  });

  it("returns PRO for 'fundraising' (legacy alias)", () => {
    expect(getTierFromString("fundraising")).toBe(UserTier.PRO);
  });

  it("returns STUDIO for 'studio'", () => {
    expect(getTierFromString("studio")).toBe(UserTier.STUDIO);
  });

  it("returns STUDIO for 'venture_studio' (legacy alias)", () => {
    expect(getTierFromString("venture_studio")).toBe(UserTier.STUDIO);
  });

  it("returns FREE for unknown string", () => {
    expect(getTierFromString("unknown")).toBe(UserTier.FREE);
  });

  it("returns FREE for empty string", () => {
    expect(getTierFromString("")).toBe(UserTier.FREE);
  });
});

describe("canAccessFeature", () => {
  it("BUILDER can access BUILDER features", () => {
    expect(canAccessFeature(UserTier.BUILDER, UserTier.BUILDER)).toBe(true);
  });

  it("FREE cannot access BUILDER features", () => {
    expect(canAccessFeature(UserTier.FREE, UserTier.BUILDER)).toBe(false);
  });

  it("PRO can access BUILDER features (higher tier)", () => {
    expect(canAccessFeature(UserTier.PRO, UserTier.BUILDER)).toBe(true);
  });

  it("STUDIO can access BUILDER features (highest tier)", () => {
    expect(canAccessFeature(UserTier.STUDIO, UserTier.BUILDER)).toBe(true);
  });

  it("BUILDER cannot access PRO features (lower tier)", () => {
    expect(canAccessFeature(UserTier.BUILDER, UserTier.PRO)).toBe(false);
  });

  it("FREE can access FREE features", () => {
    expect(canAccessFeature(UserTier.FREE, UserTier.FREE)).toBe(true);
  });
});

describe("getUpgradeTier", () => {
  it("FREE upgrades to BUILDER", () => {
    expect(getUpgradeTier(UserTier.FREE)).toBe(UserTier.BUILDER);
  });

  it("BUILDER upgrades to PRO", () => {
    expect(getUpgradeTier(UserTier.BUILDER)).toBe(UserTier.PRO);
  });

  it("PRO upgrades to STUDIO", () => {
    expect(getUpgradeTier(UserTier.PRO)).toBe(UserTier.STUDIO);
  });

  it("STUDIO has no upgrade (returns null)", () => {
    expect(getUpgradeTier(UserTier.STUDIO)).toBeNull();
  });
});

// ============================================================================
// Stripe config tests
// ============================================================================

describe("getPlanByPriceId", () => {
  it("returns null for unknown price ID", () => {
    expect(getPlanByPriceId("price_nonexistent_999")).toBeNull();
  });
});

describe("getPlanById", () => {
  it("returns BUILDER plan with price 39", () => {
    const plan = getPlanById("builder");
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe("builder");
    expect(plan!.price).toBe(39);
  });

  it("returns FUNDRAISING plan for 'fundraising'", () => {
    const plan = getPlanById("fundraising");
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe("fundraising");
    expect(plan!.price).toBe(99);
  });

  it("returns VENTURE_STUDIO plan for 'venture_studio'", () => {
    const plan = getPlanById("venture_studio");
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe("venture_studio");
    expect(plan!.price).toBe(249);
  });

  it("returns null for nonexistent plan", () => {
    expect(getPlanById("nonexistent")).toBeNull();
  });
});

// ============================================================================
// getProfileTier tests (requires Supabase mock) — THE BUG
// ============================================================================

// Mock Supabase server module
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
  createClient: vi.fn(),
}));

// Mock subscriptions module
vi.mock("@/lib/db/subscriptions", () => ({
  getUserSubscription: vi.fn(),
}));

describe("getProfileTier (bug: BUILDER falls through to null)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns BUILDER when profiles.tier = 1", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: 1 },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    // Import getUserTier which internally calls getProfileTier
    const { getUserTier } = await import("@/lib/api/tier-middleware");
    const { getUserSubscription } = await import("@/lib/db/subscriptions");

    // No subscription — forces fallback to getProfileTier
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const tier = await getUserTier("user-123");
    expect(tier).toBe(UserTier.BUILDER);
  });

  it("returns PRO when profiles.tier = 2", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: 2 },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserTier } = await import("@/lib/api/tier-middleware");
    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const tier = await getUserTier("user-456");
    expect(tier).toBe(UserTier.PRO);
  });

  it("returns STUDIO when profiles.tier = 3", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: 3 },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserTier } = await import("@/lib/api/tier-middleware");
    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const tier = await getUserTier("user-789");
    expect(tier).toBe(UserTier.STUDIO);
  });

  it("returns FREE when profiles.tier is null", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: null },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserTier } = await import("@/lib/api/tier-middleware");
    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const tier = await getUserTier("user-000");
    expect(tier).toBe(UserTier.FREE);
  });
});

// ============================================================================
// getUserTier subscription-based path (end-to-end through tier-middleware)
// ============================================================================

describe("getUserTier subscription-based resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns BUILDER for active BUILDER subscription (no profile override)", async () => {
    const BUILDER_PRICE_ID = "price_builder_sub_test";
    process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID = BUILDER_PRICE_ID;

    const { createServiceClient } = await import("@/lib/supabase/server");
    // Profile returns null tier (no override)
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: null },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue({
      userId: "user-sub-builder",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: BUILDER_PRICE_ID,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      canceledAt: null,
      cancelAtPeriodEnd: false,
      trialStart: null,
      trialEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock getPlanByPriceId to return the builder plan for our test price ID
    vi.doMock("@/lib/stripe/config", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/stripe/config")>();
      return {
        ...actual,
        getPlanByPriceId: (priceId: string) => {
          if (priceId === BUILDER_PRICE_ID) {
            return { id: "builder", name: "Builder", price: 39, priceId: BUILDER_PRICE_ID, features: [] };
          }
          return actual.getPlanByPriceId(priceId);
        },
      };
    });

    const { getUserTier } = await import("@/lib/api/tier-middleware");

    const tier = await getUserTier("user-sub-builder");
    expect(tier).toBe(UserTier.BUILDER);
  });

  it("returns PRO for active FUNDRAISING subscription", async () => {
    const PRO_PRICE_ID = "price_pro_sub_test";

    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: null },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue({
      userId: "user-sub-pro",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: PRO_PRICE_ID,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      canceledAt: null,
      cancelAtPeriodEnd: false,
      trialStart: null,
      trialEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.doMock("@/lib/stripe/config", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/stripe/config")>();
      return {
        ...actual,
        getPlanByPriceId: (priceId: string) => {
          if (priceId === PRO_PRICE_ID) {
            return { id: "fundraising", name: "Pro", price: 99, priceId: PRO_PRICE_ID, features: [] };
          }
          return actual.getPlanByPriceId(priceId);
        },
      };
    });

    const { getUserTier } = await import("@/lib/api/tier-middleware");

    const tier = await getUserTier("user-sub-pro");
    expect(tier).toBe(UserTier.PRO);
  });

  it("returns FREE when subscription is canceled", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: { tier: null },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue({
      userId: "user-canceled",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_builder_test",
      status: "canceled",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      canceledAt: new Date(),
      cancelAtPeriodEnd: false,
      trialStart: null,
      trialEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { getUserTier } = await import("@/lib/api/tier-middleware");

    const tier = await getUserTier("user-canceled");
    expect(tier).toBe(UserTier.FREE);
  });

  it("returns FREE when no subscription exists and no profile tier", async () => {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
    } as any);

    const { getUserSubscription } = await import("@/lib/db/subscriptions");
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const { getUserTier } = await import("@/lib/api/tier-middleware");

    const tier = await getUserTier("user-none");
    expect(tier).toBe(UserTier.FREE);
  });
});
