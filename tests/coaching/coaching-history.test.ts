/**
 * Coaching History Tests
 *
 * Tests for PATCH/DELETE session API routes and session listing.
 * Phase 29-02: Video Coaching Sessions - Session History & Polish.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Test Constants
// ============================================================================

const STUDIO_USER_ID = "studio-hist-1111-4000-8000-aaaaaaaaaaaa";
const OTHER_USER_ID = "other-hist-2222-4000-8000-bbbbbbbbbbbb";

const MOCK_SESSION = {
  id: "sess-hist-001",
  user_id: STUDIO_USER_ID,
  room_name: "coaching-history-test",
  status: "completed",
  started_at: "2026-02-07T10:00:00Z",
  ended_at: "2026-02-07T10:30:00Z",
  duration_seconds: 1800,
  notes: "Great session about pitch strategy",
  created_at: "2026-02-07T09:55:00Z",
  updated_at: "2026-02-07T10:30:00Z",
};

// ============================================================================
// Hoisted Mocks
// ============================================================================

const { mockGetUser, mockFrom, mockGetUserTier } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGetUserTier: vi.fn(),
}));

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

vi.mock("@/lib/api/tier-middleware", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/tier-middleware")>();
  return {
    ...original,
    getUserTier: mockGetUserTier,
    createTierErrorResponse: original.createTierErrorResponse,
  };
});

// ============================================================================
// Helpers
// ============================================================================

function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function setupAuth(userId: string) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

// ============================================================================
// PATCH Tests
// ============================================================================

describe("PATCH /api/coaching/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: "sess-1", notes: "Updated notes" }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Authentication required");
  });

  it("returns 400 when session id is missing", async () => {
    setupAuth(STUDIO_USER_ID);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { notes: "Some notes" }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Session id is required");
  });

  it("returns 400 when no valid fields provided", async () => {
    setupAuth(STUDIO_USER_ID);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: "sess-1" }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("No valid fields");
  });

  it("returns 400 for invalid status value", async () => {
    setupAuth(STUDIO_USER_ID);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: "sess-1", status: "invalid_status" }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Invalid status");
  });

  it("updates session notes successfully", async () => {
    setupAuth(STUDIO_USER_ID);

    const updatedSession = {
      ...MOCK_SESSION,
      notes: "Updated notes about fundraising strategy",
      updated_at: "2026-02-07T11:00:00Z",
    };

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedSession,
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: MOCK_SESSION.id, notes: "Updated notes about fundraising strategy" }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.session.notes).toBe("Updated notes about fundraising strategy");
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Updated notes about fundraising strategy" })
    );
  });

  it("updates session status and duration", async () => {
    setupAuth(STUDIO_USER_ID);

    const updatedSession = {
      ...MOCK_SESSION,
      status: "completed",
      duration_seconds: 2400,
    };

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedSession,
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: MOCK_SESSION.id, status: "completed", duration_seconds: 2400 }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.session.status).toBe("completed");
    expect(body.session.duration_seconds).toBe(2400);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", duration_seconds: 2400 })
    );
  });

  it("clears notes when set to null", async () => {
    setupAuth(STUDIO_USER_ID);

    const updatedSession = { ...MOCK_SESSION, notes: null };

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedSession,
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { PATCH } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "PATCH",
      "http://localhost:3000/api/coaching/sessions",
      { id: MOCK_SESSION.id, notes: null }
    );
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.session.notes).toBeNull();
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null })
    );
  });
});

// ============================================================================
// DELETE Tests
// ============================================================================

describe("DELETE /api/coaching/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const { DELETE } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "DELETE",
      "http://localhost:3000/api/coaching/sessions",
      { id: "sess-1" }
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Authentication required");
  });

  it("returns 400 when session id is missing", async () => {
    setupAuth(STUDIO_USER_ID);

    const { DELETE } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "DELETE",
      "http://localhost:3000/api/coaching/sessions",
      {}
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Session id is required");
  });

  it("deletes session successfully", async () => {
    setupAuth(STUDIO_USER_ID);

    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // The last .eq() call resolves the promise
    chain.eq.mockReturnValueOnce(chain); // first .eq(id)
    chain.eq.mockResolvedValueOnce({ error: null, count: 1 }); // second .eq(user_id)
    mockFrom.mockReturnValue(chain);

    const { DELETE } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "DELETE",
      "http://localhost:3000/api/coaching/sessions",
      { id: MOCK_SESSION.id }
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.deletedId).toBe(MOCK_SESSION.id);
  });

  it("returns 404 when session not found (count=0)", async () => {
    setupAuth(STUDIO_USER_ID);

    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain);
    chain.eq.mockResolvedValueOnce({ error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const { DELETE } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "DELETE",
      "http://localhost:3000/api/coaching/sessions",
      { id: "nonexistent-session" }
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });
});

// ============================================================================
// GET Pagination Tests
// ============================================================================

describe("GET /api/coaching/sessions - Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct pagination metadata", async () => {
    setupAuth(STUDIO_USER_ID);

    const mockSessions = Array.from({ length: 10 }, (_, i) => ({
      ...MOCK_SESSION,
      id: `sess-page-${i}`,
      room_name: `coaching-page-${i}`,
    }));

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockSessions,
        error: null,
        count: 25,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { GET } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "GET",
      "http://localhost:3000/api/coaching/sessions?page=2&limit=10"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions).toHaveLength(10);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    // Verify range offset for page 2 with limit 10: offset = (2-1)*10 = 10
    expect(chain.range).toHaveBeenCalledWith(10, 19);
  });

  it("clamps limit to max 50", async () => {
    setupAuth(STUDIO_USER_ID);

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { GET } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "GET",
      "http://localhost:3000/api/coaching/sessions?limit=100"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.limit).toBe(50);
    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it("clamps page to minimum 1", async () => {
    setupAuth(STUDIO_USER_ID);

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { GET } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "GET",
      "http://localhost:3000/api/coaching/sessions?page=-5"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(1);
    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });
});

// ============================================================================
// Studio Tier Requirement Tests
// ============================================================================

describe("Studio tier requirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST rejects Free tier users", async () => {
    setupAuth(OTHER_USER_ID);
    mockGetUserTier.mockResolvedValue(0); // UserTier.FREE

    const { POST } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "POST",
      "http://localhost:3000/api/coaching/sessions",
      { roomName: "coaching-test" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("TIER_REQUIRED");
  });

  it("POST rejects Pro tier users", async () => {
    setupAuth(OTHER_USER_ID);
    mockGetUserTier.mockResolvedValue(1); // UserTier.PRO

    const { POST } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "POST",
      "http://localhost:3000/api/coaching/sessions",
      { roomName: "coaching-test" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("TIER_REQUIRED");
  });

  it("POST allows Studio tier users", async () => {
    setupAuth(STUDIO_USER_ID);
    mockGetUserTier.mockResolvedValue(2); // UserTier.STUDIO

    const createdSession = {
      ...MOCK_SESSION,
      id: "new-studio-sess",
      room_name: "coaching-studio-test",
      status: "scheduled",
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createdSession,
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { POST } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "POST",
      "http://localhost:3000/api/coaching/sessions",
      { roomName: "coaching-studio-test" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.session.room_name).toBe("coaching-studio-test");
  });

  it("GET allows any authenticated user (history viewing)", async () => {
    setupAuth(OTHER_USER_ID);

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { GET } = await import("@/app/api/coaching/sessions/route");

    const req = createRequest(
      "GET",
      "http://localhost:3000/api/coaching/sessions"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
