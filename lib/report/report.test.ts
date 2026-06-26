/**
 * Report generation unit tests (AI-8013)
 *
 * Confirms the founder-report generation feature is wired and functional at the
 * pure-logic layer that doesn't require network/LLM/DB:
 *   - parseReportPayload: robust extraction from Claude output (fences, prose,
 *     truncated fences) + shape validation that protects the DB write path
 *   - renderReportHtml / renderReportText: deterministic rendering used by both
 *     the /reports/[id] page and the Resend email
 *   - TIER_PRICE_CENTS: pricing that drives the recommended-tier upsell
 *
 * These lock in the behavior the live /api/reports/generate route depends on.
 */

import { describe, it, expect } from "vitest";
import { parseReportPayload } from "./prompt";
import { renderReportHtml, renderReportText } from "./renderer";
import { TIER_PRICE_CENTS, type ReportPayload } from "./types";

const SAMPLE: ReportPayload = {
  score: 72,
  verdictHeadline: "Earns the right to scale.",
  verdictSubline: "7 of 9 steps validated. 2 need tightening.",
  executiveSummary:
    "Dana, you nailed the problem and the buyer. Tighten validation before you raise.",
  steps: [
    {
      stepNumber: 1,
      step: "problem",
      name: "Define the Real Problem",
      status: "validated",
      answerSummary: "Ops managers waste 6h/week reconciling invoices.",
      verdict: "Strong. Named in customer language and quantified.",
    },
    {
      stepNumber: 5,
      step: "validation",
      name: "Validate Demand",
      status: "blocking",
      answerSummary: "Said 'people seem interested'.",
      verdict: "Politeness is not validation. Get a paid pilot this week.",
      killboxText: "No demand evidence. This blocks fundraising.",
    },
  ],
  recommendedTier: "validate",
  nextPitch: "Validate tier matches your stage.",
};

function jsonOf(payload: ReportPayload): string {
  return JSON.stringify(payload);
}

describe("parseReportPayload", () => {
  it("parses a complete ```json fenced block", () => {
    const text = "Here you go:\n```json\n" + jsonOf(SAMPLE) + "\n```\nThanks!";
    const parsed = parseReportPayload(text);
    expect(parsed.score).toBe(72);
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.recommendedTier).toBe("validate");
  });

  it("parses a bare ``` fence with no json language tag", () => {
    const text = "```\n" + jsonOf(SAMPLE) + "\n```";
    expect(parseReportPayload(text).verdictHeadline).toBe(SAMPLE.verdictHeadline);
  });

  it("recovers from a truncated/open fence (no closing ```)", () => {
    const text = "```json\n" + jsonOf(SAMPLE);
    expect(parseReportPayload(text).score).toBe(72);
  });

  it("extracts the object when surrounded by stray prose and no fence", () => {
    const text = "Sure thing. " + jsonOf(SAMPLE) + " Hope that helps.";
    expect(parseReportPayload(text).steps[1].status).toBe("blocking");
  });

  it("parses raw JSON with no decoration", () => {
    expect(parseReportPayload(jsonOf(SAMPLE)).executiveSummary).toContain("Dana");
  });

  it("throws (with rawOutput cause) on unparseable output", () => {
    try {
      parseReportPayload("the model rambled and produced no json at all");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const cause = (err as Error & { cause?: { rawOutput?: string } }).cause;
      expect(cause?.rawOutput).toContain("rambled");
    }
  });

  it("throws when required fields are missing", () => {
    const text = JSON.stringify({ score: 50, steps: [] });
    expect(() => parseReportPayload(text)).toThrow(/missing required fields/i);
  });

  it("rejects a non-numeric score", () => {
    const bad = { ...SAMPLE, score: "high" } as unknown;
    expect(() => parseReportPayload(JSON.stringify(bad))).toThrow();
  });
});

describe("renderReportHtml", () => {
  const html = renderReportHtml(SAMPLE, {
    founderName: "Dana",
    companyName: "Reconcile.io",
    stage: "Pre-seed",
    appUrl: "https://joinsahara.com",
    reportId: "rep_123",
    generatedAt: new Date("2026-04-20T00:00:00Z"),
  });

  it("produces a self-contained HTML document", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  it("renders the score, headline and founder name", () => {
    expect(html).toContain("Dana");
    expect(html).toContain("72");
    expect(html).toContain("Earns the right to scale.");
  });

  it("renders a killbox only for blocking/tightening steps", () => {
    expect(html).toContain("This Step Is Blocking");
    expect(html).toContain("No demand evidence");
  });

  it("builds an upgrade CTA for the recommended tier with the report ref", () => {
    expect(html).toContain("/upgrade?plan=validate");
    expect(html).toContain("ref=rep_123");
    expect(html).toContain("$49/mo");
  });

  it("escapes HTML-significant characters in founder content", () => {
    const xss = renderReportHtml(
      { ...SAMPLE, verdictHeadline: "<script>alert(1)</script>" },
      { founderName: "Dana" }
    );
    expect(xss).not.toContain("<script>alert(1)</script>");
    expect(xss).toContain("&lt;script&gt;");
  });
});

describe("renderReportText", () => {
  const text = renderReportText(SAMPLE, { founderName: "Dana" });

  it("includes score, summary and per-step verdicts", () => {
    expect(text).toContain("Score: 72/100");
    expect(text).toContain("EXECUTIVE SUMMARY");
    expect(text).toContain("Step 1: Define the Real Problem");
    expect(text).toContain("Sahara Validate");
  });
});

describe("TIER_PRICE_CENTS", () => {
  it("maps each tier to its price in cents", () => {
    expect(TIER_PRICE_CENTS.clarity).toBe(2900);
    expect(TIER_PRICE_CENTS.validate).toBe(4900);
    expect(TIER_PRICE_CENTS.accelerator).toBe(9900);
  });
});
