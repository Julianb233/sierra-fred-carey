/**
 * Tests for AI SDK 6 Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getModel,
  getEmbedding,
  getAvailableProviders,
  hasAnyProvider,
  PROVIDER_METADATA,
  EMBEDDING_METADATA,
} from "../providers";
import {
  entitySchema,
  clarificationSchema,
  validatedInputSchema,
  mentalModelSchema,
  factorScoreSchema,
  factorScoresSchema,
} from "../schemas";
import { z } from "zod";

// Mock environment variables
const mockEnv = (vars: Record<string, string | undefined>) => {
  const original = process.env;
  vi.stubEnv("OPENAI_API_KEY", vars.OPENAI_API_KEY ?? undefined);
  vi.stubEnv("ANTHROPIC_API_KEY", vars.ANTHROPIC_API_KEY ?? undefined);
  vi.stubEnv("GOOGLE_API_KEY", vars.GOOGLE_API_KEY ?? undefined);
  return () => {
    vi.unstubAllEnvs();
  };
};

describe("Provider Configuration", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return no providers when no API keys are set", () => {
    mockEnv({});
    const providers = getAvailableProviders();
    expect(providers).toHaveLength(0);
    expect(hasAnyProvider()).toBe(false);
  });

  it("should return OpenAI providers when OPENAI_API_KEY is set", () => {
    mockEnv({ OPENAI_API_KEY: "test-key" });
    const providers = getAvailableProviders();
    expect(providers).toContain("primary");
    expect(providers).toContain("fast");
    expect(providers).toContain("reasoning");
    expect(hasAnyProvider()).toBe(true);
  });

  it("should return Anthropic fallback when ANTHROPIC_API_KEY is set", () => {
    mockEnv({ ANTHROPIC_API_KEY: "test-key" });
    const providers = getAvailableProviders();
    expect(providers).toContain("fallback1");
    expect(hasAnyProvider()).toBe(true);
  });

  it("should return Google fallback when GOOGLE_API_KEY is set", () => {
    mockEnv({ GOOGLE_API_KEY: "test-key" });
    const providers = getAvailableProviders();
    expect(providers).toContain("fallback2");
    expect(hasAnyProvider()).toBe(true);
  });

  it("should throw error when getting model with no providers", () => {
    mockEnv({});
    expect(() => getModel("primary")).toThrow("No AI providers configured");
  });

  it("should return model when provider is available", () => {
    mockEnv({ OPENAI_API_KEY: "test-key" });
    const model = getModel("primary");
    expect(model).toBeDefined();
  });

  it("should throw error for embedding when no OpenAI key", () => {
    mockEnv({ ANTHROPIC_API_KEY: "test-key" }); // Only Anthropic
    expect(() => getEmbedding()).toThrow("Embedding model not available");
  });

  it("should return embedding model when OpenAI is available", () => {
    mockEnv({ OPENAI_API_KEY: "test-key" });
    const embedding = getEmbedding();
    expect(embedding).toBeDefined();
  });
});

describe("Provider Metadata", () => {
  it("should have metadata for all provider keys", () => {
    const expectedKeys = ["primary", "fallback1", "fallback2", "fast", "reasoning"];
    for (const key of expectedKeys) {
      expect(PROVIDER_METADATA[key as keyof typeof PROVIDER_METADATA]).toBeDefined();
      expect(PROVIDER_METADATA[key as keyof typeof PROVIDER_METADATA].name).toBeTruthy();
      expect(PROVIDER_METADATA[key as keyof typeof PROVIDER_METADATA].costPerMillionTokens.input).toBeGreaterThan(0);
      expect(PROVIDER_METADATA[key as keyof typeof PROVIDER_METADATA].costPerMillionTokens.output).toBeGreaterThan(0);
    }
  });

  it("should have metadata for embedding models", () => {
    expect(EMBEDDING_METADATA.embedding).toBeDefined();
    expect(EMBEDDING_METADATA.embedding.dimensions).toBe(1536);
    expect(EMBEDDING_METADATA.embeddingLarge).toBeDefined();
    expect(EMBEDDING_METADATA.embeddingLarge.dimensions).toBe(3072);
  });
});

describe("Structured Output Schemas", () => {
  describe("Entity Schema", () => {
    it("should validate a valid entity", () => {
      const entity = {
        type: "money",
        value: "$500,000",
        confidence: 0.95,
        context: "investment amount",
      };
      expect(() => entitySchema.parse(entity)).not.toThrow();
    });

    it("should reject invalid entity type", () => {
      const entity = {
        type: "invalid_type",
        value: "test",
        confidence: 0.5,
      };
      expect(() => entitySchema.parse(entity)).toThrow();
    });

    it("should reject confidence out of range", () => {
      const entity = {
        type: "money",
        value: "test",
        confidence: 1.5, // Out of range
      };
      expect(() => entitySchema.parse(entity)).toThrow();
    });
  });

  describe("Clarification Schema", () => {
    it("should validate a valid clarification", () => {
      const clarification = {
        question: "What is the timeline?",
        priority: "required",
        context: "Need to know deadline",
      };
      expect(() => clarificationSchema.parse(clarification)).not.toThrow();
    });

    it("should reject invalid priority", () => {
      const clarification = {
        question: "Test?",
        priority: "urgent", // Invalid
      };
      expect(() => clarificationSchema.parse(clarification)).toThrow();
    });
  });

  describe("Validated Input Schema", () => {
    it("should validate a complete validated input", () => {
      const input = {
        intent: "decision_request",
        entities: [
          { type: "money", value: "$1M", confidence: 0.9 },
        ],
        confidence: 0.85,
        clarificationNeeded: [],
        sentiment: "positive",
        urgency: "high",
        topic: "fundraising",
      };
      expect(() => validatedInputSchema.parse(input)).not.toThrow();
    });

    it("should accept minimal required fields", () => {
      const input = {
        intent: "question",
        entities: [],
        confidence: 0.5,
        clarificationNeeded: [],
      };
      expect(() => validatedInputSchema.parse(input)).not.toThrow();
    });
  });

  describe("Mental Model Schema", () => {
    it("should validate a mental model result", () => {
      const model = {
        model: "first_principles",
        analysis: { key1: "value1", key2: 123 },
        relevance: 0.8,
        confidence: 0.75,
        insights: ["Insight 1", "Insight 2"],
      };
      expect(() => mentalModelSchema.parse(model)).not.toThrow();
    });

    it("should reject unknown model types", () => {
      const model = {
        model: "unknown_model",
        analysis: {},
        relevance: 0.5,
        confidence: 0.5,
        insights: [],
      };
      expect(() => mentalModelSchema.parse(model)).toThrow();
    });
  });

  describe("Factor Score Schemas", () => {
    it("should validate a factor score", () => {
      const score = {
        value: 0.75,
        confidence: 0.8,
        reasoning: "Strong alignment with goals",
        evidence: ["Evidence 1", "Evidence 2"],
      };
      expect(() => factorScoreSchema.parse(score)).not.toThrow();
    });

    it("should validate complete factor scores", () => {
      const makeScore = () => ({
        value: 0.7,
        confidence: 0.8,
        reasoning: "Test reasoning",
        evidence: ["test"],
      });

      const scores = {
        strategicAlignment: makeScore(),
        leverage: makeScore(),
        speed: makeScore(),
        revenue: makeScore(),
        time: makeScore(),
        risk: makeScore(),
        relationships: makeScore(),
      };
      expect(() => factorScoresSchema.parse(scores)).not.toThrow();
    });

    it("should reject missing factors", () => {
      const scores = {
        strategicAlignment: {
          value: 0.7,
          confidence: 0.8,
          reasoning: "Test",
          evidence: [],
        },
        // Missing other factors
      };
      expect(() => factorScoresSchema.parse(scores)).toThrow();
    });
  });
});

describe("Schema Type Inference", () => {
  it("should properly infer entity type", () => {
    type EntityType = z.infer<typeof entitySchema>;
    const entity: EntityType = {
      type: "money",
      value: "$100",
      confidence: 0.9,
    };
    expect(entity.type).toBe("money");
  });

  it("should properly infer validated input type", () => {
    type ValidatedInputType = z.infer<typeof validatedInputSchema>;
    const input: ValidatedInputType = {
      intent: "decision_request",
      entities: [],
      confidence: 0.8,
      clarificationNeeded: [],
    };
    expect(input.intent).toBe("decision_request");
  });
});
