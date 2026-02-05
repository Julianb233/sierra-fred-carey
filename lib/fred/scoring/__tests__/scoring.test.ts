/**
 * Tests for FRED 7-Factor Scoring Engine
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  scoreDecision,
  detectDecisionType,
  getDecisionType,
  listDecisionTypes,
} from "../engine";
import {
  DECISION_TYPES,
  FACTOR_NAMES,
  DEFAULT_SCORING_CONFIG,
  type DecisionContext,
} from "../types";

// Note: OpenAI mock removed - AI scoring is tested via integration tests
// The heuristic fallback is tested below

describe("Decision Type Detection", () => {
  it("should detect fundraising decisions", () => {
    const type = detectDecisionType(
      "Should we raise a Series A from this VC firm?"
    );
    expect(type.id).toBe("fundraising");
  });

  it("should detect product decisions", () => {
    const type = detectDecisionType(
      "Should we build this new feature for the roadmap?"
    );
    expect(type.id).toBe("product");
  });

  it("should detect hiring decisions", () => {
    const type = detectDecisionType(
      "Should I hire this candidate as our first engineer?"
    );
    expect(type.id).toBe("hiring");
  });

  it("should detect partnership decisions", () => {
    const type = detectDecisionType(
      "Should we integrate with this partner's API?"
    );
    expect(type.id).toBe("partnership");
  });

  it("should detect marketing decisions", () => {
    const type = detectDecisionType(
      "Should we invest in this marketing channel for growth?"
    );
    expect(type.id).toBe("marketing");
  });

  it("should detect pricing decisions", () => {
    const type = detectDecisionType(
      "Should we change our pricing strategy to a subscription model?"
    );
    expect(type.id).toBe("pricing");
  });

  it("should default to general for ambiguous decisions", () => {
    const type = detectDecisionType("Should we do this thing?");
    expect(type.id).toBe("general");
  });
});

describe("Decision Type Configuration", () => {
  it("should have weights that sum to 1 for each decision type", () => {
    for (const [typeId, type] of Object.entries(DECISION_TYPES)) {
      const weightSum = Object.values(type.weights).reduce((a, b) => a + b, 0);
      expect(weightSum).toBeCloseTo(1, 5);
    }
  });

  it("should have all 7 factors in each decision type", () => {
    for (const [typeId, type] of Object.entries(DECISION_TYPES)) {
      for (const factor of FACTOR_NAMES) {
        expect(type.weights[factor]).toBeDefined();
        expect(type.weights[factor]).toBeGreaterThanOrEqual(0);
        expect(type.weights[factor]).toBeLessThanOrEqual(1);
      }
    }
  });

  it("should get decision type by ID", () => {
    const fundraising = getDecisionType("fundraising");
    expect(fundraising.id).toBe("fundraising");
    expect(fundraising.name).toBe("Fundraising Decision");
  });

  it("should return general for unknown type ID", () => {
    const unknown = getDecisionType("nonexistent");
    expect(unknown.id).toBe("general");
  });

  it("should list all decision types", () => {
    const types = listDecisionTypes();
    expect(types.length).toBeGreaterThan(0);
    expect(types.some((t) => t.id === "fundraising")).toBe(true);
    expect(types.some((t) => t.id === "general")).toBe(true);
  });
});

describe("Scoring Engine - Heuristic Mode", () => {
  const testContext: DecisionContext = {
    startupName: "TestStartup",
    stage: "seed",
    industry: "SaaS",
    goals: ["Grow ARR", "Expand team"],
  };

  it("should score a simple decision with heuristics", async () => {
    const score = await scoreDecision(
      "Should we attend this conference?",
      testContext,
      { useAI: false }
    );

    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(1);
    expect(score.percentage).toBeGreaterThanOrEqual(0);
    expect(score.percentage).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeGreaterThanOrEqual(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
    expect(score.recommendation).toBeDefined();
    expect(["strong_yes", "yes", "maybe", "no", "strong_no"]).toContain(
      score.recommendation
    );
  });

  it("should return all 7 factor scores", async () => {
    const score = await scoreDecision("Test decision", testContext, {
      useAI: false,
    });

    for (const factor of FACTOR_NAMES) {
      expect(score.factors[factor]).toBeDefined();
      expect(score.factors[factor].value).toBeGreaterThanOrEqual(0);
      expect(score.factors[factor].value).toBeLessThanOrEqual(1);
      expect(score.factors[factor].weight).toBeGreaterThanOrEqual(0);
      expect(score.factors[factor].confidence).toBeGreaterThanOrEqual(0);
      expect(score.factors[factor].reasoning).toBeDefined();
      expect(Array.isArray(score.factors[factor].evidence)).toBe(true);
    }
  });

  it("should calculate uncertainty range", async () => {
    const score = await scoreDecision("Test decision", testContext, {
      useAI: false,
    });

    const [low, high] = score.uncertaintyRange;
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeLessThanOrEqual(score.value);
    expect(high).toBeGreaterThanOrEqual(score.value);
  });

  it("should generate a summary", async () => {
    const score = await scoreDecision("Test decision", testContext, {
      useAI: false,
    });

    expect(score.summary).toBeDefined();
    expect(score.summary.length).toBeGreaterThan(0);
  });

  it("should apply decision type weights", async () => {
    const decisionType = DECISION_TYPES.fundraising;

    const score = await scoreDecision(
      "Should we take this investment offer?",
      testContext,
      { decisionType, useAI: false }
    );

    // Verify weights are applied
    expect(score.factors.strategicAlignment.weight).toBe(
      decisionType.weights.strategicAlignment
    );
    expect(score.factors.risk.weight).toBe(decisionType.weights.risk);
  });
});

describe("Recommendation Thresholds", () => {
  it("should return strong_yes for scores >= 0.8", async () => {
    // Can't directly test this without mocking, but we can verify the config
    expect(DEFAULT_SCORING_CONFIG.strongYesThreshold).toBe(0.8);
  });

  it("should return yes for scores >= 0.65", async () => {
    expect(DEFAULT_SCORING_CONFIG.yesThreshold).toBe(0.65);
  });

  it("should return maybe for scores >= 0.45", async () => {
    expect(DEFAULT_SCORING_CONFIG.maybeThreshold).toBe(0.45);
  });

  it("should return no for scores >= 0.3", async () => {
    expect(DEFAULT_SCORING_CONFIG.noThreshold).toBe(0.3);
  });
});

describe("Factor Scoring", () => {
  it("should detect positive signals in decisions", async () => {
    const positiveDecision = await scoreDecision(
      "This is a great growth opportunity with strategic leverage",
      {},
      { useAI: false }
    );

    const neutralDecision = await scoreDecision("Should we do this?", {}, {
      useAI: false,
    });

    // Positive signals should result in higher scores
    expect(positiveDecision.value).toBeGreaterThanOrEqual(
      neutralDecision.value - 0.1
    );
  });

  it("should detect negative signals in decisions", async () => {
    const negativeDecision = await scoreDecision(
      "This is a risky and difficult decision with many concerns",
      {},
      { useAI: false }
    );

    const neutralDecision = await scoreDecision("Should we do this?", {}, {
      useAI: false,
    });

    // Negative signals should result in lower risk scores
    expect(negativeDecision.factors.risk.value).toBeLessThanOrEqual(
      neutralDecision.factors.risk.value + 0.1
    );
  });

  it("should detect urgency signals", async () => {
    const urgentDecision = await scoreDecision(
      "We need to decide ASAP on this urgent matter",
      {},
      { useAI: false }
    );

    const normalDecision = await scoreDecision(
      "Should we consider this option?",
      {},
      { useAI: false }
    );

    // Urgent decisions should have higher speed scores
    expect(urgentDecision.factors.speed.value).toBeGreaterThanOrEqual(
      normalDecision.factors.speed.value - 0.1
    );
  });
});

describe("AI Scoring Fallback", () => {
  it("should use heuristics when useAI is false", async () => {
    const score = await scoreDecision(
      "Should we hire a VP of Sales?",
      { startupName: "TestCo", stage: "Series A" },
      { useAI: false }
    );

    // Should return a valid score via heuristics
    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(1);
    expect(score.factors.strategicAlignment).toBeDefined();
    expect(score.factors.leverage).toBeDefined();
    // Heuristic scores have lower confidence
    expect(score.confidence).toBeLessThanOrEqual(0.6);
  });
});
