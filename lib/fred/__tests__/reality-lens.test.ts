/**
 * Reality Lens Assessment Engine Tests
 *
 * Tests for the 5-factor Reality Lens assessment system.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REALITY_LENS_FACTORS,
  FACTOR_WEIGHTS,
  FACTOR_DESCRIPTIONS,
  VERDICT_THRESHOLDS,
  VERDICT_DESCRIPTIONS,
  getVerdictFromScore,
  calculateOverallScore,
  RealityLensInputSchema,
  RealityLensResultSchema,
  FactorAssessmentSchema,
  RealityLensContextSchema,
  type FactorsResult,
  type FactorAssessment,
  type Verdict,
} from "../schemas/reality-lens";
import { assessIdea, validateInput } from "../reality-lens";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("Reality Lens Schemas", () => {
  describe("RealityLensInputSchema", () => {
    it("should accept valid input with idea only", () => {
      const input = {
        idea: "An AI-powered tool that helps founders make better business decisions by analyzing market data and providing personalized recommendations.",
      };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept valid input with full context", () => {
      const input = {
        idea: "A B2B SaaS platform for enterprise document management",
        context: {
          stage: "mvp",
          funding: "pre-seed",
          teamSize: 3,
          industry: "Enterprise Software",
          targetMarket: "Mid-market companies with 100-1000 employees",
          mrr: 5000,
          customerCount: 10,
          runwayMonths: 12,
        },
      };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject idea that is too short", () => {
      const input = { idea: "Short" };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty idea", () => {
      const input = { idea: "" };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid stage enum", () => {
      const input = {
        idea: "A valid idea description that meets minimum length",
        context: { stage: "invalid-stage" },
      };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative team size", () => {
      const input = {
        idea: "A valid idea description that meets minimum length",
        context: { teamSize: -1 },
      };
      const result = RealityLensInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("RealityLensContextSchema", () => {
    it("should accept all valid enum values for stage", () => {
      const stages = ["idea", "mvp", "launched", "scaling"];
      for (const stage of stages) {
        const result = RealityLensContextSchema.safeParse({ stage });
        expect(result.success).toBe(true);
      }
    });

    it("should accept all valid enum values for funding", () => {
      const fundingStages = [
        "bootstrapped",
        "pre-seed",
        "seed",
        "series-a",
        "series-b-plus",
      ];
      for (const funding of fundingStages) {
        const result = RealityLensContextSchema.safeParse({ funding });
        expect(result.success).toBe(true);
      }
    });

    it("should accept empty context object", () => {
      const result = RealityLensContextSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("FactorAssessmentSchema", () => {
    it("should accept valid factor assessment", () => {
      const assessment = {
        score: 75,
        confidence: "high",
        summary: "Strong technical team with relevant experience.",
        strengths: ["Experienced founders", "Proven technology"],
        weaknesses: ["Limited market validation"],
        questions: ["What is the customer acquisition cost?"],
        recommendations: ["Focus on customer discovery"],
      };
      const result = FactorAssessmentSchema.safeParse(assessment);
      expect(result.success).toBe(true);
    });

    it("should reject score outside 0-100 range", () => {
      const assessment = {
        score: 150,
        confidence: "high",
        summary: "Test summary that is long enough",
        strengths: [],
        weaknesses: [],
        questions: [],
        recommendations: [],
      };
      const result = FactorAssessmentSchema.safeParse(assessment);
      expect(result.success).toBe(false);
    });

    it("should reject invalid confidence level", () => {
      const assessment = {
        score: 50,
        confidence: "very-high",
        summary: "Test summary that is long enough",
        strengths: [],
        weaknesses: [],
        questions: [],
        recommendations: [],
      };
      const result = FactorAssessmentSchema.safeParse(assessment);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Score Calculation Tests
// ============================================================================

describe("Score Calculations", () => {
  describe("getVerdictFromScore", () => {
    it("should return 'strong' for scores >= 80", () => {
      expect(getVerdictFromScore(80)).toBe("strong");
      expect(getVerdictFromScore(90)).toBe("strong");
      expect(getVerdictFromScore(100)).toBe("strong");
    });

    it("should return 'promising' for scores 60-79", () => {
      expect(getVerdictFromScore(60)).toBe("promising");
      expect(getVerdictFromScore(70)).toBe("promising");
      expect(getVerdictFromScore(79)).toBe("promising");
    });

    it("should return 'needs-work' for scores 40-59", () => {
      expect(getVerdictFromScore(40)).toBe("needs-work");
      expect(getVerdictFromScore(50)).toBe("needs-work");
      expect(getVerdictFromScore(59)).toBe("needs-work");
    });

    it("should return 'reconsider' for scores < 40", () => {
      expect(getVerdictFromScore(0)).toBe("reconsider");
      expect(getVerdictFromScore(20)).toBe("reconsider");
      expect(getVerdictFromScore(39)).toBe("reconsider");
    });

    it("should handle boundary values correctly", () => {
      expect(getVerdictFromScore(79.9)).toBe("promising");
      expect(getVerdictFromScore(59.9)).toBe("needs-work");
      expect(getVerdictFromScore(39.9)).toBe("reconsider");
    });
  });

  describe("calculateOverallScore", () => {
    it("should calculate weighted average correctly", () => {
      const factors: FactorsResult = {
        feasibility: createMockAssessment(80),
        economics: createMockAssessment(80),
        demand: createMockAssessment(80),
        distribution: createMockAssessment(80),
        timing: createMockAssessment(80),
      };
      // All factors at 80, weighted average should be 80
      expect(calculateOverallScore(factors)).toBe(80);
    });

    it("should weight demand and economics more heavily", () => {
      const factors: FactorsResult = {
        feasibility: createMockAssessment(50),
        economics: createMockAssessment(90), // Weight: 0.25
        demand: createMockAssessment(90), // Weight: 0.25
        distribution: createMockAssessment(50),
        timing: createMockAssessment(50),
      };
      // High scores in heavily weighted factors should pull average up
      const score = calculateOverallScore(factors);
      expect(score).toBeGreaterThan(60);
    });

    it("should handle extreme low scores", () => {
      const factors: FactorsResult = {
        feasibility: createMockAssessment(0),
        economics: createMockAssessment(0),
        demand: createMockAssessment(0),
        distribution: createMockAssessment(0),
        timing: createMockAssessment(0),
      };
      expect(calculateOverallScore(factors)).toBe(0);
    });

    it("should handle extreme high scores", () => {
      const factors: FactorsResult = {
        feasibility: createMockAssessment(100),
        economics: createMockAssessment(100),
        demand: createMockAssessment(100),
        distribution: createMockAssessment(100),
        timing: createMockAssessment(100),
      };
      expect(calculateOverallScore(factors)).toBe(100);
    });
  });
});

// ============================================================================
// Factor Constants Tests
// ============================================================================

describe("Factor Constants", () => {
  describe("FACTOR_WEIGHTS", () => {
    it("should have weights that sum to 1.0", () => {
      const totalWeight = Object.values(FACTOR_WEIGHTS).reduce(
        (sum, weight) => sum + weight,
        0
      );
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it("should have demand and economics as highest weights", () => {
      expect(FACTOR_WEIGHTS.demand).toBe(0.25);
      expect(FACTOR_WEIGHTS.economics).toBe(0.25);
    });

    it("should have all 5 factors defined", () => {
      expect(Object.keys(FACTOR_WEIGHTS)).toHaveLength(5);
      expect(FACTOR_WEIGHTS).toHaveProperty("feasibility");
      expect(FACTOR_WEIGHTS).toHaveProperty("economics");
      expect(FACTOR_WEIGHTS).toHaveProperty("demand");
      expect(FACTOR_WEIGHTS).toHaveProperty("distribution");
      expect(FACTOR_WEIGHTS).toHaveProperty("timing");
    });
  });

  describe("FACTOR_DESCRIPTIONS", () => {
    it("should have descriptions for all factors", () => {
      for (const factor of REALITY_LENS_FACTORS) {
        expect(FACTOR_DESCRIPTIONS[factor]).toBeDefined();
        expect(FACTOR_DESCRIPTIONS[factor].length).toBeGreaterThan(20);
      }
    });
  });

  describe("VERDICT_THRESHOLDS", () => {
    it("should have non-overlapping ranges", () => {
      expect(VERDICT_THRESHOLDS.strong.min).toBe(80);
      expect(VERDICT_THRESHOLDS.promising.min).toBe(60);
      expect(VERDICT_THRESHOLDS["needs-work"].min).toBe(40);
      expect(VERDICT_THRESHOLDS.reconsider.min).toBe(0);
    });

    it("should cover full 0-100 range", () => {
      expect(VERDICT_THRESHOLDS.reconsider.min).toBe(0);
      expect(VERDICT_THRESHOLDS.strong.max).toBe(100);
    });
  });

  describe("VERDICT_DESCRIPTIONS", () => {
    it("should have descriptions for all verdicts", () => {
      const verdicts: Verdict[] = [
        "strong",
        "promising",
        "needs-work",
        "reconsider",
      ];
      for (const verdict of verdicts) {
        expect(VERDICT_DESCRIPTIONS[verdict]).toBeDefined();
        expect(VERDICT_DESCRIPTIONS[verdict].length).toBeGreaterThan(10);
      }
    });
  });
});

// ============================================================================
// Input Validation Tests
// ============================================================================

describe("validateInput", () => {
  it("should return valid for correct input", () => {
    const input = {
      idea: "A mobile app that connects local farmers with consumers for fresh produce delivery.",
    };
    const result = validateInput(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.idea).toBe(input.idea);
    }
  });

  it("should return errors for invalid input", () => {
    const input = { idea: "short" };
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("should return errors for missing idea", () => {
    const input = {};
    const result = validateInput(input);
    expect(result.valid).toBe(false);
  });

  it("should preserve context when valid", () => {
    const input = {
      idea: "A SaaS platform for project management with AI-powered insights",
      context: {
        stage: "mvp",
        funding: "pre-seed",
        teamSize: 4,
      },
    };
    const result = validateInput(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.context?.stage).toBe("mvp");
      expect(result.data.context?.funding).toBe("pre-seed");
      expect(result.data.context?.teamSize).toBe(4);
    }
  });
});

// ============================================================================
// Assessment Engine Tests (with heuristics)
// ============================================================================

describe("assessIdea", () => {
  it("should return a valid assessment result structure", async () => {
    const result = await assessIdea(
      {
        idea: "A mobile app that uses AI to help people learn new languages through conversation practice with AI tutors.",
      },
      { useHeuristics: true }
    );

    // Validate structure
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("verdictDescription");
    expect(result).toHaveProperty("factors");
    expect(result).toHaveProperty("topStrengths");
    expect(result).toHaveProperty("criticalRisks");
    expect(result).toHaveProperty("nextSteps");
    expect(result).toHaveProperty("executiveSummary");
    expect(result).toHaveProperty("metadata");

    // Validate types
    expect(typeof result.overallScore).toBe("number");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    // Validate factors exist
    expect(result.factors).toHaveProperty("feasibility");
    expect(result.factors).toHaveProperty("economics");
    expect(result.factors).toHaveProperty("demand");
    expect(result.factors).toHaveProperty("distribution");
    expect(result.factors).toHaveProperty("timing");
  });

  it("should include valid metadata", async () => {
    const result = await assessIdea(
      { idea: "A platform for remote team collaboration and async communication" },
      { useHeuristics: true }
    );

    expect(result.metadata.assessmentId).toBeDefined();
    expect(result.metadata.timestamp).toBeDefined();
    expect(result.metadata.version).toBe("1.0");
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return verdict matching score", async () => {
    const result = await assessIdea(
      { idea: "A subscription service for premium coffee delivered monthly to customers" },
      { useHeuristics: true }
    );

    const expectedVerdict = getVerdictFromScore(result.overallScore);
    expect(result.verdict).toBe(expectedVerdict);
  });

  it("should include strengths and risks arrays", async () => {
    const result = await assessIdea(
      { idea: "An e-commerce marketplace for handmade crafts and artisan goods" },
      { useHeuristics: true }
    );

    expect(Array.isArray(result.topStrengths)).toBe(true);
    expect(Array.isArray(result.criticalRisks)).toBe(true);
    expect(Array.isArray(result.nextSteps)).toBe(true);
    expect(result.topStrengths.length).toBeLessThanOrEqual(3);
    expect(result.criticalRisks.length).toBeLessThanOrEqual(3);
    expect(result.nextSteps.length).toBeLessThanOrEqual(5);
  });

  it("should handle context information", async () => {
    const result = await assessIdea(
      {
        idea: "A B2B software platform for inventory management",
        context: {
          stage: "launched",
          funding: "seed",
          teamSize: 8,
          mrr: 25000,
          customerCount: 50,
        },
      },
      { useHeuristics: true }
    );

    // Should complete without error
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("should pass full schema validation", async () => {
    const result = await assessIdea(
      { idea: "A fitness app that creates personalized workout plans using machine learning" },
      { useHeuristics: true }
    );

    const validation = RealityLensResultSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockAssessment(score: number): FactorAssessment {
  return {
    score,
    confidence: "medium",
    summary: "Mock assessment for testing purposes.",
    strengths: ["Test strength"],
    weaknesses: ["Test weakness"],
    questions: ["Test question?"],
    recommendations: ["Test recommendation"],
  };
}
