/**
 * Engagement Analytics Tests
 *
 * Phase 30-02: Tests for the admin engagement analytics API
 * and event constant exports.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock admin auth -- defaults to unauthorized
const mockIsAdminRequest = vi.fn().mockReturnValue(false);
vi.mock("@/lib/auth/admin", () => ({
  requireAdminRequest: (request: NextRequest) => {
    if (!mockIsAdminRequest(request)) {
      const { NextResponse } = require("next/server");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  },
}));

// Mock Supabase service client
const mockSelect = vi.fn().mockResolvedValue({ count: 0, data: null, error: null });
const mockEq = vi.fn().mockReturnValue({ count: 0, data: null, error: null });
const mockGte = vi.fn().mockReturnValue({ count: 0, data: null, error: null });

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    count: 0,
    data: null,
    error: null,
    eq: mockEq,
    gte: mockGte,
  }),
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests: Admin auth guard
// ---------------------------------------------------------------------------

describe("Admin Analytics Engagement API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdminRequest.mockReturnValue(false);
  });

  it("should return 401 when request is not from an admin", async () => {
    const { GET } = await import(
      "@/app/api/admin/analytics/engagement/route"
    );

    const request = new NextRequest("http://localhost/api/admin/analytics/engagement");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 200 with metrics structure when admin is authenticated", async () => {
    mockIsAdminRequest.mockReturnValue(true);

    // Make the mock chain return proper count values
    const mockSelectResult = {
      count: 10,
      data: null,
      error: null,
      eq: vi.fn().mockReturnValue({ count: 5, data: null, error: null }),
      gte: vi.fn().mockReturnValue({ count: 3, data: null, error: null }),
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(mockSelectResult),
    });

    const { GET } = await import(
      "@/app/api/admin/analytics/engagement/route"
    );

    const request = new NextRequest("http://localhost/api/admin/analytics/engagement");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Validate the metrics structure
    expect(body).toHaveProperty("totalUsers");
    expect(body).toHaveProperty("activeUsers7d");
    expect(body).toHaveProperty("newSignups7d");
    expect(body).toHaveProperty("onboardingCompletionRate");
    expect(body).toHaveProperty("featureAdoption");
    expect(body.featureAdoption).toHaveProperty("chat");
    expect(body.featureAdoption).toHaveProperty("realityLens");
    expect(body.featureAdoption).toHaveProperty("pitchDeck");
    expect(body.featureAdoption).toHaveProperty("agents");

    // Values should be numbers
    expect(typeof body.totalUsers).toBe("number");
    expect(typeof body.activeUsers7d).toBe("number");
    expect(typeof body.newSignups7d).toBe("number");
    expect(typeof body.onboardingCompletionRate).toBe("number");
    expect(typeof body.featureAdoption.chat).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Tests: Event constants
// ---------------------------------------------------------------------------

describe("Analytics Event Constants", () => {
  it("should export ANALYTICS_EVENTS with all required categories", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS).toBeDefined();
    expect(ANALYTICS_EVENTS.AUTH).toBeDefined();
    expect(ANALYTICS_EVENTS.ONBOARDING).toBeDefined();
    expect(ANALYTICS_EVENTS.CHAT).toBeDefined();
    expect(ANALYTICS_EVENTS.FEATURES).toBeDefined();
    expect(ANALYTICS_EVENTS.SUBSCRIPTION).toBeDefined();
    expect(ANALYTICS_EVENTS.ENGAGEMENT).toBeDefined();
  });

  it("should have correct onboarding event names for tracking", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.ONBOARDING.STARTED).toBe("onboarding.started");
    expect(ANALYTICS_EVENTS.ONBOARDING.STEP_COMPLETED).toBe("onboarding.step_completed");
    expect(ANALYTICS_EVENTS.ONBOARDING.COMPLETED).toBe("onboarding.completed");
  });

  it("should have correct chat event names for tracking", async () => {
    const { ANALYTICS_EVENTS } = await import("@/lib/analytics/events");

    expect(ANALYTICS_EVENTS.CHAT.SESSION_STARTED).toBe("chat.session_started");
    expect(ANALYTICS_EVENTS.CHAT.MESSAGE_SENT).toBe("chat.message_sent");
  });

  it("should export property type interfaces (compile-time check)", async () => {
    // This test validates that the module exports compile successfully.
    // TypeScript interfaces are erased at runtime, so we verify the module
    // loads without errors and exports the event constant.
    const mod = await import("@/lib/analytics/events");
    expect(mod.ANALYTICS_EVENTS).toBeDefined();
    expect(typeof mod.ANALYTICS_EVENTS).toBe("object");
  });
});
