/**
 * RLS Isolation Tests
 *
 * Verifies that API routes use user-scoped Supabase clients (createClient)
 * and that queries are properly filtered by user_id, preventing cross-user
 * data access.
 *
 * Phase 27-02: Switch API Routes to User-Scoped Clients + Isolation Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// User IDs for isolation testing
// ============================================================================

const USER_A_ID = "aaaaaaaa-1111-4000-8000-aaaaaaaaaaaa";
const USER_B_ID = "bbbbbbbb-2222-4000-8000-bbbbbbbbbbbb";

// ============================================================================
// Hoisted mock functions shared across all tests
// ============================================================================

const { mockGetUser, mockGetSession, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockFrom: vi.fn(),
}));

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
      from: mockFrom,
    })
  ),
  createServiceClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/db/supabase-sql", () => ({
  sql: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/ai/client", () => ({
  generateTrackedResponse: vi.fn(() =>
    Promise.resolve({
      content: '{"overallScore": 75}',
      requestId: "req-123",
      responseId: "resp-123",
      latencyMs: 100,
      variant: "control",
    })
  ),
}));

vi.mock("@/lib/ai/insight-extractor", () => ({
  extractInsights: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/db/subscriptions", () => ({
  getUserSubscription: vi.fn(() =>
    Promise.resolve({
      id: "sub_test",
      userId: "test",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
  ),
}));

vi.mock("@/lib/stripe/config", () => ({
  PLANS: {
    FREE: { id: "free", name: "Free", price: 0, priceId: null },
    FUNDRAISING: { id: "fundraising", name: "Fundraising & Strategy", price: 99, priceId: "price_pro" },
    VENTURE_STUDIO: { id: "venture_studio", name: "Venture Studio", price: 249, priceId: "price_studio" },
  },
  getPlanByPriceId: vi.fn((priceId: string) => {
    if (priceId === "price_pro") return { id: "fundraising", name: "Fundraising & Strategy", price: 99, priceId: "price_pro" };
    if (priceId === "price_studio") return { id: "venture_studio", name: "Venture Studio", price: 249, priceId: "price_studio" };
    return null;
  }),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: vi.fn(() =>
    Promise.resolve({ success: true, limit: 5, remaining: 4, reset: 86400 })
  ),
  checkRateLimitForUser: vi.fn(() =>
    Promise.resolve({ success: true, response: null })
  ),
  applyRateLimitHeaders: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/fred/strategy", () => ({
  generateDocument: vi.fn(() =>
    Promise.resolve({ title: "Test", content: "doc", type: "gtm_plan" })
  ),
  saveStrategyDocument: vi.fn(() =>
    Promise.resolve({ id: "doc-1", title: "Test", type: "gtm_plan" })
  ),
  getStrategyDocuments: vi.fn(() => Promise.resolve([])),
  getStrategyDocumentById: vi.fn(() => Promise.resolve(null)),
  updateStrategyDocument: vi.fn(() => Promise.resolve({})),
  deleteStrategyDocument: vi.fn(() => Promise.resolve()),
  STRATEGY_DOC_TYPES: ["gtm_plan", "competitive_analysis", "fundraising_memo", "pitch_framework", "market_sizing"],
}));

vi.mock("@/lib/fred/irs", () => ({
  calculateIRS: vi.fn(() =>
    Promise.resolve({ overallScore: 72, categories: {} })
  ),
  saveIRSResult: vi.fn(() =>
    Promise.resolve({ id: "irs-1", overallScore: 72 })
  ),
  getIRSHistory: vi.fn(() => Promise.resolve([])),
  getLatestIRS: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/sms/client", () => ({
  sendSMS: vi.fn(() => Promise.resolve()),
}));

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates a deeply chainable Supabase query builder mock.
 * All query builder methods return a thenable that also supports further chaining.
 * Tracks all .eq() calls so we can assert user_id filters.
 */
function createTrackingChainableMock(eqCalls: Array<{ column: string; value: string }>) {
  const mock: Record<string, any> = {};
  const methods = [
    "select", "eq", "neq", "gt", "gte", "lt", "lte", "order",
    "limit", "single", "maybeSingle", "in", "is", "not", "match",
    "filter", "range", "insert", "update", "delete", "upsert",
  ];
  for (const method of methods) {
    mock[method] = vi.fn().mockImplementation((...args: any[]) => {
      if (method === "eq" && args.length >= 2) {
        eqCalls.push({ column: args[0], value: args[1] });
      }
      return Object.assign(
        Promise.resolve({ data: [], error: null, count: 0 }),
        createTrackingChainableMock(eqCalls)
      );
    });
  }
  return mock;
}

function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, options);
}

function mockAuthenticatedUser(userId: string, eqCalls: Array<{ column: string; value: string }>) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email: `${userId}@test.com`,
        created_at: new Date().toISOString(),
      },
    },
    error: null,
  });
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: `token-${userId}`,
        user: { id: userId },
      },
    },
    error: null,
  });
  mockFrom.mockReturnValue(createTrackingChainableMock(eqCalls));
}

// ============================================================================
// Tests
// ============================================================================

describe("RLS Isolation - User-Scoped Client Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fred/history: Chat messages isolated per user", () => {
    it("should filter User A queries by User A's user_id only", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/fred/history/route");
      const request = createMockRequest("/api/fred/history");

      await GET(request);

      // Verify user_id filter was applied with User A's ID
      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      expect(userIdFilters.length).toBeGreaterThan(0);
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_A_ID);
      }
    });

    it("should never include User B's ID in User A's queries", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/fred/history/route");
      const request = createMockRequest("/api/fred/history");

      await GET(request);

      // No filter should reference User B's ID
      const crossUserFilters = eqCalls.filter((c) => c.value === USER_B_ID);
      expect(crossUserFilters).toHaveLength(0);
    });
  });

  describe("dashboard/stats: Stats reflect only own data", () => {
    it("should scope all stat queries to the authenticated user", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/dashboard/stats/route");

      await GET();

      // Dashboard stats queries multiple tables - all should filter by user_id
      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      expect(userIdFilters.length).toBeGreaterThan(0);
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_A_ID);
      }
    });

    it("should not leak User B stats to User A", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/dashboard/stats/route");

      await GET();

      const crossUserFilters = eqCalls.filter((c) => c.value === USER_B_ID);
      expect(crossUserFilters).toHaveLength(0);
    });
  });

  describe("fred/strategy: Strategy documents isolated", () => {
    it("should pass the user-scoped client to strategy queries", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/fred/strategy/route");
      const request = createMockRequest("/api/fred/strategy");

      const response = await GET(request);
      expect(response.status).toBe(200);

      // The strategy GET passes supabase client to getStrategyDocuments
      // which internally filters by user_id. Verify createClient was called.
      const { createClient } = await import("@/lib/supabase/server");
      expect(createClient).toHaveBeenCalled();
    });

    it("should not allow User B to access User A strategy documents", async () => {
      // Authenticate as User B
      const eqCallsB: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_B_ID, eqCallsB);

      const { GET } = await import("@/app/api/fred/strategy/route");
      const request = createMockRequest("/api/fred/strategy");

      await GET(request);

      // All user_id filters should reference User B, never User A
      const userIdFilters = eqCallsB.filter((c) => c.column === "user_id");
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_B_ID);
      }
      const crossUserFilters = eqCallsB.filter((c) => c.value === USER_A_ID);
      expect(crossUserFilters).toHaveLength(0);
    });
  });

  describe("investor-lens: Investor analysis isolated", () => {
    it("should filter evaluations by the authenticated user's ID", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/investor-lens/route");
      const request = createMockRequest("/api/investor-lens");

      await GET(request);

      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      expect(userIdFilters.length).toBeGreaterThan(0);
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_A_ID);
      }
    });

    it("should isolate User B's evaluations from User A", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_B_ID, eqCalls);

      const { GET } = await import("@/app/api/investor-lens/route");
      const request = createMockRequest("/api/investor-lens");

      await GET(request);

      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_B_ID);
      }
      const crossUserFilters = eqCalls.filter((c) => c.value === USER_A_ID);
      expect(crossUserFilters).toHaveLength(0);
    });
  });

  describe("journey/stats: Journey events isolated", () => {
    it("should scope all journey queries to the authenticated user", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/journey/stats/route");
      const request = createMockRequest("/api/journey/stats");

      await GET(request);

      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      expect(userIdFilters.length).toBeGreaterThan(0);
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_A_ID);
      }
    });

    it("should not include User B data in User A journey stats", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/journey/stats/route");
      const request = createMockRequest("/api/journey/stats");

      await GET(request);

      const crossUserFilters = eqCalls.filter((c) => c.value === USER_B_ID);
      expect(crossUserFilters).toHaveLength(0);
    });
  });

  describe("diagnostic/state: Diagnostic state isolated", () => {
    it("should scope diagnostic state to authenticated user", async () => {
      const eqCalls: Array<{ column: string; value: string }> = [];
      mockAuthenticatedUser(USER_A_ID, eqCalls);

      const { GET } = await import("@/app/api/diagnostic/state/route");

      await GET();

      const userIdFilters = eqCalls.filter((c) => c.column === "user_id");
      expect(userIdFilters.length).toBeGreaterThan(0);
      for (const filter of userIdFilters) {
        expect(filter.value).toBe(USER_A_ID);
      }
    });
  });
});

describe("RLS Isolation - Service Client Elimination Verification", () => {
  /**
   * Verify that none of the 10 target routes import or use createServiceClient.
   * This is a static analysis test that reads the actual source files.
   */
  const targetRoutes = [
    "app/api/investor-lens/route.ts",
    "app/api/investor-lens/deck-review/route.ts",
    "app/api/journey/stats/route.ts",
    "app/api/sms/verify/route.ts",
    "app/api/fred/history/route.ts",
    "app/api/dashboard/stats/route.ts",
    "app/api/fred/strategy/route.ts",
    "app/api/fred/strategy/[id]/route.ts",
    "app/api/fred/investor-readiness/route.ts",
    "app/api/diagnostic/state/route.ts",
  ];

  it("should have exactly 10 target routes to verify", () => {
    expect(targetRoutes).toHaveLength(10);
  });

  for (const route of targetRoutes) {
    it(`${route} should not use createServiceClient`, () => {
      const filePath = path.resolve(process.cwd(), route);
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // Must not import or call createServiceClient
      expect(fileContent).not.toContain("createServiceClient");

      // Must import createClient (the user-scoped version)
      expect(fileContent).toContain("createClient");
    });
  }

  for (const route of targetRoutes) {
    it(`${route} should use await createClient() (async user-scoped)`, () => {
      const filePath = path.resolve(process.cwd(), route);
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // The user-scoped createClient is async and must be awaited
      expect(fileContent).toMatch(/await\s+createClient\(\)/);
    });
  }
});
