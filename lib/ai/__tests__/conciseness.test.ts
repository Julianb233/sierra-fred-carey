import { describe, it, expect } from "vitest";
import { FRED_CORE_PROMPT } from "@/lib/ai/prompt-layers";
import { COACHING_PROMPTS, buildSystemPrompt } from "@/lib/ai/prompts";
import { buildFredVoicePreamble } from "@/lib/fred/voice";
import { FRED_AGENT_VOICE } from "@/lib/agents/fred-agent-voice";

describe("FRED Conciseness & Baby-Stepping", () => {
  it("core prompt contains CONCISENESS PROTOCOL", () => {
    expect(FRED_CORE_PROMPT.content).toContain("CONCISENESS PROTOCOL");
    expect(FRED_CORE_PROMPT.content).toContain("2-3 sentences maximum");
    expect(FRED_CORE_PROMPT.content).toContain("non-negotiable");
  });

  it("core prompt contains BABY-STEP COACHING", () => {
    expect(FRED_CORE_PROMPT.content).toContain("BABY-STEP COACHING");
    expect(FRED_CORE_PROMPT.content).toContain("1-week micro-steps");
    expect(FRED_CORE_PROMPT.content).toContain(
      "Maximum time horizon for any single action item: 7 days"
    );
  });

  it("all COACHING_PROMPTS include conciseness reminder", () => {
    const topics = Object.keys(COACHING_PROMPTS) as (keyof typeof COACHING_PROMPTS)[];
    expect(topics.length).toBeGreaterThan(0);

    for (const topic of topics) {
      expect(COACHING_PROMPTS[topic]).toContain(
        "Keep initial responses to 2-3 sentences"
      );
    }
  });

  it("buildSystemPrompt output includes conciseness and baby-step sections", () => {
    const output = buildSystemPrompt("");
    expect(output).toContain("CONCISENESS PROTOCOL");
    expect(output).toContain("BABY-STEP COACHING");
  });

  it("voice preamble includes conciseness and baby-step rules", () => {
    const preamble = buildFredVoicePreamble();
    expect(preamble).toContain("1-2 sentences");
    expect(preamble).toContain("This week, focus on");
  });

  it("FRED_AGENT_VOICE includes conciseness and baby-step rules", () => {
    expect(FRED_AGENT_VOICE).toContain("2-3 sentences");
    expect(FRED_AGENT_VOICE).toContain("1-week");
  });

  it("core prompt explicitly bans multi-month anti-patterns", () => {
    // The prompt references these phrases as NEGATIVE EXAMPLES (things FRED must never say).
    // Verify the anti-pattern instructions are present as guardrails.
    expect(FRED_CORE_PROMPT.content).toContain(
      'Never say "over the next 3 months"'
    );
    expect(FRED_CORE_PROMPT.content).toContain(
      "Giving 10+ action items in a single response"
    );
    // Verify no multi-phase roadmap patterns exist outside the anti-pattern section
    expect(FRED_CORE_PROMPT.content).not.toMatch(
      /(?<!Anti-patterns.*)\bPhase 1:.*Phase 2:.*Phase 3:/s
    );
  });
});
