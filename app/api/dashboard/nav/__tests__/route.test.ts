/**
 * Dashboard Navigation API Tests — Phase 40
 *
 * Tests the sidebar conditional visibility logic based on
 * diagnostic tags, stage, and feature activation state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiagnosticTags } from "@/lib/db/conversation-state";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

let mockProfileData: Record<string, unknown> | null = null;
let mockDocsCount: number = 0;
let mockConvState: Record<string, unknown> | null = null;

// Fluent Supabase mock
function buildSupabaseMock() {
  const chain: Record<string, unknown> = {};
  chain.single = vi.fn(() => ({ data: mockProfileData, error: null }));
  chain.head = vi.fn(() => ({ count: mockDocsCount, error: null }));
  chain.eq = vi.fn((key: string) => {
    // The final .eq returns either { single } or the count result
    return chain;
  });
  chain.select = vi.fn((fields: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) {
      return { eq: vi.fn(() => ({ count: mockDocsCount, error: null })) };
    }
    return chain;
  });
  chain.from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockProfileData, error: null })),
          })),
        })),
      };
    }
    if (table === "strategy_documents") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ count: mockDocsCount, error: null })),
        })),
      };
    }
    return chain;
  });
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => buildSupabaseMock()),
}));

vi.mock("@/lib/db/conversation-state", () => ({
  getConversationState: vi.fn(async () => mockConvState),
}));

import { requireAuth } from "@/lib/auth";
import { GET } from "../route";

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/dashboard/nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue("test-user-123");
    mockProfileData = { stage: "idea", tier: 0 };
    mockDocsCount = 0;
    mockConvState = null;
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns core nav items for all users", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    const coreItems = json.data.items.filter(
      (item: { alwaysVisible: boolean }) => item.alwaysVisible
    );
    const coreNames = coreItems.map((item: { name: string }) => item.name);

    expect(coreNames).toContain("Home");
    expect(coreNames).toContain("Chat with Fred");
    expect(coreNames).toContain("Your Progress");
    expect(coreNames).toContain("Next Steps");
    expect(coreNames).toContain("Community");
    expect(coreNames).toContain("Settings");
  });

  it("returns 6 core items minimum for idea-stage free user", async () => {
    mockProfileData = { stage: "idea", tier: 0 };
    mockConvState = { diagnosticTags: { stage: "idea" }, modeContext: null };

    const response = await GET();
    const json = await response.json();

    // Should only have core items (no conditionals for idea-stage free)
    expect(json.data.items.length).toBe(6);
  });

  it("shows Readiness when stage is seed", async () => {
    mockProfileData = { stage: "seed", tier: 1 };
    mockConvState = {
      diagnosticTags: { stage: "seed" },
      modeContext: {
        introductionState: {
          positioning: { introduced: false },
          investor: { introduced: false },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).toContain("Readiness");
  });

  it("shows Readiness when investor signal is high", async () => {
    mockProfileData = { stage: "pre-seed", tier: 1 };
    mockConvState = {
      diagnosticTags: { stage: "pre-seed", investorReadinessSignal: "high" },
      modeContext: {
        introductionState: {
          positioning: { introduced: false },
          investor: { introduced: false },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).toContain("Readiness");
  });

  it("shows Investor Lens when investor mode is activated", async () => {
    mockProfileData = { stage: "seed", tier: 1 };
    mockConvState = {
      diagnosticTags: { stage: "seed" },
      modeContext: {
        introductionState: {
          positioning: { introduced: false },
          investor: { introduced: true },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).toContain("Investor Lens");
  });

  it("shows Positioning when positioning lens is activated", async () => {
    mockProfileData = { stage: "seed", tier: 1 };
    mockConvState = {
      diagnosticTags: { stage: "seed" },
      modeContext: {
        introductionState: {
          positioning: { introduced: true },
          investor: { introduced: false },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).toContain("Positioning");
  });

  it("shows Documents when user has documents", async () => {
    mockProfileData = { stage: "seed", tier: 1 };
    mockDocsCount = 3;
    mockConvState = {
      diagnosticTags: { stage: "seed" },
      modeContext: {
        introductionState: {
          positioning: { introduced: false },
          investor: { introduced: false },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).toContain("Documents");
  });

  it("hides Documents when user has no documents", async () => {
    mockProfileData = { stage: "seed", tier: 1 };
    mockDocsCount = 0;
    mockConvState = {
      diagnosticTags: { stage: "seed" },
      modeContext: {
        introductionState: {
          positioning: { introduced: false },
          investor: { introduced: false },
        },
      },
    };

    const response = await GET();
    const json = await response.json();
    const itemNames = json.data.items.map((i: { name: string }) => i.name);

    expect(itemNames).not.toContain("Documents");
  });
});
