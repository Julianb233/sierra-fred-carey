/**
 * Regression test for AI-5143 — "Talk to Fred" invalid/blank response loop.
 *
 * When the LLM streams only whitespace (e.g. it emits tool calls and no usable
 * text), `generateWithLLM` must collapse that to "" via `.trim()` so the caller
 * falls back to a real template response instead of surfacing a blank/invalid
 * FRED bubble — the failure mode that made founders re-send and loop.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM client BEFORE importing the actor under test.
const generateMock = vi.fn();
const streamGenerateMock = vi.fn();

vi.mock("@/lib/ai/fred-client", () => ({
  generate: (...args: unknown[]) => generateMock(...args),
  streamGenerate: (...args: unknown[]) => streamGenerateMock(...args),
}));

import { decideActor } from "../actors/decide";
import type { SynthesisResult, ValidatedInput } from "../types";

function makeSynthesis(): SynthesisResult {
  return {
    recommendation: "Focus on talking to ten target customers this week.",
    confidence: 0.9,
    reasoning: "High-confidence question with clear next action.",
    factors: {
      strategicAlignment: 0.8,
      leverage: 0.7,
      speed: 0.7,
      revenue: 0.6,
      time: 0.7,
      risk: 0.7,
      relationships: 0.6,
      composite: 75,
    },
    alternatives: [],
    assumptions: [],
    risks: [],
    nextSteps: [],
    followUpQuestions: [],
  };
}

function makeInput(): ValidatedInput {
  return {
    originalMessage: "How do I validate my idea?",
    intent: "question",
    entities: [],
    confidence: 0.9, // >= 0.8 so action resolves to auto_execute (LLM path)
    clarificationNeeded: [],
    keywords: ["validate", "idea"],
    sentiment: "neutral",
    urgency: "low",
  };
}

describe("AI-5143: FRED never returns a blank/whitespace response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to a real response when the buffered LLM returns whitespace", async () => {
    generateMock.mockResolvedValue({
      text: "   \n  \t ",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: "stop",
      modelId: "test",
    });

    const result = await decideActor(makeSynthesis(), makeInput(), null, null, null, null);

    expect(result.content).toBeTruthy();
    expect(result.content.trim().length).toBeGreaterThan(0);
  });

  it("falls back to a real response when the streamed LLM yields only whitespace", async () => {
    streamGenerateMock.mockResolvedValue({
      textStream: (async function* () {
        yield "  ";
        yield "\n";
        yield "  ";
      })(),
    });

    const emitted: string[] = [];
    const tokenChannel = { emit: (chunk: string) => emitted.push(chunk) };

    const result = await decideActor(makeSynthesis(), makeInput(), null, null, null, tokenChannel);

    expect(result.content).toBeTruthy();
    expect(result.content.trim().length).toBeGreaterThan(0);
  });

  it("returns the LLM response unchanged when it has real content", async () => {
    generateMock.mockResolvedValue({
      text: "Talk to 10 customers and watch what they actually do, not what they say.",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: "stop",
      modelId: "test",
    });

    const result = await decideActor(makeSynthesis(), makeInput(), null, null, null, null);

    expect(result.content).toContain("Talk to 10 customers");
  });
});
