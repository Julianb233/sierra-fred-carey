/**
 * Context Builder Unit Tests — Phase 34-03
 *
 * Tests for buildFounderContext which loads founder data and
 * assembles the Founder Snapshot for system prompt injection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

// Track sanitize calls
const sanitizeMock = vi.fn((input: string, maxLength?: number) => {
  // Real sanitization: strip template syntax, truncate, trim
  let s = input;
  for (const d of ["{{", "}}", "{%", "%}", "<%", "%>"]) {
    s = s.split(d).join("");
  }
  if (maxLength && s.length > maxLength) s = s.substring(0, maxLength);
  return s.trim();
});

vi.mock("@/lib/ai/guards/prompt-guard", () => ({
  sanitizeUserInput: (...args: unknown[]) => sanitizeMock(args[0] as string, args[1] as number),
  detectInjectionAttempt: vi.fn(() => ({
    isInjection: false,
    confidence: 0,
    patterns: [],
    sanitizedInput: "",
  })),
}));

// Supabase mock — returns configurable data per table
let profileData: Record<string, unknown> | null = null;
let profileError: { code?: string; message: string } | null = null;
let conversationStateData: Record<string, unknown> | null = null;
let conversationStateError: { code?: string; message: string } | null = null;
let supabaseThrows = false;

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => {
    if (supabaseThrows) throw new Error("Supabase connection failed");
    return {
      from: (table: string) => {
        if (table === "profiles") {
          singleMock.mockReturnValue({ data: profileData, error: profileError });
        } else if (table === "fred_conversation_state") {
          singleMock.mockReturnValue({
            data: conversationStateData,
            error: conversationStateError,
          });
        }
        return { select: selectMock };
      },
    };
  },
}));

// Fred memory mock
let factsData: Array<{ category: string; key: string; value: Record<string, unknown> }> = [];
let memoryThrows = false;

vi.mock("@/lib/db/fred-memory", () => ({
  getAllUserFacts: vi.fn(async () => {
    if (memoryThrows) throw new Error("Memory load failed");
    return factsData;
  }),
}));

// Conversation state mock (dynamic import)
vi.mock("@/lib/db/conversation-state", () => ({
  buildProgressContext: vi.fn(async () => null),
  syncSnapshotFromProfile: vi.fn(async () => {}),
}));

// Import AFTER mocks
const { buildFounderContext } = await import("@/lib/fred/context-builder");

// ============================================================================
// Helpers
// ============================================================================

function resetMocks() {
  profileData = null;
  profileError = { code: "PGRST116", message: "no rows" };
  conversationStateData = null;
  conversationStateError = { code: "PGRST116", message: "no rows" };
  factsData = [];
  supabaseThrows = false;
  memoryThrows = false;
  sanitizeMock.mockClear();
}

const FULL_PROFILE = {
  name: "Jane Doe",
  stage: "seed",
  industry: "HealthTech",
  revenue_range: "$10k-$50k MRR",
  team_size: 5,
  funding_history: "Pre-seed $500k",
  challenges: ["distribution", "hiring"],
  enrichment_data: null,
  onboarding_completed: true,
};

// ============================================================================
// Tests
// ============================================================================

describe("buildFounderContext", () => {
  beforeEach(() => {
    resetMocks();
  });

  // ---------- Group 1: Empty profile ----------

  describe("empty profile (no data)", () => {
    it("returns empty string when no profile, no facts, and NOT first conversation", async () => {
      // Not first conversation: conversation state exists
      conversationStateData = { id: "existing-state" };
      conversationStateError = null;

      const result = await buildFounderContext("user-1", false);
      expect(result).toBe("");
    });

    it("returns first-conversation block when no profile but IS first conversation", async () => {
      // First conversation: no state row (PGRST116)
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-1", false);
      expect(result).toContain("FIRST CONVERSATION");
      expect(result).toMatch(/Universal Entry Flow|What are you building/);
    });
  });

  // ---------- Group 2: Partial profile ----------

  describe("partial profile", () => {
    it("includes name and stage without 'undefined' or 'N/A'", async () => {
      profileData = {
        name: "Alice",
        stage: "idea",
        industry: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: null,
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-2", false);
      expect(result).toContain("Alice");
      expect(result).toContain("Idea");
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("N/A");
    });

    it("includes challenges when present", async () => {
      profileData = {
        name: "Bob",
        stage: "pre-seed",
        industry: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: ["fundraising", "product-market-fit"],
        enrichment_data: null,
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-3", false);
      expect(result).toContain("Current Challenges");
    });

    it("does not include missing optional fields", async () => {
      profileData = {
        name: "Carol",
        stage: "seed",
        industry: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: null,
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-4", false);
      expect(result).not.toContain("Team:");
      expect(result).not.toContain("Funding:");
      expect(result).not.toContain("Revenue:");
    });
  });

  // ---------- Group 3: Full profile ----------

  describe("full profile", () => {
    it("output contains FOUNDER SNAPSHOT", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).toContain("FOUNDER SNAPSHOT");
    });

    it("output includes name, stage, industry, revenue, team, funding", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).toContain("Jane Doe");
      expect(result).toContain("Seed");
      expect(result).toContain("HealthTech");
      expect(result).toContain("$10k-$50k MRR");
      expect(result).toContain("5");
      expect(result).toContain("Pre-seed $500k");
    });

    it("output does not contain literal {{FOUNDER_CONTEXT}}", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).not.toContain("{{FOUNDER_CONTEXT}}");
    });
  });

  // ---------- Group 4: First conversation after onboarding ----------

  describe("first conversation after onboarding", () => {
    it("output contains onboarding handoff header", async () => {
      profileData = { ...FULL_PROFILE, onboarding_completed: true };
      profileError = null;
      // First conversation: no state row
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-6", false);
      expect(result).toContain("HANDOFF: FIRST CONVERSATION AFTER ONBOARDING");
    });

    it("output contains 'Do NOT re-ask'", async () => {
      profileData = { ...FULL_PROFILE, onboarding_completed: true };
      profileError = null;
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-6", false);
      expect(result).toContain("Do NOT re-ask");
    });

    it("output contains 'Go deeper'", async () => {
      profileData = { ...FULL_PROFILE, onboarding_completed: true };
      profileError = null;
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-6", false);
      expect(result).toContain("Go deeper");
    });
  });

  // ---------- Group 5: First conversation without onboarding ----------

  describe("first conversation without onboarding", () => {
    it("output contains NO ONBOARDING DATA header", async () => {
      // No profile data, first conversation
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-7", false);
      expect(result).toContain("FIRST CONVERSATION (NO ONBOARDING DATA)");
    });

    it("output includes Universal Entry Flow or entry questions", async () => {
      conversationStateData = null;
      conversationStateError = { code: "PGRST116", message: "no rows" };

      const result = await buildFounderContext("user-7", false);
      expect(result).toMatch(/Universal Entry Flow|What are you building/);
    });
  });

  // ---------- Group 6: Returning user ----------

  describe("returning user", () => {
    it("output contains 'Use this snapshot to personalize'", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-8", false);
      expect(result).toContain("Use this snapshot to personalize");
    });
  });

  // ---------- Group 7: Enrichment data ----------

  describe("enrichment data", () => {
    it("includes revenue hint when profile has no revenue", async () => {
      profileData = {
        name: "Dave",
        stage: "seed",
        industry: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: { revenueHint: "$2k MRR" },
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-9", false);
      expect(result).toContain("Revenue mentioned");
    });

    it("includes competitors when mentioned", async () => {
      profileData = {
        name: "Eve",
        stage: "seed",
        industry: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: { competitorsMentioned: ["Stripe", "PayPal"] },
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-10", false);
      expect(result).toContain("Competitors mentioned");
    });
  });

  // ---------- Group 8: Error handling ----------

  describe("error handling", () => {
    it("returns empty string when supabase throws", async () => {
      supabaseThrows = true;

      const result = await buildFounderContext("user-11", false);
      expect(result).toBe("");
    });

    it("returns profile-only context when semantic memory throws", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;
      memoryThrows = true;

      const result = await buildFounderContext("user-12", true);
      // Should still have profile data (memory failure is caught)
      expect(result).toContain("Jane Doe");
      expect(result).toContain("FOUNDER SNAPSHOT");
    });
  });

  // ---------- Group 9: Sanitization ----------

  describe("sanitization", () => {
    it("calls sanitize on user-controlled data", async () => {
      profileData = {
        name: "TestFounder",
        stage: "idea",
        industry: "SaaS",
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: ["growth"],
        enrichment_data: null,
        onboarding_completed: false,
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;
      sanitizeMock.mockClear();

      await buildFounderContext("user-13", false);
      expect(sanitizeMock).toHaveBeenCalled();
    });
  });
});
