import { describe, it, expect } from "vitest";
import {
  platformOf,
  blendedCostOf,
  buildBreakdown,
  PROVIDER_BLENDED_RATE,
  DEFAULT_BLENDED_RATE,
  type RawProviderRow,
} from "../cost-monitor";

describe("platformOf", () => {
  it("maps Claude / Anthropic names to Claude", () => {
    expect(platformOf("Claude Sonnet 4.5")).toBe("Claude");
    expect(platformOf("anthropic/claude")).toBe("Claude");
  });
  it("maps Gemini / Google names to Gemini", () => {
    expect(platformOf("Gemini 3 Flash Preview")).toBe("Gemini");
    expect(platformOf("google-gemini")).toBe("Gemini");
  });
  it("maps OpenAI names to OpenAI", () => {
    expect(platformOf("gpt-4o")).toBe("OpenAI");
    expect(platformOf("text-embedding-3-small")).toBe("OpenAI");
  });
  it("maps mixed Claude+Gemini names to Mixed", () => {
    expect(platformOf("Claude Sonnet 4.5 / Gemini 3 Flash")).toBe("Mixed");
  });
  it("falls back to Other for unknown / empty", () => {
    expect(platformOf("llama-3")).toBe("Other");
    expect(platformOf("")).toBe("Other");
  });
});

describe("blendedCostOf", () => {
  it("uses the provider-specific blended rate when known", () => {
    const rate = PROVIDER_BLENDED_RATE["Claude Sonnet 4.5"];
    expect(rate).toBeGreaterThan(0);
    expect(blendedCostOf("Claude Sonnet 4.5", 1_000_000)).toBeCloseTo(
      rate * 1_000_000,
      9
    );
  });
  it("uses the default rate for unknown providers", () => {
    expect(blendedCostOf("mystery-model", 1_000_000)).toBeCloseTo(
      DEFAULT_BLENDED_RATE * 1_000_000,
      9
    );
  });
  it("handles zero/falsy tokens", () => {
    expect(blendedCostOf("Claude Sonnet 4.5", 0)).toBe(0);
  });
});

describe("buildBreakdown", () => {
  const at = "2026-06-30T00:00:00.000Z";

  it("uses approximate basis and blended cost when no persisted cost exists", () => {
    const rows: RawProviderRow[] = [
      { provider: "Claude Sonnet 4.5", requests: 2, total_tokens: 1_000_000 },
      { provider: "Gemini 3 Flash Preview", requests: 8, total_tokens: 2_000_000 },
    ];
    const out = buildBreakdown(rows, [], 30, at);
    expect(out.costBasis).toBe("approximate");
    expect(out.totalRequests).toBe(10);
    expect(out.totalTokens).toBe(3_000_000);

    const claude = out.byPlatform.find((p) => p.platform === "Claude")!;
    const gemini = out.byPlatform.find((p) => p.platform === "Gemini")!;
    expect(claude.cost).toBeCloseTo(blendedCostOf("Claude Sonnet 4.5", 1_000_000), 9);
    expect(gemini.cost).toBeCloseTo(
      blendedCostOf("Gemini 3 Flash Preview", 2_000_000),
      9
    );
    // shares sum to ~1
    const sumShare = out.byPlatform.reduce((a, p) => a + p.share, 0);
    expect(sumShare).toBeCloseTo(1, 6);
  });

  it("uses persisted cost when any row carries priced rows", () => {
    const rows: RawProviderRow[] = [
      {
        provider: "Claude Sonnet 4.5",
        requests: 1,
        total_tokens: 500_000,
        stored_cost: 4.2,
        priced_rows: 1,
      },
      {
        provider: "Gemini 3 Flash Preview",
        requests: 1,
        total_tokens: 500_000,
        stored_cost: 0.8,
        priced_rows: 1,
      },
    ];
    const out = buildBreakdown(rows, [], 7, at);
    expect(out.costBasis).toBe("persisted");
    expect(out.totalCost).toBeCloseTo(5.0, 6);
    const claude = out.byPlatform.find((p) => p.platform === "Claude")!;
    expect(claude.cost).toBeCloseTo(4.2, 6);
    expect(claude.share).toBeCloseTo(0.84, 6);
  });

  it("sorts platforms and providers by descending cost", () => {
    const rows: RawProviderRow[] = [
      { provider: "Gemini 3 Flash Preview", requests: 1, total_tokens: 100 },
      { provider: "Claude Sonnet 4.5", requests: 1, total_tokens: 10_000_000 },
    ];
    const out = buildBreakdown(rows, [], 30, at);
    expect(out.byPlatform[0].platform).toBe("Claude");
    expect(out.byProvider[0].provider).toBe("Claude Sonnet 4.5");
  });

  it("handles an empty window without dividing by zero", () => {
    const out = buildBreakdown([], [], 30, at, true);
    expect(out.totalCost).toBe(0);
    expect(out.totalRequests).toBe(0);
    expect(out.byPlatform).toEqual([]);
    expect(out.telemetrySchemaMissing).toBe(true);
    expect(out.costBasis).toBe("approximate");
  });

  it("passes through analyzers and stamps generatedAt", () => {
    const out = buildBreakdown(
      [],
      [{ analyzer: "investor-score", model: "Gemini 3 Flash Preview", requests: 5 }],
      14,
      at
    );
    expect(out.windowDays).toBe(14);
    expect(out.generatedAt).toBe(at);
    expect(out.topAnalyzers[0].analyzer).toBe("investor-score");
  });
});
