/**
 * Document Repository API Tests
 * Phase 44: Document Repository
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoist mock functions
const {
  mockGetUser,
  mockGetSession,
  mockFrom,
  mockStorage,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockFrom: vi.fn(),
  mockStorage: {
    from: vi.fn(),
  },
}));

// Mock supabase server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser, getSession: mockGetSession },
      from: mockFrom,
      storage: mockStorage,
    })
  ),
  createServiceClient: vi.fn(() => ({
    auth: { getUser: mockGetUser, getSession: mockGetSession },
    from: mockFrom,
    storage: mockStorage,
  })),
}));

describe("Document Repository API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockUnauthenticated() {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  }

  function mockAuthenticated(userId = "user-123") {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: "test@example.com",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: "token", user: { id: userId } },
      },
      error: null,
    });
  }

  function mockSupabaseQuery(data: unknown[] | null, error: unknown = null) {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: data && data.length > 0 ? data[0] : null,
        error: data === null && !error ? { code: "PGRST116", message: "Not found" } : error,
      }),
    };

    // For non-single queries (list)
    const listResult = { data, error };
    mockChain.order.mockReturnValue({
      ...mockChain,
      // When chained without .single(), return the list
      then: (resolve: (val: unknown) => void) => resolve(listResult),
    });

    // Make the chain return the list result by default
    Object.defineProperty(mockChain, "then", {
      value: (resolve: (val: unknown) => void) => resolve(listResult),
      configurable: true,
    });

    mockFrom.mockReturnValue(mockChain);
    return mockChain;
  }

  describe("GET /api/document-repository", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockUnauthenticated();

      const { GET } = await import(
        "@/app/api/document-repository/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository"
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid folder param", async () => {
      mockAuthenticated();

      const { GET } = await import(
        "@/app/api/document-repository/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository?folder=invalid"
      );

      const response = await GET(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("Invalid folder");
    });

    it("should list documents for authenticated user", async () => {
      mockAuthenticated("user-abc");

      const mockDocs = [
        {
          id: "doc-1",
          user_id: "user-abc",
          title: "Pitch Deck v2",
          folder: "decks",
          file_url: "https://example.com/file.pdf",
          file_type: "application/pdf",
          file_size: 1024,
          metadata: {},
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];

      mockSupabaseQuery(mockDocs);

      const { GET } = await import(
        "@/app/api/document-repository/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository"
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.documents).toBeDefined();
    });
  });

  describe("GET /api/document-repository/[id]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockUnauthenticated();

      const { GET } = await import(
        "@/app/api/document-repository/[id]/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/doc-1"
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent document", async () => {
      mockAuthenticated("user-abc");
      mockSupabaseQuery(null);

      const { GET } = await import(
        "@/app/api/document-repository/[id]/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/nonexistent"
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      expect(response.status).toBe(404);
    });

    it("should return document for authenticated owner", async () => {
      mockAuthenticated("user-abc");

      const mockDoc = {
        id: "doc-1",
        user_id: "user-abc",
        title: "My Doc",
        description: "A test document",
        folder: "uploads",
        file_url: "https://example.com/file.pdf",
        file_type: "application/pdf",
        file_size: 2048,
        metadata: {},
        source_type: "upload",
        source_id: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      mockSupabaseQuery([mockDoc]);

      const { GET } = await import(
        "@/app/api/document-repository/[id]/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/doc-1"
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.document.id).toBe("doc-1");
      expect(body.document.title).toBe("My Doc");
    });
  });

  describe("DELETE /api/document-repository/[id]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockUnauthenticated();

      const { DELETE } = await import(
        "@/app/api/document-repository/[id]/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/doc-1",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent document", async () => {
      mockAuthenticated("user-abc");
      mockSupabaseQuery(null);

      const { DELETE } = await import(
        "@/app/api/document-repository/[id]/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/nonexistent",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/document-repository/[id]/review", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockUnauthenticated();

      const { POST } = await import(
        "@/app/api/document-repository/[id]/review/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/doc-1/review",
        { method: "POST" }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent document", async () => {
      mockAuthenticated("user-abc");
      mockSupabaseQuery(null);

      const { POST } = await import(
        "@/app/api/document-repository/[id]/review/route"
      );
      const request = new NextRequest(
        "http://localhost:3000/api/document-repository/doc-1/review",
        { method: "POST" }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "doc-1" }),
      });
      expect(response.status).toBe(404);
    });
  });
});
