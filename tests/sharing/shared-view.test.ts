/**
 * Shared View Tests
 * Phase 33-02: Collaboration & Sharing
 *
 * Tests for the shared resource viewer page logic:
 * - Shared viewer renders document content
 * - Expired links return 404
 * - View count increment on access
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockFrom,
  mockSingle,
  mockEq,
  mockUpdate,
  mockSelect,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();

  const mockEq = vi.fn((): unknown => ({
    eq: mockEq,
    single: mockSingle,
    select: vi.fn(() => ({ single: mockSingle })),
  }));

  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    single: mockSingle,
  }));

  const mockUpdate = vi.fn(() => ({
    eq: mockEq,
  }));

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
  }));

  return {
    mockFrom,
    mockSingle,
    mockEq,
    mockUpdate,
    mockSelect,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// ============================================================================
// Tests: Shared Viewer - Document Content
// ============================================================================

describe("Shared Viewer - getSharedResource returns document content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full resource data for a valid share token", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    const validLink = {
      id: "link-1",
      user_id: "user-1",
      resource_type: "strategy_document",
      resource_id: "doc-1",
      token: "a".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: null,
      view_count: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockDocument = {
      id: "doc-1",
      user_id: "user-1",
      title: "Executive Summary for Acme",
      content: "This is the strategy document content.",
      doc_type: "executive_summary",
      sections: [
        { title: "Overview", content: "Company overview here" },
        { title: "Market", content: "Market analysis here" },
      ],
      created_at: new Date().toISOString(),
    };

    // First call: getShareLink -> from("shared_links").select("*").eq("token",...).eq("is_active",...).single()
    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: validLink, error: null })
      // Second call: from("strategy_documents").select("*").eq("id",...).single()
      .mockResolvedValueOnce({ data: mockDocument, error: null });

    const result = await getSharedResource("a".repeat(64));

    expect(result).not.toBeNull();
    expect(result!.resourceType).toBe("strategy_document");
    expect(result!.resource).toBeDefined();
    expect(result!.resource.title).toBe("Executive Summary for Acme");
    expect(result!.resource.content).toBe("This is the strategy document content.");
    expect(result!.link.token).toBe("a".repeat(64));
  });

  it("returns pitch review data with scores for pitch_review type", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    const validLink = {
      id: "link-2",
      user_id: "user-1",
      resource_type: "pitch_review",
      resource_id: "pitch-1",
      token: "b".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: null,
      view_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockPitchReview = {
      id: "pitch-1",
      user_id: "user-1",
      overall_score: 72,
      scores: { story: 80, market: 65, team: 70 },
      feedback: "Strong narrative, needs market data.",
      strengths: ["Clear problem statement"],
      weaknesses: ["Missing competitive analysis"],
      created_at: new Date().toISOString(),
    };

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: validLink, error: null })
      .mockResolvedValueOnce({ data: mockPitchReview, error: null });

    const result = await getSharedResource("b".repeat(64));

    expect(result).not.toBeNull();
    expect(result!.resourceType).toBe("pitch_review");
    expect(result!.resource.overall_score).toBe(72);
    expect(result!.resource.scores).toEqual({ story: 80, market: 65, team: 70 });
  });
});

// ============================================================================
// Tests: Expired Links Return Null (404 path)
// ============================================================================

describe("Shared Viewer - Expired links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for expired share links", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    const expiredLink = {
      id: "link-expired",
      user_id: "user-1",
      resource_type: "strategy_document",
      resource_id: "doc-1",
      token: "c".repeat(64),
      access_level: "view",
      expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      max_views: null,
      view_count: 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // getShareLink returns the expired link from DB (is_active=true but expires_at is past)
    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: expiredLink, error: null });

    const result = await getSharedResource("c".repeat(64));

    // Should return null because getShareLink returns null for expired links
    expect(result).toBeNull();
  });

  it("returns null for links with exceeded max views", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    const maxedLink = {
      id: "link-maxed",
      user_id: "user-1",
      resource_type: "investor_readiness",
      resource_id: "irs-1",
      token: "d".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: 10,
      view_count: 10, // Already at max
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: maxedLink, error: null });

    const result = await getSharedResource("d".repeat(64));
    expect(result).toBeNull();
  });

  it("returns null for inactive (revoked) links", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    // When is_active=false, the DB query itself filters it out
    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await getSharedResource("e".repeat(64));
    expect(result).toBeNull();
  });

  it("returns null for non-existent tokens", async () => {
    const { getSharedResource } = await import("@/lib/sharing");

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await getSharedResource("f".repeat(64));
    expect(result).toBeNull();
  });
});

// ============================================================================
// Tests: View Count Increment
// ============================================================================

describe("Shared Viewer - View count increment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments view_count when a valid share link is accessed", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    const activeLink = {
      id: "link-active",
      user_id: "user-1",
      resource_type: "strategy_document",
      resource_id: "doc-1",
      token: "g".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: null,
      view_count: 7,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: activeLink, error: null });

    const result = await getShareLink("g".repeat(64));

    // getShareLink should return the link with incremented view count
    expect(result).not.toBeNull();
    expect(result!.view_count).toBe(8);

    // Verify that update was called to increment view_count
    expect(mockUpdate).toHaveBeenCalled();
    const updateArgs = mockUpdate.mock.calls[0]?.[0];
    expect(updateArgs).toMatchObject({ view_count: 8 });
  });

  it("returns incremented view_count in the response", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    const linkWithViews = {
      id: "link-views",
      user_id: "user-1",
      resource_type: "pitch_review",
      resource_id: "pitch-1",
      token: "h".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: 100,
      view_count: 42,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: linkWithViews, error: null });

    const result = await getShareLink("h".repeat(64));

    expect(result).not.toBeNull();
    expect(result!.view_count).toBe(43);
  });

  it("does NOT increment view_count for expired links", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    const expiredLink = {
      id: "link-expired-2",
      user_id: "user-1",
      resource_type: "strategy_document",
      resource_id: "doc-1",
      token: "i".repeat(64),
      access_level: "view",
      expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      max_views: null,
      view_count: 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Reset update mock to track calls
    mockUpdate.mockClear();

    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: expiredLink, error: null });

    const result = await getShareLink("i".repeat(64));

    // Should return null for expired links (no increment)
    expect(result).toBeNull();
    // Update should NOT have been called since the link is expired
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: Token Format Validation (API route level)
// ============================================================================

describe("Shared Viewer - Token format validation", () => {
  it("rejects tokens that are not 64 hex characters", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    // getShareLink calls the DB -- but at the API route level,
    // the TOKEN_REGEX catches invalid formats before hitting the DB.
    // Here we test the sharing lib which passes any string to DB.
    // The DB would return null for nonexistent tokens.
    mockSingle.mockReset()
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await getShareLink("short-token");
    expect(result).toBeNull();
  });
});
