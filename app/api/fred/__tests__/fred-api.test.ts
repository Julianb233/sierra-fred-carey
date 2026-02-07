/**
 * Tests for FRED API Endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth helper
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock FRED service
vi.mock("@/lib/fred/service", () => ({
  createFredService: vi.fn(() => ({
    process: vi.fn().mockResolvedValue({
      response: {
        content: "Test response",
        action: "recommend",
        confidence: 0.85,
        requiresApproval: false,
      },
      finalState: "complete",
      context: {
        validatedInput: {
          intent: "question",
          confidence: 0.9,
          entities: [],
          clarificationNeeded: [],
        },
        mentalModels: [
          {
            model: "first_principles",
            relevance: 0.8,
            confidence: 0.7,
            insights: ["Test insight"],
          },
        ],
        synthesis: {
          recommendation: "Test recommendation",
          confidence: 0.85,
          reasoning: "Test reasoning",
          alternatives: [],
        },
      },
      duration: 100,
    }),
    processStream: vi.fn(),
  })),
}));

// Mock scoring
vi.mock("@/lib/fred/scoring", () => ({
  scoreDecision: vi.fn().mockResolvedValue({
    percentage: 75,
    confidence: 0.8,
    recommendation: "proceed",
    uncertaintyRange: { low: 70, high: 80 },
    factors: {
      strategicAlignment: { value: 0.8, weight: 0.2, reasoning: "Good alignment" },
      leverage: { value: 0.7, weight: 0.15, reasoning: "Good leverage" },
      speed: { value: 0.6, weight: 0.15, reasoning: "Moderate speed" },
      revenue: { value: 0.75, weight: 0.15, reasoning: "Good revenue" },
      time: { value: 0.7, weight: 0.1, reasoning: "Good timing" },
      risk: { value: 0.65, weight: 0.15, reasoning: "Acceptable risk" },
      relationships: { value: 0.8, weight: 0.1, reasoning: "Good relationships" },
    },
    summary: "Test summary",
  }),
  detectDecisionType: vi.fn().mockReturnValue({ id: "general" }),
  recordPrediction: vi.fn().mockResolvedValue(undefined),
}));

// Mock memory functions
vi.mock("@/lib/db/fred-memory", () => ({
  retrieveRecentEpisodes: vi.fn().mockResolvedValue([]),
  searchEpisodesByEmbedding: vi.fn().mockResolvedValue([]),
  storeEpisode: vi.fn().mockResolvedValue({ id: "test-episode-id" }),
  getAllUserFacts: vi.fn().mockResolvedValue([]),
  getFactsByCategory: vi.fn().mockResolvedValue([]),
  getFact: vi.fn().mockResolvedValue(null),
  storeFact: vi.fn().mockResolvedValue({ id: "test-fact-id" }),
  deleteFact: vi.fn().mockResolvedValue(undefined),
  getRecentDecisions: vi.fn().mockResolvedValue([]),
  searchFactsByEmbedding: vi.fn().mockResolvedValue([]),
}));

// Mock AI client
vi.mock("@/lib/ai/fred-client", () => ({
  generateEmbedding: vi.fn().mockResolvedValue({
    embedding: new Array(1536).fill(0),
    model: "text-embedding-3-small",
    dimensions: 1536,
  }),
}));

// Mock rate limiting
vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimitForUser: vi.fn().mockResolvedValue({
    response: null,
    result: { success: true, limit: 20, remaining: 19, reset: 60 },
  }),
  applyRateLimitHeaders: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { POST as analyzePost } from "../analyze/route";
import { POST as decidePost } from "../decide/route";
import { GET as memoryGet, POST as memoryPost, DELETE as memoryDelete } from "../memory/route";
import { POST as chatPost } from "../chat/route";

const testUserId = "test-user-123";

function createMockRequest(
  url: string,
  method: string,
  body?: object
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    requestInit.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost"), requestInit);
}

describe("FRED API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(testUserId);
  });

  describe("POST /api/fred/analyze", () => {
    it("should return 400 for missing message", async () => {
      const req = createMockRequest("http://localhost/api/fred/analyze", "POST", {});
      const response = await analyzePost(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const req = createMockRequest("http://localhost/api/fred/analyze", "POST", {
        message: "Test message",
      });
      const response = await analyzePost(req);

      expect(response.status).toBe(401);
    });

    it("should analyze message successfully", async () => {
      const req = createMockRequest("http://localhost/api/fred/analyze", "POST", {
        message: "Should I hire a VP of Engineering?",
        context: {
          startupName: "TestCo",
          stage: "seed",
        },
      });

      const response = await analyzePost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
      expect(data.analysis).toBeDefined();
      expect(data.analysis.intent).toBe("question");
      expect(data.response.content).toBe("Test response");
    });

    it("should accept optional sessionId", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440000";
      const req = createMockRequest("http://localhost/api/fred/analyze", "POST", {
        message: "Test message",
        sessionId,
      });

      const response = await analyzePost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe(sessionId);
    });
  });

  describe("POST /api/fred/decide", () => {
    it("should return 400 for missing decision", async () => {
      const req = createMockRequest("http://localhost/api/fred/decide", "POST", {
        context: {},
      });
      const response = await decidePost(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should score decision successfully", async () => {
      const req = createMockRequest("http://localhost/api/fred/decide", "POST", {
        decision: "Should we raise a Series A now or wait 6 months?",
        context: {
          startupName: "TestCo",
          stage: "seed",
          industry: "SaaS",
        },
      });

      const response = await decidePost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.decisionId).toBeDefined();
      expect(data.scores).toBeDefined();
      expect(data.scores.composite).toBe(75);
      expect(data.scores.factors).toBeDefined();
      expect(data.scores.factors.strategicAlignment).toBeDefined();
    });

    it("should accept custom decisionType", async () => {
      const req = createMockRequest("http://localhost/api/fred/decide", "POST", {
        decision: "Should we take the $2M investment offer?",
        decisionType: "fundraising",
        context: {
          startupName: "TestCo",
        },
      });

      const response = await decidePost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisionType).toBe("fundraising");
    });

    it("should track calibration when requested", async () => {
      const { recordPrediction } = await import("@/lib/fred/scoring");

      const req = createMockRequest("http://localhost/api/fred/decide", "POST", {
        decision: "Should we pivot?",
        context: { startupName: "TestCo" },
        trackCalibration: true,
      });

      const response = await decidePost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.calibrationTracked).toBe(true);
      expect(recordPrediction).toHaveBeenCalled();
    });
  });

  describe("GET /api/fred/memory", () => {
    it("should return all user facts by default", async () => {
      const { getAllUserFacts } = await import("@/lib/db/fred-memory");
      vi.mocked(getAllUserFacts).mockResolvedValue([
        {
          id: "fact-1",
          userId: testUserId,
          category: "startup_facts",
          key: "name",
          value: { name: "TestCo" },
          confidence: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const req = createMockRequest("http://localhost/api/fred/memory", "GET");
      const response = await memoryGet(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe("facts");
      expect(data.data).toHaveLength(1);
    });

    it("should retrieve episodes when type=episodes", async () => {
      const { retrieveRecentEpisodes } = await import("@/lib/db/fred-memory");
      vi.mocked(retrieveRecentEpisodes).mockResolvedValue([]);

      const req = createMockRequest(
        "http://localhost/api/fred/memory?type=episodes",
        "GET"
      );
      const response = await memoryGet(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("episodes");
      expect(retrieveRecentEpisodes).toHaveBeenCalled();
    });

    it("should retrieve decisions when type=decisions", async () => {
      const { getRecentDecisions } = await import("@/lib/db/fred-memory");
      vi.mocked(getRecentDecisions).mockResolvedValue([]);

      const req = createMockRequest(
        "http://localhost/api/fred/memory?type=decisions",
        "GET"
      );
      const response = await memoryGet(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("decisions");
      expect(getRecentDecisions).toHaveBeenCalled();
    });

    it("should search by embedding when type=search", async () => {
      const req = createMockRequest(
        "http://localhost/api/fred/memory?type=search&query=fundraising",
        "GET"
      );
      const response = await memoryGet(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("search");
      expect(data.query).toBe("fundraising");
    });

    it("should return 400 for search without query", async () => {
      const req = createMockRequest(
        "http://localhost/api/fred/memory?type=search",
        "GET"
      );
      const response = await memoryGet(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Query parameter required");
    });
  });

  describe("POST /api/fred/memory", () => {
    it("should store a fact", async () => {
      const { storeFact } = await import("@/lib/db/fred-memory");

      const req = createMockRequest("http://localhost/api/fred/memory", "POST", {
        type: "fact",
        category: "startup_facts",
        key: "company_name",
        value: { name: "TestCo" },
      });

      const response = await memoryPost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe("fact");
      expect(storeFact).toHaveBeenCalledWith(
        testUserId,
        "startup_facts",
        "company_name",
        { name: "TestCo" },
        expect.any(Object)
      );
    });

    it("should store an episode", async () => {
      const { storeEpisode } = await import("@/lib/db/fred-memory");

      const req = createMockRequest("http://localhost/api/fred/memory", "POST", {
        type: "episode",
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        eventType: "conversation",
        content: { role: "user", message: "Test" },
      });

      const response = await memoryPost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe("episode");
      expect(storeEpisode).toHaveBeenCalled();
    });

    it("should return 400 for invalid type", async () => {
      const req = createMockRequest("http://localhost/api/fred/memory", "POST", {
        type: "invalid",
      });

      const response = await memoryPost(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("DELETE /api/fred/memory", () => {
    it("should delete a fact", async () => {
      const { deleteFact } = await import("@/lib/db/fred-memory");

      const req = createMockRequest("http://localhost/api/fred/memory", "DELETE", {
        category: "startup_facts",
        key: "old_fact",
      });

      const response = await memoryDelete(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteFact).toHaveBeenCalledWith(testUserId, "startup_facts", "old_fact");
    });

    it("should return 400 for missing category", async () => {
      const req = createMockRequest("http://localhost/api/fred/memory", "DELETE", {
        key: "test",
      });

      const response = await memoryDelete(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/fred/chat", () => {
    it("should return non-streaming response when stream=false", async () => {
      const req = createMockRequest("http://localhost/api/fred/chat", "POST", {
        message: "Hello FRED",
        stream: false,
      });

      const response = await chatPost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response.content).toBe("Test response");
    });

    it("should return SSE stream when stream=true", async () => {
      const req = createMockRequest("http://localhost/api/fred/chat", "POST", {
        message: "Hello FRED",
        stream: true,
      });

      const response = await chatPost(req);

      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("should return 400 for missing message", async () => {
      const req = createMockRequest("http://localhost/api/fred/chat", "POST", {
        stream: false,
      });

      const response = await chatPost(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
