/**
 * Tests for FRED Memory Access Functions
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

function createChainableMock(singleResult: any, listResult: any): any {
  const handler = {
    get(_target: any, prop: string): any {
      if (prop === "single") {
        return () => Promise.resolve(singleResult);
      }
      if (prop === "then") {
        return (resolve: any) => resolve(listResult);
      }
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((tableName: string) => {
      const episodicResult = {
        data: {
          id: "test-id",
          user_id: "user-123",
          session_id: "session-456",
          event_type: "conversation",
          content: { message: "test" },
          importance_score: 0.5,
          created_at: new Date().toISOString(),
          metadata: {},
        },
        error: null,
      };

      const semanticResult = {
        data: {
          id: "test-id",
          user_id: "user-123",
          category: "startup_facts",
          key: "company_name",
          value: { name: "Acme Inc" },
          confidence: 1.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };

      const proceduralResult = {
        data: {
          id: "test-id",
          name: "seven_factor_scoring",
          procedure_type: "scoring_model",
          steps: [],
          is_active: true,
          usage_count: 0,
          success_rate: 0.5,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };

      const decisionResult = {
        data: {
          id: "decision-id",
          user_id: "user-123",
          session_id: "session-456",
          decision_type: "recommended",
          input_context: { question: "test" },
          created_at: new Date().toISOString(),
        },
        error: null,
      };

      let singleResult = episodicResult;
      let listData = [episodicResult.data];
      if (tableName === "fred_semantic_memory") {
        singleResult = semanticResult;
        listData = [semanticResult.data];
      } else if (tableName === "fred_procedural_memory") {
        singleResult = proceduralResult;
        listData = [proceduralResult.data];
      } else if (tableName === "fred_decision_log") {
        singleResult = decisionResult;
        listData = [decisionResult.data];
      }

      return createChainableMock(singleResult, { data: listData, error: null });
    }),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: [],
        error: { message: "Function not found" },
      })
    ),
  })),
}));

import {
  storeEpisode,
  retrieveRecentEpisodes,
  storeFact,
  getFact,
  getProcedure,
  logDecision,
  computeEpisodeContentHash,
  type EpisodicMemory,
  type SemanticMemory,
  type ProceduralMemory,
  type DecisionLog,
} from "../fred-memory";

describe("FRED Memory Types", () => {
  describe("EpisodicMemory type", () => {
    it("has correct structure", () => {
      const episode: EpisodicMemory = {
        id: "test-id",
        userId: "user-123",
        sessionId: "session-456",
        eventType: "conversation",
        content: { message: "test" },
        importanceScore: 0.5,
        createdAt: new Date(),
        metadata: {},
      };
      expect(episode.id).toBeDefined();
      expect(episode.userId).toBe("user-123");
    });

    it("supports all event types", () => {
      const types: EpisodicMemory["eventType"][] = ["conversation", "decision", "outcome", "feedback"];
      expect(types).toHaveLength(4);
    });
  });

  describe("SemanticMemory type", () => {
    it("has correct structure", () => {
      const fact: SemanticMemory = {
        id: "test-id",
        userId: "user-123",
        category: "startup_facts",
        key: "company_name",
        value: { name: "Acme" },
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(fact.category).toBe("startup_facts");
    });
  });

  describe("ProceduralMemory type", () => {
    it("has correct structure", () => {
      const procedure: ProceduralMemory = {
        id: "test-id",
        name: "seven_factor_scoring",
        procedureType: "scoring_model",
        steps: [{ step: 1, name: "strategic_alignment", description: "Evaluate alignment" }],
        successRate: 0.5,
        usageCount: 0,
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(procedure.procedureType).toBe("scoring_model");
    });
  });

  describe("DecisionLog type", () => {
    it("has correct structure", () => {
      const decision: DecisionLog = {
        id: "test-id",
        userId: "user-123",
        sessionId: "session-456",
        decisionType: "recommended",
        inputContext: { question: "Should we pivot?" },
        createdAt: new Date(),
      };
      expect(decision.decisionType).toBe("recommended");
    });
  });
});

describe("Episodic Memory Operations", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("storeEpisode", () => {
    it("creates an episode with required fields", async () => {
      const result = await storeEpisode("user-123", "session-456", "conversation", { message: "test" });
      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.eventType).toBe("conversation");
    });

    it("accepts optional parameters", async () => {
      const result = await storeEpisode("user-123", "session-456", "decision", { choice: "A" }, {
        importanceScore: 0.9,
        metadata: { source: "chat" },
      });
      expect(result).toBeDefined();
    });
  });

  describe("retrieveRecentEpisodes", () => {
    it("retrieves episodes for a user", async () => {
      const results = await retrieveRecentEpisodes("user-123");
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe("Semantic Memory Operations", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("storeFact", () => {
    it("stores a fact with required fields", async () => {
      const result = await storeFact("user-123", "startup_facts", "company_name", { name: "Acme Inc" });
      expect(result).toBeDefined();
      expect(result.category).toBe("startup_facts");
    });
  });

  describe("getFact", () => {
    it("retrieves a specific fact", async () => {
      const result = await getFact("user-123", "startup_facts", "company_name");
      expect(result).toBeDefined();
    });
  });
});

describe("Procedural Memory Operations", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("getProcedure", () => {
    it("retrieves a procedure by name", async () => {
      const result = await getProcedure("seven_factor_scoring");
      expect(result).toBeDefined();
    });
  });
});

describe("Decision Log Operations", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("logDecision", () => {
    it("logs a decision with required fields", async () => {
      const result = await logDecision("user-123", "session-456", {
        decisionType: "recommended",
        inputContext: { question: "Should we pursue this opportunity?" },
        scores: { strategic_alignment: 8, leverage: 7 },
        confidence: 0.85,
      });
      expect(result).toBeDefined();
      expect(result.decisionType).toBe("recommended");
    });
  });
});

describe("Episode Deduplication", () => {
  describe("computeEpisodeContentHash", () => {
    it("produces deterministic hashes for same input", () => {
      const h1 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello world" });
      const h2 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello world" });
      expect(h1).toBe(h2);
    });

    it("produces different hashes for different content", () => {
      const h1 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello" });
      const h2 = computeEpisodeContentHash("conversation", { role: "user", content: "Goodbye" });
      expect(h1).not.toBe(h2);
    });

    it("produces different hashes for different roles", () => {
      const h1 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello" });
      const h2 = computeEpisodeContentHash("conversation", { role: "assistant", content: "Hello" });
      expect(h1).not.toBe(h2);
    });

    it("produces different hashes for different event types", () => {
      const h1 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello" });
      const h2 = computeEpisodeContentHash("decision", { role: "user", content: "Hello" });
      expect(h1).not.toBe(h2);
    });

    it("handles content without role/content fields using JSON fallback", () => {
      const h1 = computeEpisodeContentHash("feedback", { rating: 5, comment: "Great" });
      const h2 = computeEpisodeContentHash("feedback", { rating: 5, comment: "Great" });
      expect(h1).toBe(h2);
      const h3 = computeEpisodeContentHash("feedback", { rating: 3, comment: "OK" });
      expect(h1).not.toBe(h3);
    });

    it("ignores extra metadata fields for conversation events", () => {
      const h1 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello", timestamp: "2024-01-01" });
      const h2 = computeEpisodeContentHash("conversation", { role: "user", content: "Hello", timestamp: "2024-01-02" });
      expect(h1).toBe(h2);
    });
  });
});
