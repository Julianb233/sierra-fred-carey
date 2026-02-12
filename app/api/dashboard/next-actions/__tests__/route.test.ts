/**
 * Next Actions API Tests — Phase 40
 *
 * Tests the extractNextActions parsing logic and route handler behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

let mockEpisodes: unknown[] = [];

// Build a fluent Supabase mock that handles the full chain:
// .from().select().eq().eq().order().limit()
function buildSupabaseMock() {
  const chain: Record<string, unknown> = {};
  chain.limit = vi.fn(() => ({ data: mockEpisodes, error: null }));
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  return chain;
}

const supabaseMock = buildSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import { requireAuth } from "@/lib/auth";
import { GET } from "../route";

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/dashboard/next-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue("test-user-123");
    mockEpisodes = [];
  });

  it("returns empty actions when no episodes exist", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.actions).toEqual([]);
    expect(data.data.conversationDate).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns actions from FRED response containing Next 3 Actions", async () => {
    mockEpisodes = [
      {
        content: {
          role: "assistant",
          content: `Great progress on your problem statement.

**Next 3 Actions:**
1. Interview 5 potential customers this week
2. Map out the buyer journey for your top segment
3. Document your core differentiator vs. incumbents`,
        },
        created_at: "2026-02-10T12:00:00Z",
      },
    ];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.actions).toHaveLength(3);
    expect(data.data.actions[0].text).toBe(
      "Interview 5 potential customers this week"
    );
    expect(data.data.actions[1].text).toBe(
      "Map out the buyer journey for your top segment"
    );
    expect(data.data.actions[2].text).toBe(
      "Document your core differentiator vs. incumbents"
    );
    expect(data.data.conversationDate).toBe("2026-02-10T12:00:00Z");
  });

  it("skips user messages and only processes assistant messages", async () => {
    mockEpisodes = [
      {
        content: { role: "user", content: "Tell me what to do" },
        created_at: "2026-02-10T12:01:00Z",
      },
      {
        content: {
          role: "assistant",
          content: `Here's your plan.

**Next 3 Actions:**
1. First thing
2. Second thing
3. Third thing`,
        },
        created_at: "2026-02-10T12:00:00Z",
      },
    ];

    const response = await GET();
    const data = await response.json();

    expect(data.data.actions).toHaveLength(3);
    expect(data.data.actions[0].text).toBe("First thing");
  });

  it("returns empty when FRED responses have no Next 3 Actions block", async () => {
    mockEpisodes = [
      {
        content: {
          role: "assistant",
          content: "Let's discuss your problem statement more deeply.",
        },
        created_at: "2026-02-10T12:00:00Z",
      },
    ];

    const response = await GET();
    const data = await response.json();

    expect(data.data.actions).toEqual([]);
    expect(data.data.conversationDate).toBeNull();
  });
});
