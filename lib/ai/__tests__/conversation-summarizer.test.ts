/**
 * Tests for the conversation summarizer's pure normalization (AI-3522).
 *
 * normalizeSummary is the trust boundary between raw model JSON and the rest
 * of the system — it must clamp, coerce and never produce an invalid shape.
 */

import { describe, it, expect } from "vitest";
import { normalizeSummary } from "../conversation-summarizer";

describe("normalizeSummary", () => {
  it("coerces a complete, valid object faithfully", () => {
    const raw = {
      headline: "Founder validating B2B pivot",
      keyThemes: ["pivot", "enterprise"],
      currentFocus: "talking to design partners",
      blockers: ["no warm intros"],
      sentiment: "positive",
      priorityScore: 7,
      engagementSignals: {
        featureInterest: ["pitch deck"],
        painPoints: ["fundraising"],
        valueMoments: ["clarity on ICP"],
      },
      upsell: {
        opportunity: true,
        rationale: "Wants investor tooling",
        triggers: ["pitch deck"],
        confidence: 0.8,
      },
    };
    const s = normalizeSummary(raw, 5);
    expect(s.headline).toBe("Founder validating B2B pivot");
    expect(s.sentiment).toBe("positive");
    expect(s.priorityScore).toBe(7);
    expect(s.upsell.opportunity).toBe(true);
    expect(s.upsell.confidence).toBe(0.8);
    expect(s.sourceEpisodes).toBe(5);
  });

  it("clamps priorityScore into 1..10", () => {
    expect(normalizeSummary({ priorityScore: 99 }, 1).priorityScore).toBe(10);
    expect(normalizeSummary({ priorityScore: -4 }, 1).priorityScore).toBe(1);
    expect(normalizeSummary({ priorityScore: 6.6 }, 1).priorityScore).toBe(7);
  });

  it("clamps upsell.confidence into 0..1", () => {
    expect(normalizeSummary({ upsell: { confidence: 5 } }, 1).upsell.confidence).toBe(1);
    expect(normalizeSummary({ upsell: { confidence: -1 } }, 1).upsell.confidence).toBe(0);
  });

  it("falls back to neutral on an invalid sentiment", () => {
    expect(normalizeSummary({ sentiment: "ecstatic" }, 1).sentiment).toBe("neutral");
  });

  it("defaults arrays/strings when fields are missing or wrong type", () => {
    const s = normalizeSummary({ keyThemes: "not-an-array", blockers: null }, 0);
    expect(s.keyThemes).toEqual([]);
    expect(s.blockers).toEqual([]);
    expect(s.currentFocus).toBe("");
    expect(s.engagementSignals.featureInterest).toEqual([]);
    expect(s.upsell.opportunity).toBe(false);
  });

  it("handles a completely empty/garbage input without throwing", () => {
    const s = normalizeSummary(undefined, 0);
    expect(s.priorityScore).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(s.keyThemes)).toBe(true);
    expect(s.sentiment).toBe("neutral");
  });

  it("caps array lengths to keep payloads bounded", () => {
    const big = Array.from({ length: 50 }, (_, i) => `theme-${i}`);
    const s = normalizeSummary(
      { keyThemes: big, engagementSignals: { featureInterest: big } },
      1
    );
    expect(s.keyThemes.length).toBe(5);
    expect(s.engagementSignals.featureInterest.length).toBe(10);
  });
});
