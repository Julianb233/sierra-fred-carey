/**
 * Positioning Readiness Framework
 * Diagnostic scoring for market clarity (A-F grades)
 *
 * This framework evaluates buyer clarity, not capital readiness.
 * It mirrors the seriousness of Investor Readiness Score.
 */

export type PositioningGrade = "A" | "B" | "C" | "D" | "F";

export interface CategoryScore {
  category: PositioningCategory;
  grade: PositioningGrade;
  weight: number;
  score: number; // 0-100
  diagnosticAnswers: string[];
  gaps: string[];
  strengths: string[];
}

export type PositioningCategory =
  | "clarity"
  | "differentiation"
  | "market-understanding"
  | "narrative-strength";

export interface PositioningAssessment {
  overallGrade: PositioningGrade;
  narrativeTightnessScore: number; // 1-10
  categories: CategoryScore[];
  gaps: string[];
  nextActions: string[];
  summary: string;
}

export const POSITIONING_CATEGORIES: Record<
  PositioningCategory,
  {
    name: string;
    weight: number;
    diagnosticQuestions: string[];
    scoringGuidance: Record<PositioningGrade, string>;
  }
> = {
  clarity: {
    name: "Clarity",
    weight: 0.3,
    diagnosticQuestions: [
      "Can the founder explain what the company does in one sentence without jargon?",
      "Is the problem described from the customer's point of view (not the product's)?",
      "Does the solution clearly map to the problem described?",
      "Is the target customer specific enough that you could identify them in the real world?",
    ],
    scoringGuidance: {
      A: "Instantly understandable, specific, problem-solution fit is obvious",
      B: "Clear with minor refinement needed, mostly specific",
      C: "Understandable with effort, some vagueness",
      D: "Confusing, requires significant clarification",
      F: "Abstract, feature-driven, or incomprehensible",
    },
  },
  differentiation: {
    name: "Differentiation",
    weight: 0.25,
    diagnosticQuestions: [
      "Is it clear why this solution exists versus alternatives?",
      "Does the founder demonstrate awareness of direct and indirect competitors?",
      'Is the "why you" or "why this approach" articulated credibly?',
    ],
    scoringGuidance: {
      A: "Clear differentiation rooted in insight or advantage",
      B: "Good differentiation with some unique angles",
      C: "Some differentiation, mostly surface-level",
      D: "Weak differentiation, vague advantages",
      F: "Undifferentiated or dismissive of competition",
    },
  },
  "market-understanding": {
    name: "Market Understanding",
    weight: 0.2,
    diagnosticQuestions: [
      "Does the founder understand the landscape they are entering?",
      "Is the problem validated through real customer interaction?",
      "Can the founder explain how customers currently solve this problem?",
    ],
    scoringGuidance: {
      A: "Deep understanding, validated problem",
      B: "Good understanding with some validation",
      C: "Partial understanding, limited validation",
      D: "Surface-level understanding, assumptions",
      F: "Assumptions without evidence",
    },
  },
  "narrative-strength": {
    name: "Narrative Strength",
    weight: 0.25,
    diagnosticQuestions: [
      "Does the story feel coherent and compelling?",
      'Is there a clear "why now"?',
      "Would this narrative create curiosity or urgency in a buyer or partner?",
    ],
    scoringGuidance: {
      A: "Tight, urgent, coherent narrative",
      B: "Good narrative with clear direction",
      C: "Understandable but lacks urgency",
      D: "Weak narrative, missing key elements",
      F: "Meandering or unfocused story",
    },
  },
};

export const CATEGORY_ORDER: PositioningCategory[] = [
  "clarity",
  "differentiation",
  "market-understanding",
  "narrative-strength",
];

export function scoreToGrade(score: number): PositioningGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function gradeToScore(grade: PositioningGrade): number {
  switch (grade) {
    case "A":
      return 95;
    case "B":
      return 85;
    case "C":
      return 75;
    case "D":
      return 65;
    case "F":
      return 45;
  }
}

export function calculateOverallGrade(
  categories: CategoryScore[]
): PositioningGrade {
  const weightedScore = categories.reduce((total, cat) => {
    return total + cat.score * cat.weight;
  }, 0);
  return scoreToGrade(weightedScore);
}

export function generatePositioningPrompt(): string {
  return `
# POSITIONING READINESS FRAMEWORK
(Diagnostic Questions & Scoring)

## Purpose
This framework evaluates positioning readiness in a rigorous, non-marketing, founder-relevant way.
It diagnoses market clarity, not copy or slogans.

## Scoring Overview
Each category is scored A–F using weighted criteria.
Final outputs:
- Positioning Grade (A–F)
- Narrative Tightness Score (1–10)
- Clear summary of gaps + next steps

---

${CATEGORY_ORDER.map((cat) => {
  const config = POSITIONING_CATEGORIES[cat];
  return `
## ${config.name.toUpperCase()} (${config.weight * 100}%)

**Diagnostic Questions:**
${config.diagnosticQuestions.map((q) => `- ${q}`).join("\n")}

**Scoring Guidance:**
- **A**: ${config.scoringGuidance.A}
- **B**: ${config.scoringGuidance.B}
- **C**: ${config.scoringGuidance.C}
- **D**: ${config.scoringGuidance.D}
- **F**: ${config.scoringGuidance.F}
`;
}).join("\n---\n")}

---

## NARRATIVE TIGHTNESS SCORE (1–10)

Evaluate:
- How efficiently the founder communicates the core idea
- How little explanation is needed to understand the value

10 = immediately clear, no filler
1 = confusing, rambling, or contradictory

---

## OUTPUT FORMAT

Return:
1. **Positioning Grade** (A–F)
2. **Narrative Tightness Score** (1–10)
3. **3–5 Specific Gaps**
4. **Next 3 Actions** to improve positioning clarity

**Do NOT:**
- Rewrite marketing copy unless explicitly requested
- Suggest channels, ads, or branding

Positioning must be earned through clarity, not polished through language.
`;
}

export interface PositioningSignals {
  icpVagueOrUndefined: boolean;
  everyoneAsTarget: boolean;
  genericMessaging: boolean;
  highEffortLowTraction: boolean;
}

/**
 * Negative patterns that suppress false positive positioning signals.
 * These are phrases where positioning-related words appear in non-positioning contexts.
 */
export const NEGATIVE_POSITIONING_PATTERNS: RegExp[] = [
  /\b(my|our|their) position (in|at|on)\b/i, // "my position in the company"
  /\bposition (paper|statement)\b/i,           // academic, not marketing
  /\bposition(ed|ing)? (myself|himself|herself|themselves)\b/i, // personal positioning, not market
];

/** Patterns for non-target uses of "everyone" */
const NEGATIVE_EVERYONE_PATTERNS: RegExp[] = [
  /\beveryone knows\b/i,
  /\beveryone does\b/i,
  /\btell everyone\b/i,
  /\beveryone on (my|our|the) team\b/i,
  /\beveryone (here|there|else)\b/i,
];

/** Buzzwords that must appear together (2+) to trigger genericMessaging */
const BUZZWORDS = [
  "innovative",
  "revolutionary",
  "disrupt",
  "game-changing",
  "cutting-edge",
  "paradigm",
  "synergy",
  "leverage",
  "best-in-class",
];

export function detectPositioningSignals(
  conversationContext: string
): PositioningSignals {
  const lowerContext = conversationContext.toLowerCase();

  // Check if any negative positioning patterns match (suppress false positives)
  const hasNegativeMatch = NEGATIVE_POSITIONING_PATTERNS.some((p) =>
    p.test(conversationContext)
  );

  // ICP vague: explicit signals only, with minimum length check for the absence heuristic
  const icpExplicitSignals =
    lowerContext.includes("not sure who") ||
    lowerContext.includes("still figuring out") ||
    lowerContext.includes("anyone who");

  // Only apply the "no customer/buyer mention" heuristic for messages >100 chars
  // Short messages are unlikely to be ICP discussions
  const icpAbsenceHeuristic =
    conversationContext.length > 100 &&
    !lowerContext.includes("customer") &&
    !lowerContext.includes("buyer");

  const icpVagueOrUndefined =
    !hasNegativeMatch && (icpExplicitSignals || icpAbsenceHeuristic);

  // Everyone as target: check for negative "everyone" patterns
  const hasEveryoneKeyword =
    lowerContext.includes("everyone") ||
    lowerContext.includes("all businesses") ||
    lowerContext.includes("any company") ||
    lowerContext.includes("anyone can use");

  const hasNegativeEveryone = NEGATIVE_EVERYONE_PATTERNS.some((p) =>
    p.test(conversationContext)
  );

  const everyoneAsTarget = hasEveryoneKeyword && !hasNegativeEveryone;

  // Generic messaging: require 2+ buzzwords together, not standalone
  const buzzwordCount = BUZZWORDS.filter((bw) =>
    lowerContext.includes(bw)
  ).length;
  const genericMessaging = buzzwordCount >= 2;

  // High effort low traction: unchanged (already requires compound signals)
  const highEffortLowTraction =
    (lowerContext.includes("working hard") ||
      lowerContext.includes("been trying") ||
      lowerContext.includes("months") ||
      lowerContext.includes("year")) &&
    (lowerContext.includes("no traction") ||
      lowerContext.includes("struggling") ||
      lowerContext.includes("not working"));

  return {
    icpVagueOrUndefined,
    everyoneAsTarget,
    genericMessaging,
    highEffortLowTraction,
  };
}

/**
 * Count the number of true positioning signals.
 */
export function countPositioningSignals(signals: PositioningSignals): number {
  return Object.values(signals).filter(Boolean).length;
}

export function needsPositioningFramework(signals: PositioningSignals): boolean {
  // Require 2+ signals to trigger positioning mode (prevents single-signal false positives)
  return countPositioningSignals(signals) >= 2;
}

export const POSITIONING_INTRODUCTION_LANGUAGE = `
Before we talk about scaling or investors, we need to get clear on how this is positioned.
Right now, it's hard to tell who this is for and why they'd choose it.

Let me walk you through a positioning diagnostic that will help clarify your market stance.
`;
