/**
 * Context Builder Unit Tests — Phase 34-03 (Updated Phase 79)
 *
 * Tests for buildFounderContext which loads founder data and
 * assembles the Active Founder Context for system prompt injection.
 *
 * Phase 79 changed the output format from "FOUNDER SNAPSHOT" (legacy buildContextBlock)
 * to "ACTIVE FOUNDER CONTEXT" (formatMemoryBlock from active-memory.ts).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TRACEABILITY: Every eval criterion in this file MUST map to a section
 * in .planning/OPERATING-BIBLE.md or an existing test in prompts.test.ts.
 * See .planning/FRED-EVAL-TRACEABILITY.md for the complete mapping.
 * Do NOT add new criteria without updating the traceability document.
 * Source of truth: docs/SAHARA-FRED-AUTORESEARCH-WORKFLOW.md (Section 8)
 * ═══════════════════════════════════════════════════════════════════════
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
let startupProcessData: Record<string, unknown> | null = null;
let supabaseThrows = false;

const limitMock = vi.fn(() => ({
  single: vi.fn(() => ({
    data: startupProcessData,
    error: startupProcessData ? null : { code: "PGRST116", message: "no rows" },
  })),
}));
const orderMock = vi.fn(() => ({ limit: limitMock }));
const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock, order: orderMock }));
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
        } else if (table === "startup_processes") {
          // handled by orderMock -> limitMock -> single chain
        }
        return { select: selectMock };
      },
    };
  },
}));

// Fred memory mock
let factsData: Array<{
  category: string;
  key: string;
  value: Record<string, unknown>;
  confidence?: number;
  updatedAt?: Date | null;
  createdAt?: Date | null;
}> = [];
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

// Channels mock
vi.mock("@/lib/channels/conversation-context", () => ({
  getConversationContext: vi.fn(async () => ({
    totalConversations: 0,
    channelSummaries: [],
  })),
  buildChannelContextBlock: vi.fn(() => ""),
}));

// Red flags mock
vi.mock("@/lib/db/red-flags", () => ({
  getRedFlags: vi.fn(async () => []),
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
  startupProcessData = null;
  factsData = [];
  supabaseThrows = false;
  memoryThrows = false;
  sanitizeMock.mockClear();
}

const FULL_PROFILE = {
  name: "Jane Doe",
  stage: "seed",
  industry: "HealthTech",
  company_name: "HealthCo",
  co_founder: null,
  revenue_range: "$10k-$50k MRR",
  team_size: 5,
  funding_history: "Pre-seed $500k",
  challenges: ["distribution", "hiring"],
  enrichment_data: null,
  onboarding_completed: true,
  oases_stage: null,
  updated_at: new Date().toISOString(),
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
    it("returns context with missing fields instruction when no profile and NOT first conversation", async () => {
      // Not first conversation: conversation state exists
      conversationStateData = { id: "existing-state" };
      conversationStateError = null;

      const result = await buildFounderContext("user-1", false);
      // Phase 79: Active memory always produces output (with missing field instructions)
      expect(result).toContain("ACTIVE FOUNDER CONTEXT");
      expect(result).toContain("Missing Context");
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
        company_name: null,
        co_founder: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: null,
        onboarding_completed: false,
        oases_stage: null,
        updated_at: new Date().toISOString(),
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-2", false);
      expect(result).toContain("Alice");
      expect(result).toContain("idea");
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("N/A");
    });

    it("includes biggest challenge when challenges array is present", async () => {
      profileData = {
        name: "Bob",
        stage: "pre-seed",
        industry: null,
        company_name: null,
        co_founder: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: ["fundraising", "product-market-fit"],
        enrichment_data: null,
        onboarding_completed: false,
        oases_stage: null,
        updated_at: new Date().toISOString(),
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-3", false);
      // Phase 79: challenges[0] maps to biggest_challenge in active memory
      expect(result).toContain("Biggest Challenge");
      expect(result).toContain("fundraising");
    });

    it("does not include missing optional fields as explicit values", async () => {
      profileData = {
        name: "Carol",
        stage: "seed",
        industry: null,
        company_name: null,
        co_founder: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: null,
        onboarding_completed: false,
        oases_stage: null,
        updated_at: new Date().toISOString(),
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-4", false);
      // Phase 79: Missing fields appear in "Missing Context" instruction, not as values
      expect(result).not.toContain("**Company:**");
      expect(result).not.toContain("**Co-Founder:**");
      expect(result).toContain("Missing Context");
    });
  });

  // ---------- Group 3: Full profile ----------

  describe("full profile", () => {
    it("output contains ACTIVE FOUNDER CONTEXT header", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).toContain("ACTIVE FOUNDER CONTEXT");
    });

    it("output includes name, stage, market from active memory", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).toContain("Jane Doe");
      expect(result).toContain("seed");
      expect(result).toContain("HealthTech");
      expect(result).toContain("HealthCo");
    });

    it("output contains CRITICAL INSTRUCTION for mandatory context referencing", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-5", false);
      expect(result).toContain("CRITICAL INSTRUCTION");
      expect(result).toContain("MUST reference");
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

  // ---------- Group 6: Returning user with active context ----------

  describe("returning user", () => {
    it("output contains CRITICAL INSTRUCTION for personalization", async () => {
      profileData = { ...FULL_PROFILE };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-8", false);
      // Phase 79: Active memory always includes CRITICAL INSTRUCTION
      expect(result).toContain("CRITICAL INSTRUCTION");
      expect(result).toContain("MUST reference");
    });
  });

  // ---------- Group 7: Active memory stale/missing fields ----------

  describe("active memory field instructions", () => {
    it("includes missing field instructions when core fields are absent", async () => {
      profileData = {
        name: "Dave",
        stage: "seed",
        industry: null,
        company_name: null,
        co_founder: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: [],
        enrichment_data: null,
        onboarding_completed: false,
        oases_stage: null,
        updated_at: new Date().toISOString(),
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-9", false);
      expect(result).toContain("Missing Context");
      expect(result).toContain("Company Name");
    });

    it("includes co-founder in context when profile has it", async () => {
      profileData = {
        ...FULL_PROFILE,
        co_founder: "Sarah Chen",
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-10", false);
      expect(result).toContain("Co-Founder");
      expect(result).toContain("Sarah Chen");
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
      // Should still have profile data (memory failure is caught in active-memory.ts)
      expect(result).toContain("Jane Doe");
      expect(result).toContain("ACTIVE FOUNDER CONTEXT");
    });
  });

  // ---------- Group 9: Active memory integration ----------

  describe("active memory integration", () => {
    it("uses formatMemoryBlock output with ACTIVE FOUNDER CONTEXT header", async () => {
      profileData = {
        name: "TestFounder",
        stage: "idea",
        industry: "SaaS",
        company_name: "TestCo",
        co_founder: null,
        revenue_range: null,
        team_size: null,
        funding_history: null,
        challenges: ["growth"],
        enrichment_data: null,
        onboarding_completed: false,
        oases_stage: null,
        updated_at: new Date().toISOString(),
      };
      profileError = null;
      conversationStateData = { id: "existing" };
      conversationStateError = null;

      const result = await buildFounderContext("user-13", false);
      // Phase 79: Context now comes from formatMemoryBlock
      expect(result).toContain("ACTIVE FOUNDER CONTEXT");
      expect(result).toContain("TestFounder");
      expect(result).toContain("TestCo");
      expect(result).toContain("SaaS");
    });
  });
});
