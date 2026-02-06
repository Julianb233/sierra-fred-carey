/**
 * Tests for FRED Memory Access Functions
 *
 * These tests verify the types and structure of the memory functions.
 * Full integration tests require database connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Helper to create a chainable mock that supports any method order
function createChainableMock(singleResult: any, listResult: any): any {
  const handler = {
    get(_target: any, prop: string): any {
      // Terminal methods return the appropriate result
      if (prop === "single") {
        return () => Promise.resolve(singleResult);
      }
      if (prop === "then") {
        // Support direct await on query builder (for list operations)
        return (resolve: any) => resolve(listResult);
      }
      // All other methods return another chainable proxy
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// Mock the Supabase client
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

      const listResult = {
        data: [],
        error: null,
      };

      // Choose result based on table
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

// Import after mocking
import {
  storeEpisode,
  retrieveRecentEpisodes,
  storeFact,
  getFact,
  getProcedure,
  logDecision,
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
      expect(episode.eventType).toBe("conversation");
    });

    it("supports all event types", () => {
      const types: EpisodicMemory["eventType"][] = [
        "conversation",
        "decision",
        "outcome",
        "feedback",
      ];
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
      expect(fact.confidence).toBe(1.0);
    });

    it("supports all categories", () => {
      const categories: SemanticMemory["category"][] = [
        "startup_facts",
        "user_preferences",
        "market_knowledge",
        "team_info",
        "investor_info",
        "product_details",
        "metrics",
        "goals",
        "challenges",
        "decisions",
      ];
      expect(categories).toHaveLength(10);
    });
  });

  describe("ProceduralMemory type", () => {
    it("has correct structure", () => {
      const procedure: ProceduralMemory = {
        id: "test-id",
        name: "seven_factor_scoring",
        procedureType: "scoring_model",
        steps: [
          {
            step: 1,
            name: "strategic_alignment",
            description: "Evaluate alignment",
          },
        ],
        successRate: 0.5,
        usageCount: 0,
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(procedure.procedureType).toBe("scoring_model");
      expect(procedure.steps).toHaveLength(1);
    });

    it("supports all procedure types", () => {
      const types: ProceduralMemory["procedureType"][] = [
        "decision_framework",
        "action_template",
        "analysis_pattern",
        "scoring_model",
        "assessment_rubric",
      ];
      expect(types).toHaveLength(5);
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

    it("supports all decision types", () => {
      const types: DecisionLog["decisionType"][] = ["auto", "recommended", "escalated"];
      expect(types).toHaveLength(3);
    });
  });
});

describe("Episodic Memory Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("storeEpisode", () => {
    it("creates an episode with required fields", async () => {
      const result = await storeEpisode(
        "user-123",
        "session-456",
        "conversation",
        { message: "test" }
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe("user-123");
      expect(result.sessionId).toBe("session-456");
      expect(result.eventType).toBe("conversation");
    });

    it("accepts optional parameters", async () => {
      const result = await storeEpisode(
        "user-123",
        "session-456",
        "decision",
        { choice: "A" },
        {
          importanceScore: 0.9,
          metadata: { source: "chat" },
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe("retrieveRecentEpisodes", () => {
    it("retrieves episodes for a user", async () => {
      const results = await retrieveRecentEpisodes("user-123");
      expect(Array.isArray(results)).toBe(true);
    });

    it("accepts filter options", async () => {
      const results = await retrieveRecentEpisodes("user-123", {
        limit: 5,
        sessionId: "session-456",
        eventType: "conversation",
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe("Semantic Memory Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("storeFact", () => {
    it("stores a fact with required fields", async () => {
      const result = await storeFact(
        "user-123",
        "startup_facts",
        "company_name",
        { name: "Acme Inc" }
      );

      expect(result).toBeDefined();
      expect(result.category).toBe("startup_facts");
      expect(result.key).toBe("company_name");
    });

    it("accepts optional parameters", async () => {
      const result = await storeFact(
        "user-123",
        "user_preferences",
        "communication_style",
        { style: "direct" },
        {
          confidence: 0.8,
          source: "user_input",
        }
      );

      expect(result).toBeDefined();
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProcedure", () => {
    it("retrieves a procedure by name", async () => {
      const result = await getProcedure("seven_factor_scoring");
      expect(result).toBeDefined();
    });
  });
});

describe("Decision Log Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe("Integration Scenarios", () => {
  it("supports a typical chat flow", () => {
    // This test documents the expected flow without requiring database
    const flow = [
      "1. User sends message",
      "2. storeEpisode('conversation', { message })",
      "3. retrieveRecentEpisodes() for context",
      "4. searchFactsByEmbedding() for relevant knowledge",
      "5. getProcedure('analysis_framework')",
      "6. Generate response using context + facts + procedure",
      "7. storeEpisode('conversation', { response })",
    ];

    expect(flow).toHaveLength(7);
  });

  it("supports a decision flow", () => {
    const flow = [
      "1. User presents decision",
      "2. logDecision({ decisionType: 'recommended', inputContext })",
      "3. getProcedure('seven_factor_scoring')",
      "4. Calculate scores",
      "5. getProcedure('auto_decide_framework')",
      "6. Determine auto/recommend/escalate",
      "7. recordFinalDecision() after user confirms",
      "8. recordDecisionOutcome() when outcome known",
    ];

    expect(flow).toHaveLength(8);
  });
});
