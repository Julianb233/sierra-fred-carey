/**
 * FRED Voice Regression Suite — Phase 71-02
 *
 * 25 tests across 5 groups that validate FRED's voice characteristics.
 * These tests assert on prompt content (not LLM output) to ensure
 * FRED's identity, tone, and coaching methodology are preserved.
 *
 * If any test fails, it means someone modified the core prompt in a way
 * that degrades FRED's voice. The change must be reviewed manually.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { FRED_CORE_PROMPT, buildPromptWithSupplements } from "@/lib/ai/prompt-layers";
import type { SupplementalPromptPatch } from "@/lib/ai/prompt-layers";
import { FRED_CAREY_SYSTEM_PROMPT, buildSystemPrompt } from "@/lib/ai/prompts";

// ============================================================================
// Snapshot hash of the core prompt — update ONLY after manual voice review
// ============================================================================
const CORE_PROMPT_SHA256 =
  "ba87812e3c406855ef6e0743f301f4b2962ebf9a1c549223e43d4e103ef14137";

const prompt = FRED_CORE_PROMPT.content;

// ============================================================================
// Group 1: Blunt Truth-Telling (6 tests)
// ============================================================================

describe("FRED Voice Regression: Group 1 — Blunt Truth-Telling", () => {
  it("establishes FRED as direct and disciplined in voice profile", () => {
    expect(prompt).toContain("Calm, direct, disciplined");
  });

  it("instructs FRED to never sugarcoat — no toxic positivity language", () => {
    // The prompt bans specific flattery phrases
    expect(prompt).toContain(
      'NEVER open with or use these phrases'
    );
    expect(prompt).toContain('"Great idea!"');
    expect(prompt).toContain('"Brilliant!"');
    expect(prompt).toContain('"Love it!"');
  });

  it("contains Evidence > Narrative as a non-negotiable principle", () => {
    expect(prompt).toContain("Evidence > Narrative");
    expect(prompt).toContain("Narrative is earned by proof");
  });

  it("does NOT contain toxic positivity instructions", () => {
    const lower = prompt.toLowerCase();
    expect(lower).not.toContain("always be positive");
    expect(lower).not.toContain("stay positive no matter what");
    expect(lower).not.toContain("never say anything negative");
    expect(lower).not.toContain("always encouraging");
  });

  it("instructs FRED to challenge assumptions as default behavior", () => {
    expect(prompt).toContain("challenge their assumptions");
    expect(prompt).toContain("Question assumptions as a default behavior");
  });

  it("trades in truth not comfort", () => {
    expect(prompt).toContain("You trade in truth, not comfort");
  });
});

// ============================================================================
// Group 2: Reframe-Before-Prescribe (5 tests)
// ============================================================================

describe("FRED Voice Regression: Group 2 — Reframe-Before-Prescribe", () => {
  it("contains Reframe before prescribe as principle #1", () => {
    expect(prompt).toContain("Reframe before prescribe");
  });

  it("contains instruction to never answer the surface question", () => {
    expect(prompt).toContain(
      "Never answer the surface question by default"
    );
  });

  it("contains diagnostic questioning methodology", () => {
    expect(prompt).toContain("Identify the underlying objective");
    expect(prompt).toContain("expose assumptions");
    expect(prompt).toContain("reframe to the highest-leverage decision");
  });

  it("contains instruction to understand before advising — 80/20 rule", () => {
    expect(prompt).toContain(
      "give 80% substance"
    );
    expect(prompt).toContain("20% questions");
  });

  it("requires structured answers not just more questions", () => {
    expect(prompt).toContain(
      "Never respond with ONLY questions and no substance"
    );
    expect(prompt).toContain(
      "give a provisional answer AND ask for details"
    );
  });
});

// ============================================================================
// Group 3: Mentor Tone (6 tests)
// ============================================================================

describe("FRED Voice Regression: Group 3 — Mentor Tone", () => {
  it("establishes FRED as a MENTOR and decision partner", () => {
    expect(prompt).toContain("You are a MENTOR and decision partner");
  });

  it("contains Encourage without flattery principle", () => {
    expect(prompt).toContain("Encourage without flattery");
  });

  it("contains care-enough-to-be-honest sentiment — steady not performative", () => {
    expect(prompt).toContain("Be steady and supportive, not performative");
  });

  it("does NOT contain sycophantic instructions", () => {
    const lower = prompt.toLowerCase();
    expect(lower).not.toContain("always agree");
    expect(lower).not.toContain("never disagree");
    expect(lower).not.toContain("make the user feel good");
    expect(lower).not.toContain("always validate");
  });

  it("contains experience-based credibility — years and companies", () => {
    expect(prompt).toContain("years of experience");
    expect(prompt).toContain("companies");
    // FRED's track record should mention IPOs and exits
    expect(prompt).toContain("IPOs");
    expect(prompt).toContain("Key Exits");
  });

  it("positions FRED as mentor whose reputation depends on outcome", () => {
    expect(prompt).toContain(
      "Speak like a mentor whose reputation depends on the outcome"
    );
  });
});

// ============================================================================
// Group 4: Coaching Boundaries (5 tests)
// ============================================================================

describe("FRED Voice Regression: Group 4 — Coaching Boundaries", () => {
  it("contains capital-as-tool principle — no default fundraising", () => {
    expect(prompt).toContain("Do not encourage fundraising by default");
    expect(prompt).toContain("Capital is a tool, not the goal");
  });

  it("contains decision sequencing — never optimize downstream before upstream", () => {
    expect(prompt).toContain("Never optimize downstream artifacts");
    expect(prompt).toContain("upstream truth is established");
  });

  it("contains startup process step awareness — 9-Step Process", () => {
    expect(prompt).toContain("9-Step Startup Process");
    expect(prompt).toContain("Define the Real Problem");
    expect(prompt).toContain("Decide What Earns the Right to Scale");
  });

  it("contains tier-appropriate coaching depth — no upselling promises", () => {
    expect(prompt).toContain("Do not upsell prematurely");
    expect(prompt).toContain(
      "Paid features are framed as higher leverage, not better truth"
    );
  });

  it("contains wellbeing and red-flag detection references", () => {
    expect(prompt).toContain("Founder wellbeing");
    expect(prompt).toContain("burnout");
    expect(prompt).toContain("imposter syndrome");
    expect(prompt).toContain("encourage professional support");
  });
});

// ============================================================================
// Group 5: Immutability Verification (5 tests)
// ============================================================================

describe("FRED Voice Regression: Group 5 — Immutability Verification", () => {
  it("FRED_CORE_PROMPT.frozen is true", () => {
    expect(FRED_CORE_PROMPT.frozen).toBe(true);
  });

  it("FRED_CORE_PROMPT.version matches expected version", () => {
    expect(FRED_CORE_PROMPT.version).toBe("1.1.0");
  });

  it("Object.isFrozen(FRED_CORE_PROMPT) returns true", () => {
    expect(Object.isFrozen(FRED_CORE_PROMPT)).toBe(true);
  });

  it("core prompt SHA-256 matches snapshot — any change forces manual review", () => {
    const hash = createHash("sha256")
      .update(FRED_CORE_PROMPT.content)
      .digest("hex");
    expect(hash).toBe(CORE_PROMPT_SHA256);
  });

  it("FRED_CAREY_SYSTEM_PROMPT alias is identical to FRED_CORE_PROMPT.content", () => {
    expect(FRED_CAREY_SYSTEM_PROMPT).toBe(FRED_CORE_PROMPT.content);
  });
});

// ============================================================================
// Group 6: Supplemental Layer Assembly (3 bonus tests)
// ============================================================================

describe("FRED Voice Regression: Group 6 — Supplemental Layer Assembly", () => {
  it("buildSystemPrompt still works identically to before", () => {
    const result = buildSystemPrompt("");
    expect(result).not.toContain("{{FOUNDER_CONTEXT}}");
    expect(result).toContain("Reframe before prescribe");
  });

  it("buildPromptWithSupplements appends active patches after core", () => {
    const patches: SupplementalPromptPatch[] = [
      {
        id: "test-1",
        content: "Always mention market validation before fundraising advice.",
        source: "manual",
        active: true,
        createdAt: "2026-03-06",
      },
      {
        id: "test-2",
        content: "This patch is inactive and should not appear.",
        source: "manual",
        active: false,
        createdAt: "2026-03-06",
      },
    ];
    const result = buildPromptWithSupplements("", patches);
    expect(result).toContain("SUPPLEMENTAL GUIDANCE");
    expect(result).toContain(
      "Always mention market validation before fundraising advice."
    );
    expect(result).not.toContain("This patch is inactive");
  });

  it("buildPromptWithSupplements with no patches produces no supplemental section", () => {
    const result = buildPromptWithSupplements("", []);
    expect(result).not.toContain("SUPPLEMENTAL GUIDANCE");
    // Core content is still there
    expect(result).toContain("Reframe before prescribe");
  });
});
