/**
 * Tests for the upsell engine (AI-3522).
 */

import { describe, it, expect } from "vitest";
import { UserTier } from "@/lib/constants";
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

describe("evaluateUpsell — no opportunity", () => {
  it("does not recommend when there is no paid-tier interest", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary(),
    });
    expect(rec.recommend).toBe(false);
    expect(rec.targetTier).toBeNull();
    expect(rec.urgency).toBe("none");
    expect(rec.ctaUrl).toBeNull();
  });

  it("never upsells a Studio (top-tier) user", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.STUDIO,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["pitch deck", "investor outreach"],
          painPoints: [],
          valueMoments: [],
        },
        upsell: { opportunity: true, rationale: "wants more", triggers: [], confidence: 0.9 },
      }),
    });
    expect(rec.recommend).toBe(false);
    expect(rec.targetTier).toBeNull();
    expect(rec.reasons[0]).toMatch(/top tier/i);
  });
});

describe("evaluateUpsell — feature-interest -> tier mapping", () => {
  it("maps pitch-deck interest from FREE straight to PRO (skips Builder)", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["Can you do a pitch deck teardown?"],
          painPoints: [],
          valueMoments: [],
        },
      }),
    });
    expect(rec.recommend).toBe(true);
    expect(rec.targetTier).toBe(UserTier.PRO);
    expect(rec.targetTierName).toBe("Pro");
    expect(rec.matchedInterests.length).toBeGreaterThan(0);
    expect(rec.pitchFeatures.length).toBeGreaterThan(0);
    expect(rec.ctaUrl).toBeTruthy();
  });

  it("maps memory/strategy interest from FREE to BUILDER", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["I wish you could remember my strategy"],
          painPoints: [],
          valueMoments: [],
        },
      }),
    });
    expect(rec.targetTier).toBe(UserTier.BUILDER);
  });

  it("maps automation/accountability interest to STUDIO", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.PRO,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["I want weekly check-ins and an ops agent to automate outreach"],
          painPoints: [],
          valueMoments: [],
        },
      }),
    });
    expect(rec.targetTier).toBe(UserTier.STUDIO);
  });

  it("picks the HIGHEST matched tier when multiple interests present", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["save my profile", "investor readiness", "boardy matching"],
          painPoints: [],
          valueMoments: [],
        },
      }),
    });
    expect(rec.targetTier).toBe(UserTier.STUDIO);
  });

  it("does not recommend a tier at or below the user's current tier", () => {
    // PRO user only expresses Builder-level interest -> no upsell
    const rec = evaluateUpsell({
      currentTier: UserTier.PRO,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["save my profile", "lean plan"],
          painPoints: [],
          valueMoments: [],
        },
      }),
    });
    expect(rec.recommend).toBe(false);
    expect(rec.targetTier).toBeNull();
  });
});

describe("evaluateUpsell — AI opportunity fallback", () => {
  it("falls back to the next tier when AI flags opportunity but no gated feature surfaced", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        upsell: {
          opportunity: true,
          rationale: "Founder is highly engaged and hitting free limits.",
          triggers: [],
          confidence: 0.8,
        },
      }),
    });
    expect(rec.targetTier).toBe(UserTier.BUILDER);
    expect(rec.recommend).toBe(true);
    expect(rec.reasons.join(" ")).toMatch(/highly engaged/i);
  });
});

describe("evaluateUpsell — urgency + sentiment guardrails", () => {
  it("escalates to high urgency on strong signal + high credit usage", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        priorityScore: 9,
        engagementSignals: {
          featureInterest: ["pitch deck", "investor readiness", "executive summary"],
          painPoints: [],
          valueMoments: [],
        },
        upsell: { opportunity: true, rationale: "ready to pay", triggers: [], confidence: 0.9 },
      }),
      usageRatio: 0.95,
    });
    expect(rec.urgency).toBe("high");
    expect(rec.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("caps urgency at medium for a frustrated/at-risk founder", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        sentiment: "at_risk",
        priorityScore: 10,
        engagementSignals: {
          featureInterest: ["pitch deck", "investor readiness", "executive summary"],
          painPoints: ["nothing is working"],
          valueMoments: [],
        },
        upsell: { opportunity: true, rationale: "needs help", triggers: [], confidence: 0.95 },
      }),
      usageRatio: 0.95,
    });
    expect(rec.urgency).toBe("medium");
    expect(rec.reasons.join(" ")).toMatch(/at_risk/);
  });

  it("includes a credit-ceiling reason when usage is high", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["investor lens"],
          painPoints: [],
          valueMoments: [],
        },
      }),
      usageRatio: 0.85,
    });
    expect(rec.reasons.some((r) => /credits/i.test(r))).toBe(true);
  });

  it("clamps an out-of-range usageRatio without crashing", () => {
    const rec = evaluateUpsell({
      currentTier: UserTier.FREE,
      summary: makeSummary({
        engagementSignals: {
          featureInterest: ["pitch deck"],
          painPoints: [],
          valueMoments: [],
        },
      }),
      usageRatio: 5, // nonsense, should clamp to 1
    });
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
  });
});
