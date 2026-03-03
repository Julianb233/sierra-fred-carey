/**
 * Investor Firm Matcher Tests
 *
 * Tests the matching logic that pairs founders with investor firms
 * from the curated knowledge base.
 *
 * Linear: AI-1285
 */

import { describe, it, expect } from "vitest";
import { matchFirms, findSimilarFirms } from "../firm-matcher";
import { INVESTOR_FIRMS, getFirmById, getFirmsByRound, getFirmsBySector } from "../knowledge-base";

// ============================================================================
// Knowledge Base Tests
// ============================================================================

describe("knowledge-base", () => {
  it("contains at least 20 firms", () => {
    expect(INVESTOR_FIRMS.length).toBeGreaterThanOrEqual(20);
  });

  it("every firm has required fields populated", () => {
    for (const firm of INVESTOR_FIRMS) {
      expect(firm.id).toBeTruthy();
      expect(firm.name).toBeTruthy();
      expect(firm.type).toBeTruthy();
      expect(firm.roundFocus.length).toBeGreaterThan(0);
      expect(firm.thesis).toBeTruthy();
      expect(firm.whatTheyLookFor.length).toBeGreaterThan(0);
      expect(firm.portfolioExamples.length).toBeGreaterThan(0);
      expect(firm.fredNote).toBeTruthy();
      expect(firm.checkSize.min).toBeGreaterThanOrEqual(0);
      expect(firm.checkSize.max).toBeGreaterThan(0);
    }
  });

  it("getFirmById returns correct firm", () => {
    const yc = getFirmById("y-combinator");
    expect(yc).toBeDefined();
    expect(yc!.name).toBe("Y Combinator");
  });

  it("getFirmById returns undefined for unknown id", () => {
    expect(getFirmById("nonexistent-firm")).toBeUndefined();
  });

  it("getFirmsByRound returns firms for seed stage", () => {
    const seedFirms = getFirmsByRound("seed");
    expect(seedFirms.length).toBeGreaterThan(5);
    for (const firm of seedFirms) {
      expect(firm.roundFocus).toContain("seed");
    }
  });

  it("getFirmsBySector matches AI firms", () => {
    const aiFirms = getFirmsBySector("AI");
    expect(aiFirms.length).toBeGreaterThan(0);
    // Should include a16z which has AI in sector focus
    expect(aiFirms.some((f) => f.id === "a16z")).toBe(true);
  });

  it("getFirmsBySector includes generalist firms", () => {
    const niche = getFirmsBySector("quantum computing");
    // Generalist firms (empty sectorFocus) should be included
    const generalists = niche.filter((f) => f.sectorFocus.length === 0);
    expect(generalists.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Matching Tests
// ============================================================================

describe("matchFirms", () => {
  it("returns matches for pre-seed stage", () => {
    const results = matchFirms({ stage: "pre-seed" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
    // Top results should include accelerators which invest at pre-seed
    const topFirmIds = results.slice(0, 5).map((r) => r.firm.id);
    const hasAccelerator = results.slice(0, 5).some((r) => r.firm.type === "accelerator");
    expect(hasAccelerator).toBe(true);
  });

  it("returns matches for seed-stage SaaS company", () => {
    const results = matchFirms({ stage: "seed", sector: "SaaS" });
    expect(results.length).toBeGreaterThan(0);
    // Scores should be sorted descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("filters by preferred type", () => {
    const results = matchFirms({
      stage: "seed",
      preferredType: "accelerator",
    });
    expect(results.length).toBeGreaterThan(0);
    // All should be accelerators
    for (const r of results) {
      expect(r.firm.type).toBe("accelerator");
    }
  });

  it("respects limit parameter", () => {
    const results = matchFirms({ stage: "seed", limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("scores series-a stage with AI sector higher for a16z", () => {
    const results = matchFirms({ stage: "series-a", sector: "AI" });
    const a16zMatch = results.find((r) => r.firm.id === "a16z");
    expect(a16zMatch).toBeDefined();
    expect(a16zMatch!.stageScore).toBe(100);
    expect(a16zMatch!.sectorScore).toBeGreaterThan(50);
  });

  it("handles unknown stage gracefully by defaulting to seed", () => {
    const results = matchFirms({ stage: "early" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("considers raise amount in scoring", () => {
    const results = matchFirms({
      stage: "seed",
      raiseAmount: 500_000,
    });
    expect(results.length).toBeGreaterThan(0);
    // Each match should have a sizeScore
    for (const r of results) {
      expect(r.sizeScore).toBeGreaterThanOrEqual(0);
      expect(r.sizeScore).toBeLessThanOrEqual(100);
    }
  });

  it("generates match reasons", () => {
    const results = matchFirms({ stage: "seed", sector: "fintech" });
    for (const r of results) {
      expect(r.matchReason).toBeTruthy();
      expect(typeof r.matchReason).toBe("string");
    }
  });

  it("growth-equity firms score higher for series-b", () => {
    const results = matchFirms({ stage: "series-b", sector: "enterprise SaaS" });
    const insightMatch = results.find((r) => r.firm.id === "insight-partners");
    expect(insightMatch).toBeDefined();
    expect(insightMatch!.stageScore).toBe(100);
  });
});

// ============================================================================
// Similar Firms Tests
// ============================================================================

describe("findSimilarFirms", () => {
  it("finds firms similar to Y Combinator", () => {
    const similar = findSimilarFirms("y-combinator");
    expect(similar.length).toBeGreaterThan(0);
    // Should include other accelerators
    const hasAccelerator = similar.some((m) => m.firm.type === "accelerator");
    expect(hasAccelerator).toBe(true);
  });

  it("does not include the reference firm in results", () => {
    const similar = findSimilarFirms("a16z");
    const ids = similar.map((m) => m.firm.id);
    expect(ids).not.toContain("a16z");
  });

  it("returns empty for unknown firm", () => {
    const similar = findSimilarFirms("nonexistent");
    expect(similar).toEqual([]);
  });

  it("respects limit parameter", () => {
    const similar = findSimilarFirms("sequoia", 3);
    expect(similar.length).toBeLessThanOrEqual(3);
  });

  it("scores are sorted descending", () => {
    const similar = findSimilarFirms("benchmark");
    for (let i = 1; i < similar.length; i++) {
      expect(similar[i - 1].score).toBeGreaterThanOrEqual(similar[i].score);
    }
  });
});
