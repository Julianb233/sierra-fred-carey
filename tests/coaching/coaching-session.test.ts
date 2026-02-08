/**
 * Coaching Session Tests
 *
 * Tests for the coaching session API routes.
 * Phase 29-01: Video Coaching Sessions with FRED Sidebar.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Test Constants
// ============================================================================

const STUDIO_USER_ID = "studio-user-1111-4000-8000-aaaaaaaaaaaa";
const FREE_USER_ID = "free-user-2222-4000-8000-bbbbbbbbbbbb";

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

function setupSupabaseChain(data: unknown, error: unknown = null, count: number | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error, count }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ============================================================================
// Tests
// ============================================================================

describe("Coaching Sessions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // GET /api/coaching/sessions
  // --------------------------------------------------------------------------

  describe("GET /api/coaching/sessions", () => {
    it("returns 401 when unauthenticated", async () => {
      setupUnauthenticated();

      const { GET } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "GET",
        "http://localhost:3000/api/coaching/sessions"
      );
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Authentication required");
    });

    it("returns paginated sessions for authenticated user", async () => {
      setupAuth(STUDIO_USER_ID);

      const mockSessions = [
        {
          id: "sess-1",
          user_id: STUDIO_USER_ID,
          room_name: "coaching-test-123",
          status: "completed",
          started_at: "2026-02-07T10:00:00Z",
          ended_at: "2026-02-07T10:30:00Z",
          duration_seconds: 1800,
          notes: null,
          created_at: "2026-02-07T09:55:00Z",
          updated_at: "2026-02-07T10:30:00Z",
        },
      ];

      setupSupabaseChain(mockSessions, null, 1);

      const { GET } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "GET",
        "http://localhost:3000/api/coaching/sessions?page=1&limit=10"
      );
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0].room_name).toBe("coaching-test-123");
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.total).toBe(1);
    });

    it("defaults to page 1 and limit 20", async () => {
      setupAuth(STUDIO_USER_ID);
      const chain = setupSupabaseChain([], null, 0);

      const { GET } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "GET",
        "http://localhost:3000/api/coaching/sessions"
      );
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(20);
      // Verify range was called with correct offset
      expect(chain.range).toHaveBeenCalledWith(0, 19);
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/coaching/sessions
  // --------------------------------------------------------------------------

  describe("POST /api/coaching/sessions", () => {
    it("returns 401 when unauthenticated", async () => {
      setupUnauthenticated();

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        { roomName: "coaching-test-123" }
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Authentication required");
    });

    it("returns 403 when user is not Studio tier", async () => {
      setupAuth(FREE_USER_ID);
      mockGetUserTier.mockResolvedValue(0); // UserTier.FREE

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        { roomName: "coaching-test-123" }
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.code).toBe("TIER_REQUIRED");
    });

    it("returns 400 when roomName is missing", async () => {
      setupAuth(STUDIO_USER_ID);
      mockGetUserTier.mockResolvedValue(2); // UserTier.STUDIO

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        {}
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("roomName is required");
    });

    it("returns 400 when roomName has invalid characters", async () => {
      setupAuth(STUDIO_USER_ID);
      mockGetUserTier.mockResolvedValue(2); // UserTier.STUDIO

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        { roomName: "invalid room name!" }
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Invalid roomName");
    });

    it("creates a session for Studio tier user", async () => {
      setupAuth(STUDIO_USER_ID);
      mockGetUserTier.mockResolvedValue(2); // UserTier.STUDIO

      const createdSession = {
        id: "new-sess-id",
        user_id: STUDIO_USER_ID,
        room_name: "coaching-test-456",
        status: "scheduled",
        started_at: null,
        ended_at: null,
        duration_seconds: null,
        notes: "Test notes",
        created_at: "2026-02-07T12:00:00Z",
        updated_at: "2026-02-07T12:00:00Z",
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

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        { roomName: "coaching-test-456", notes: "Test notes" }
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.session.room_name).toBe("coaching-test-456");
      expect(body.session.status).toBe("scheduled");
      expect(body.session.notes).toBe("Test notes");

      // Verify insert was called with correct data
      expect(chain.insert).toHaveBeenCalledWith({
        user_id: STUDIO_USER_ID,
        room_name: "coaching-test-456",
        status: "scheduled",
        notes: "Test notes",
      });
    });

    it("creates a session without notes", async () => {
      setupAuth(STUDIO_USER_ID);
      mockGetUserTier.mockResolvedValue(2); // UserTier.STUDIO

      const createdSession = {
        id: "new-sess-id-2",
        user_id: STUDIO_USER_ID,
        room_name: "coaching-no-notes",
        status: "scheduled",
        started_at: null,
        ended_at: null,
        duration_seconds: null,
        notes: null,
        created_at: "2026-02-07T12:00:00Z",
        updated_at: "2026-02-07T12:00:00Z",
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

      const { POST } = await import(
        "@/app/api/coaching/sessions/route"
      );

      const req = createRequest(
        "POST",
        "http://localhost:3000/api/coaching/sessions",
        { roomName: "coaching-no-notes" }
      );
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.session.notes).toBeNull();

      // Verify notes was passed as null
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null })
      );
    });
  });
});
