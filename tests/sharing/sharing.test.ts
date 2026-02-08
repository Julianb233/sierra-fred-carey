/**
 * Sharing Infrastructure Tests
 * Phase 33-01: Collaboration & Sharing
 *
 * Tests for shareable links and team invite functionality.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockFrom,
  mockGetUser,
  mockInsert,
  mockSelect,
  mockUpdate,
  mockEq,
  mockSingle,
  mockIn,
  mockOrder,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockOrder = vi.fn(() => ({ data: [], error: null }));
  const mockIn = vi.fn(() => ({ data: [], error: null }));

  const mockEq = vi.fn((): unknown => ({
    eq: mockEq,
    single: mockSingle,
    in: mockIn,
    order: mockOrder,
    select: vi.fn(() => ({ single: mockSingle, data: [], error: null })),
  }));

  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    in: mockIn,
  }));

  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: mockSingle,
    })),
  }));

  const mockUpdate = vi.fn(() => ({
    eq: mockEq,
    select: vi.fn(() => ({
      single: mockSingle,
      data: [],
      error: null,
    })),
  }));

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
  }));

  const mockGetUser = vi.fn();

  return {
    mockFrom,
    mockGetUser,
    mockInsert,
    mockSelect,
    mockUpdate,
    mockEq,
    mockSingle,
    mockIn,
    mockOrder,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
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
// Tests: Sharing Module
// ============================================================================

describe("Sharing - createShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a share link and returns a valid token", async () => {
    const { createShareLink } = await import("@/lib/sharing");

    const mockLink = {
      id: "link-uuid-1",
      user_id: "user-1",
      resource_type: "strategy_document",
      resource_id: "res-uuid-1",
      token: "a".repeat(64),
      access_level: "view",
      expires_at: null,
      max_views: null,
      view_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock: resource ownership check
    mockSingle.mockResolvedValueOnce({
      data: { id: "res-uuid-1" },
      error: null,
    });

    // Mock: insert share link
    mockSingle.mockResolvedValueOnce({
      data: mockLink,
      error: null,
    });

    // The function calls createClient which we mocked, but it chains
    // .from().select().eq().eq().single() -- our chain mock handles this
    // Reconfigure the chain to return data correctly
    mockSingle
      .mockReset()
      .mockResolvedValueOnce({ data: { id: "res-uuid-1" }, error: null })
      .mockResolvedValueOnce({ data: mockLink, error: null });

    const result = await createShareLink(
      "user-1",
      "strategy_document",
      "res-uuid-1"
    );

    expect(result).toBeDefined();
    expect(result.token).toHaveLength(64);
    expect(result.resource_type).toBe("strategy_document");
    expect(result.is_active).toBe(true);
  });

  it("throws error when resource is not found or not owned by user", async () => {
    const { createShareLink } = await import("@/lib/sharing");

    mockSingle
      .mockReset()
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    await expect(
      createShareLink("user-1", "strategy_document", "nonexistent-id")
    ).rejects.toThrow("Resource not found or not owned by user");
  });
});

describe("Sharing - getShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for expired links", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    const expiredLink = {
      id: "link-1",
      token: "b".repeat(64),
      expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      is_active: true,
      max_views: null,
      view_count: 0,
      resource_type: "strategy_document",
      resource_id: "res-1",
      user_id: "user-1",
      access_level: "view",
    };

    mockSingle.mockReset().mockResolvedValueOnce({
      data: expiredLink,
      error: null,
    });

    const result = await getShareLink("b".repeat(64));
    expect(result).toBeNull();
  });

  it("returns null for links that exceeded max views", async () => {
    const { getShareLink } = await import("@/lib/sharing");

    const maxedLink = {
      id: "link-2",
      token: "c".repeat(64),
      expires_at: null,
      is_active: true,
      max_views: 10,
      view_count: 10,
      resource_type: "pitch_review",
      resource_id: "res-2",
      user_id: "user-1",
      access_level: "view",
    };

    mockSingle.mockReset().mockResolvedValueOnce({
      data: maxedLink,
      error: null,
    });

    const result = await getShareLink("c".repeat(64));
    expect(result).toBeNull();
  });
});

describe("Sharing - revokeShareLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets is_active to false on revoke", async () => {
    const { revokeShareLink } = await import("@/lib/sharing");

    // Mock successful update
    mockEq.mockReset().mockReturnValue({
      eq: vi.fn(() => ({ error: null })),
    });

    const result = await revokeShareLink("user-1", "link-uuid-1");
    expect(result).toBe(true);

    // Verify update was called with is_active: false
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0]?.[0];
    expect(updateArg).toMatchObject({ is_active: false });
  });
});

// ============================================================================
// Tests: Teams Module
// ============================================================================

describe("Teams - inviteTeamMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces max 5 team members limit", async () => {
    const { inviteTeamMember } = await import("@/lib/sharing/teams");

    // Mock: count query returns 5 existing members
    const fiveMembers = Array.from({ length: 5 }, (_, i) => ({
      id: `member-${i}`,
    }));

    // First call to .from() for count check
    mockSelect.mockReset().mockReturnValueOnce({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          data: fiveMembers,
          error: null,
        })),
      })),
    });

    await expect(
      inviteTeamMember("user-1", "new@example.com", "viewer")
    ).rejects.toThrow("Maximum team size of 5 members reached");
  });

  it("rejects duplicate invites for active members", async () => {
    const { inviteTeamMember } = await import("@/lib/sharing/teams");

    // Mock the full chain for inviteTeamMember:
    // 1st .from() call: count check -> .select().eq().in() -> returns under limit
    // 2nd .from() call: duplicate check -> .select().eq().eq().single() -> returns existing active

    let callCount = 0;
    mockFrom.mockReset().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Count check: from("team_members").select("id").eq("owner_user_id", ...).in("status", ...)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                data: [{ id: "member-1" }],
                error: null,
              })),
            })),
          })),
        };
      }
      // Duplicate check: from("team_members").select("*").eq(...).eq(...).single()
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: "existing-1",
                    status: "active",
                    member_email: "existing@example.com",
                    role: "viewer",
                    owner_user_id: "user-1",
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      };
    });

    await expect(
      inviteTeamMember("user-1", "existing@example.com", "viewer")
    ).rejects.toThrow("already been invited");
  });
});

// ============================================================================
// Tests: Middleware / Share Endpoint Public Access
// ============================================================================

describe("Share endpoint public route", () => {
  it("share token route is not protected", async () => {
    const { isProtectedRoute, isPublicRoute } = await import(
      "@/lib/auth/middleware-utils"
    );

    // /api/share/<token> should not be a protected route
    const tokenPath = "/api/share/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    expect(isProtectedRoute(tokenPath)).toBe(false);
    expect(isPublicRoute(tokenPath)).toBe(true);
  });

  it("share API requires authentication for management routes", async () => {
    const { isPublicRoute } = await import("@/lib/auth/middleware-utils");

    // /api/share (no token) should NOT match the public pattern
    expect(isPublicRoute("/api/share")).toBe(false);
    expect(isPublicRoute("/api/share/")).toBe(false);
  });
});

// ============================================================================
// Tests: Resource Type Validation
// ============================================================================

describe("Sharing - isValidResourceType", () => {
  it("accepts valid resource types", async () => {
    const { isValidResourceType } = await import("@/lib/sharing");

    expect(isValidResourceType("strategy_document")).toBe(true);
    expect(isValidResourceType("pitch_review")).toBe(true);
    expect(isValidResourceType("investor_readiness")).toBe(true);
    expect(isValidResourceType("red_flags_report")).toBe(true);
  });

  it("rejects invalid resource types", async () => {
    const { isValidResourceType } = await import("@/lib/sharing");

    expect(isValidResourceType("invalid")).toBe(false);
    expect(isValidResourceType("")).toBe(false);
    expect(isValidResourceType("chat_messages")).toBe(false);
  });
});

// ============================================================================
// Tests: Team Role Validation
// ============================================================================

describe("Teams - isValidTeamRole", () => {
  it("accepts valid roles", async () => {
    const { isValidTeamRole } = await import("@/lib/sharing/teams");

    expect(isValidTeamRole("viewer")).toBe(true);
    expect(isValidTeamRole("collaborator")).toBe(true);
    expect(isValidTeamRole("admin")).toBe(true);
  });

  it("rejects invalid roles", async () => {
    const { isValidTeamRole } = await import("@/lib/sharing/teams");

    expect(isValidTeamRole("invalid")).toBe(false);
    expect(isValidTeamRole("")).toBe(false);
    expect(isValidTeamRole("superadmin")).toBe(false);
  });
});
