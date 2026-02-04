/**
 * Investor Lens – VC Evaluation & Coaching Framework
 * Pre-Seed, Seed, and Series A Only
 *
 * This framework helps founders understand how VCs actually make decisions
 * and build evidence that converts "no" or "not yet" into "yes".
 */

export type InvestorStage = "pre-seed" | "seed" | "series-a";
export type InvestorVerdict = "yes" | "no" | "not-yet";

export interface InvestorEvaluation {
  stage: InvestorStage;
  verdict: InvestorVerdict;
  verdictReason: string;
  passReasons: string[];
  evidenceToFlip: string[];
  deRiskingActions: string[];
  deckNeeded: boolean;
  deckReason: string | null;
}

export interface CoreVCAxis {
  axis: string;
  description: string;
  subCriteria: string[];
}

export const CORE_VC_AXES: CoreVCAxis[] = [
  {
    axis: "Team",
    description: "Founder capability and fit",
    subCriteria: [
      "Founder–market fit",
      "Learning velocity and decision quality",
      "Ability to recruit and lead",
    ],
  },
  {
    axis: "Market",
    description: "Size and opportunity",
    subCriteria: [
      "Size and expansion potential",
      "Urgency of the problem",
      "Structural tailwinds or timing inflection",
    ],
  },
  {
    axis: "Problem",
    description: "Pain point validation",
    subCriteria: [
      "Painful, frequent, and expensive",
      "Clearly owned by a buyer with budget",
    ],
  },
  {
    axis: "Solution & Differentiation",
    description: "Why this approach wins",
    subCriteria: [
      "Why this approach works",
      "Why it wins vs alternatives",
      "Why now vs five years ago or later",
    ],
  },
  {
    axis: "Go-To-Market",
    description: "Distribution strategy",
    subCriteria: [
      "Credible distribution path",
      "Early signs of repeatability",
    ],
  },
  {
    axis: "Traction Quality",
    description: "Evidence of product-market fit",
    subCriteria: [
      "Retention, usage, revenue",
      "Signal over vanity metrics",
    ],
  },
  {
    axis: "Business Model",
    description: "Economic viability",
    subCriteria: [
      "Pricing logic",
      "Margin directionality",
      "Scalability over time",
    ],
  },
  {
    axis: "Fund Fit",
    description: "Alignment with investor",
    subCriteria: [
      "Why this investor",
      "Why this round",
      "Why now",
    ],
  },
  {
    axis: "Valuation Realism",
    description: "Price alignment",
    subCriteria: [
      "Price aligned with proof and risk",
      "Round size aligned with milestones",
    ],
  },
];

export const HIDDEN_VC_FILTERS = [
  {
    filter: "Outcome Size Mismatch",
    description: "Too small to move the fund",
  },
  {
    filter: "Weak Internal Sponsor",
    description: "No partner willing to carry conviction",
  },
  {
    filter: "Pattern-Matching Bias",
    description: "Looks unfamiliar or too familiar in the wrong way",
  },
  {
    filter: "Momentum Gap",
    description: "No social proof or external validation",
  },
  {
    filter: "Complexity Cost",
    description: "Too much work to reach conviction",
  },
];

export interface StageSpecificCriteria {
  stage: InvestorStage;
  primaryQuestion: string;
  whatInvestorsNeed: string[];
  killSignals: string[];
  outputRequirements: string[];
}

export const STAGE_CRITERIA: Record<InvestorStage, StageSpecificCriteria> = {
  "pre-seed": {
    stage: "pre-seed",
    primaryQuestion:
      "Is this team worth betting on before proof?",
    whatInvestorsNeed: [
      "Narrow ICP and a single wedge use case",
      "Founder-led discovery and early sales",
      "Feasibility and economic plausibility",
      "Clear why-now dynamic",
      "A 30–60 day plan to de-risk the one hypothesis that matters most",
    ],
    killSignals: [
      "Broad market with no wedge",
      "Patents or branding before demand validation",
      "No clear buyer or economic owner",
    ],
    outputRequirements: [
      "First-meeting verdict: Yes / No / Not yet",
      "Top 3 kill-risks",
      "Next 3 proof-generating actions (≤30 days)",
    ],
  },
  seed: {
    stage: "seed",
    primaryQuestion:
      "Is there real pull and a credible path to Series A?",
    whatInvestorsNeed: [
      "Progress toward ~$1M ARR (or equivalent proof of monetization)",
      "Retention and usage evidence",
      "One GTM motion that works a bit",
      "Clear Series A milestone logic",
    ],
    killSignals: [
      "Vanity metrics substituting for retention",
      "Hiring sales before demand is proven",
      "Go-to-market exists only in slides",
    ],
    outputRequirements: [
      "Separate scores for traction quality, repeatability, and Series A clarity",
      "A 6–12 month Series A milestone map",
    ],
  },
  "series-a": {
    stage: "series-a",
    primaryQuestion:
      "Is PMF proven and is growth repeatable?",
    whatInvestorsNeed: [
      "Strong PMF evidence and retention discipline",
      "At least one repeatable acquisition channel",
      "Improving unit economics trajectory",
      "Leadership and operating rigor",
    ],
    killSignals: [
      "Growth spikes without repeatability",
      "Weak retention masked by acquisition spend",
      "No scalable operating cadence",
    ],
    outputRequirements: [
      "10+ likely investor objections with best responses",
      "90-day Series A readiness plan with metric targets",
    ],
  },
};

export interface InvestorReadinessSignals {
  mentionsFundraising: boolean;
  mentionsValuation: boolean;
  mentionsDeck: boolean;
  asksAboutReadiness: boolean;
  uploadedDeck: boolean;
}

export function detectInvestorSignals(
  conversationContext: string,
  hasUploadedDeck: boolean = false
): InvestorReadinessSignals {
  const lower = conversationContext.toLowerCase();

  return {
    mentionsFundraising:
      lower.includes("fundrais") ||
      lower.includes("raise") ||
      lower.includes("investor") ||
      lower.includes("vc") ||
      lower.includes("capital"),
    mentionsValuation:
      lower.includes("valuation") ||
      lower.includes("pre-money") ||
      lower.includes("post-money") ||
      lower.includes("cap table"),
    mentionsDeck:
      lower.includes("deck") ||
      lower.includes("pitch") ||
      lower.includes("slides"),
    asksAboutReadiness:
      lower.includes("ready to raise") ||
      lower.includes("should i raise") ||
      lower.includes("when to raise") ||
      lower.includes("investor ready"),
    uploadedDeck: hasUploadedDeck,
  };
}

export function needsInvestorLens(signals: InvestorReadinessSignals): boolean {
  return (
    signals.mentionsFundraising ||
    signals.mentionsValuation ||
    signals.mentionsDeck ||
    signals.asksAboutReadiness ||
    signals.uploadedDeck
  );
}

export const INVESTOR_LENS_INTRODUCTION = `
We can evaluate this the way investors actually will. That includes a clear verdict — yes, no, or not yet — and why.

I'll apply the same lens a VC partner would use when preparing for investment committee.
`;

export const DECK_REQUEST_RULES = {
  whenToRequest: [
    "The company is near the line — verdict is 'Not yet, but close' or 'Would take a first meeting'",
    "Missing information is structural (GTM motion, retention quality, unit economics, Series A logic)",
    "The founder explicitly asks for investor readiness, deck review, or fundraising strategy",
  ],
  preferSummaryWhen: [
    "Pre-Seed or early Seed",
    "Fundamentals are still being proven",
    "A deck would create false momentum",
  ],
  preferDeckWhen: [
    "Seed → Series A readiness is being evaluated",
    "Reviewing narrative vs. proof",
    "The founder is actively fundraising",
  ],
};

export function generateInvestorLensPrompt(): string {
  return `
# INVESTOR LENS – VC EVALUATION & COACHING FRAMEWORK
(Pre-Seed, Seed, and Series A Only)

## Purpose
This lens helps founders:
- Understand how VCs actually make decisions
- Identify why investors say no (often implicitly)
- Build the evidence that converts a "no" or "not yet" into a "yes"

When active, evaluate companies the way a partner would prepare for IC.

---

## Investor Decision Reality
Venture investors are not ranking companies on absolute quality.
They are asking:
- Can this produce a fund-returning outcome?
- Is the timing right now?
- Do we have enough conviction to defend this internally?

Most passes happen for reasons that are rarely said out loud.

---

## Core VC Evaluation Axes (Always-On)

${CORE_VC_AXES.map(
  (axis) => `
### ${axis.axis}
${axis.description}
${axis.subCriteria.map((c) => `- ${c}`).join("\n")}
`
).join("\n")}

---

## Hidden / Unspoken VC Filters

${HIDDEN_VC_FILTERS.map(
  (f) => `- **${f.filter}**: ${f.description}`
).join("\n")}

When founders receive vague feedback ("not a fit," "too early"), translate it into one or more of these filters.

---

## Stage-Specific Evaluation Criteria

${Object.values(STAGE_CRITERIA)
  .map(
    (stage) => `
### ${stage.stage.toUpperCase()}
**Primary Question**: ${stage.primaryQuestion}

**What investors need to see:**
${stage.whatInvestorsNeed.map((w) => `- ${w}`).join("\n")}

**Kill Signals:**
${stage.killSignals.map((k) => `- ${k}`).join("\n")}

**Required Output:**
${stage.outputRequirements.map((o) => `- ${o}`).join("\n")}
`
  )
  .join("\n---\n")}

---

## Standard Output Format

When applying this lens, return:
1. **IC Verdict**: Yes / No / Not yet + why
2. **Top 5 Pass Reasons** (stage-adjusted)
3. **What Evidence Flips Each Reason** into a yes
4. **Next 3 De-Risking Actions**

---

## Guardrails (Non-Negotiable)

- Do not encourage fundraising by default
- Say plainly when something is not venture-backable (or not yet)
- Offer alternatives when VC is wrong for the business
- Never optimize narrative over fundamentals
- Capital is a tool, not the goal

---

## Deck Request Protocol

**Never ask for a deck by default.**
Always issue a provisional investor verdict first, then decide whether additional materials would materially change that verdict.

A deck is a tool for conviction — not a prerequisite for thinking.
`;
}

export function shouldRequestDeck(
  signals: InvestorReadinessSignals,
  stage: InvestorStage,
  verdict: InvestorVerdict
): { shouldRequest: boolean; requestType: "summary" | "deck"; reason: string } {
  // If deck already uploaded, no need to request
  if (signals.uploadedDeck) {
    return { shouldRequest: false, requestType: "deck", reason: "Already have deck" };
  }

  // Pre-seed usually doesn't need a deck
  if (stage === "pre-seed" && verdict !== "yes") {
    return {
      shouldRequest: true,
      requestType: "summary",
      reason:
        "A deck is likely premature at this stage. A 1–2 page summary covering ICP, problem, early evidence of demand, and what you're trying to de-risk would be more useful.",
    };
  }

  // Seed with close verdict
  if (stage === "seed" && verdict === "not-yet") {
    return {
      shouldRequest: true,
      requestType: "deck",
      reason:
        "You're close enough that a deck could meaningfully sharpen the investor read. If you upload it, I'll review it from an IC perspective.",
    };
  }

  // Series A always benefits from deck review
  if (stage === "series-a") {
    return {
      shouldRequest: true,
      requestType: "deck",
      reason:
        "At this stage, a deck is the right artifact. I'll review it the way a Series A partner would — including objections and readiness gaps.",
    };
  }

  return { shouldRequest: false, requestType: "summary", reason: "" };
}
