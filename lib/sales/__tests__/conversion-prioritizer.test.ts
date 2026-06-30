/**
 * Tests for the conversion prioritizer (AI-3526).
 *
 * Verifies the gated free-Discovery -> paid readiness scoring + stage
 * classification and the queue builder.
 */

import { describe, it, expect } from "vitest";
import { UserTier } from "@/lib/constants";
import {
  scoreConversionReadiness,
  buildConversionQueue,
  CONVERSION_PRIORITY_THRESHOLD,
  type ConversionReadiness,
} from "../conversion-prioritizer";
import { evaluateUpsell } from "../upsell-engine";
import type { ConversationSummary } from "@/lib/ai/conversation-summarizer";

function makeSummary(
  overrides: Partial<ConversationSummary> = {}
): ConversationSummary {
  return {
    headline: "Founder working on early validation",
    keyThemes: ["validation"],
    currentFocus: "talking to customers",
    blockers: [],
    sentiment: "neutral",
    priorityScore: 5,
    engagementSignals: {
      featureInterest: [],
      painPoints: [],
      valueMoments: [],
    },
    upsell: { opportunity: false, rationale: "", triggers: [], confidence: 0 },
    sourceEpisodes: 5,
    ...overrides,
  };
}

describe("scoreConversionReadiness — Discovery (cold)", () => {
  it("classifies a quiet free explorer as discovery and does not prioritize", () => {
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      summary: makeSummary(),
    });
    expect(r.stage).toBe("discovery");
    expect(r.isDiscovery).toBe(true);
    expect(r.prioritize).toBe(false);
    expect(r.score).toBeLessThan(CONVERSION_PRIORITY_THRESHOLD);
    expect(r.ctaUrl).toBeNull();
    expect(r.targetTier).toBe(UserTier.BUILDER);
  });
});

describe("scoreConversionReadiness — activated (value, no paid pull)", () => {
  it("marks value-delivered free founders activated, not ready", () => {
    const summary = makeSummary({
      sentiment: "positive",
      engagementSignals: {
        featureInterest: [],
        painPoints: [],
        valueMoments: [
          "Got clarity on pricing",
          "Reality lens caught a fatal flaw",
          "Decided to pivot ICP",
        ],
      },
    });
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      summary,
    });
    expect(r.stage).toBe("activated");
    expect(r.prioritize).toBe(false);
    expect(r.signals.join(" ")).toMatch(/delivered value/i);
  });
});

describe("scoreConversionReadiness — evaluating (paid pull, weak overall)", () => {
  it("marks a free founder with mild paid interest as evaluating", () => {
    const summary = makeSummary({
      sentiment: "neutral",
      priorityScore: 3,
      engagementSignals: {
        featureInterest: ["pitch deck"],
        painPoints: [],
        valueMoments: [],
      },
    });
    const upsell = evaluateUpsell({ currentTier: UserTier.FREE, summary });
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      summary,
      upsell,
    });
    expect(r.stage).toBe("evaluating");
    expect(r.targetTier).toBe(UserTier.PRO);
  });
});

describe("scoreConversionReadiness — ready (hot free -> paid)", () => {
  it("flags a high-value, high-interest free founder as ready + prioritized", () => {
    const summary = makeSummary({
      sentiment: "positive",
      priorityScore: 9,
      engagementSignals: {
        featureInterest: ["investor readiness", "pitch deck teardown", "valuation"],
        painPoints: ["not sure we're investor ready"],
        valueMoments: [
          "Loved the reality lens",
          "Used the decision engine daily",
          "Said it replaced a coach",
        ],
      },
      upsell: {
        opportunity: true,
        rationale: "Clear pull toward investor tooling",
        triggers: ["investor readiness", "pitch deck"],
        confidence: 0.9,
      },
    });
    const upsell = evaluateUpsell({ currentTier: UserTier.FREE, summary });
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      summary,
      upsell,
      usageRatio: 0.85,
    });
    expect(r.stage).toBe("ready");
    expect(r.prioritize).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(CONVERSION_PRIORITY_THRESHOLD);
    expect(r.ctaUrl).not.toBeNull();
    expect(r.recommendedAction).toMatch(/upgrade cta/i);
  });
});

describe("scoreConversionReadiness — paid + top tier", () => {
  it("treats a paid (Builder) founder as converted, never a new conversion", () => {
    const summary = makeSummary({
      engagementSignals: {
        featureInterest: ["investor readiness"],
        painPoints: [],
        valueMoments: ["great"],
      },
    });
    const upsell = evaluateUpsell({ currentTier: UserTier.BUILDER, summary });
    const r = scoreConversionReadiness({
      currentTier: UserTier.BUILDER,
      summary,
      upsell,
    });
    expect(r.stage).toBe("converted");
    expect(r.isDiscovery).toBe(false);
    expect(r.prioritize).toBe(false);
    expect(r.targetTier).toBe(UserTier.PRO);
  });

  it("zeroes out conversion framing for a top-tier (Studio) founder", () => {
    const r = scoreConversionReadiness({
      currentTier: UserTier.STUDIO,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["outreach"],
          painPoints: [],
          valueMoments: ["loved it"],
        },
      }),
    });
    expect(r.stage).toBe("converted");
    expect(r.targetTier).toBeNull();
    expect(r.targetTierName).toBeNull();
    expect(r.prioritize).toBe(false);
    expect(r.ctaUrl).toBeNull();
    expect(r.recommendedAction).toMatch(/retention/i);
  });
});

describe("scoreConversionReadiness — robustness", () => {
  it("never throws and clamps the score to 0-100 on degenerate input", () => {
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      // @ts-expect-error intentionally partial / malformed
      summary: { sentiment: "frustrated", priorityScore: 99 },
      usageRatio: 5,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.isDiscovery).toBe(true);
  });

  it("works with a summary alone (no upsell rec passed)", () => {
    const summary = makeSummary({
      engagementSignals: {
        featureInterest: ["pitch deck", "investor"],
        painPoints: [],
        valueMoments: ["clarity"],
      },
    });
    const r = scoreConversionReadiness({
      currentTier: UserTier.FREE,
      summary,
    });
    // Falls back to feature-interest count; still a free Discovery founder.
    expect(["evaluating", "ready"]).toContain(r.stage);
    expect(r.isDiscovery).toBe(true);
  });
});

describe("buildConversionQueue", () => {
  function readiness(
    over: Partial<ConversionReadiness>
  ): ConversionReadiness {
    return {
      score: 50,
      stage: "evaluating",
      currentTier: UserTier.FREE,
      currentTierName: "Free",
      targetTier: UserTier.BUILDER,
      targetTierName: "Builder",
      isDiscovery: true,
      prioritize: false,
      signals: [],
      recommendedAction: "",
      ctaUrl: null,
      ...over,
    };
  }

  it("ranks discovery founders by score and excludes converted/paid", () => {
    const queue = buildConversionQueue([
      { userId: "cold", readiness: readiness({ score: 20, stage: "discovery" }) },
      { userId: "hot", readiness: readiness({ score: 88, stage: "ready" }) },
      { userId: "warm", readiness: readiness({ score: 55, stage: "evaluating" }) },
      {
        userId: "paid",
        readiness: readiness({
          score: 95,
          stage: "converted",
          isDiscovery: false,
          currentTier: UserTier.PRO,
        }),
      },
    ]);
    expect(queue.map((q) => q.userId)).toEqual(["hot", "warm", "cold"]);
    expect(queue.find((q) => q.userId === "paid")).toBeUndefined();
  });

  it("respects the limit", () => {
    const founders = Array.from({ length: 10 }, (_, i) => ({
      userId: `u${i}`,
      readiness: readiness({ score: i * 5, stage: "discovery" }),
    }));
    expect(buildConversionQueue(founders, 3)).toHaveLength(3);
  });
});
