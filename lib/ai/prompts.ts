import { FRED_CORE_PROMPT, buildPromptWithSupplements } from "@/lib/ai/prompt-layers";
import type { SupplementalPromptPatch } from "@/lib/ai/prompt-layers";
import {
  FRED_BIO,
  FRED_COMPANIES,
} from "@/lib/fred-brain";
import { STARTUP_STEPS, type StartupStep } from "@/lib/ai/frameworks/startup-process";
import type { RealityLensFactor } from "@/lib/fred/schemas/reality-lens";
import { FACTOR_DESCRIPTIONS } from "@/lib/fred/schemas/reality-lens";
import type { RealityLensGate, ModeContext } from "@/lib/db/conversation-state";
import type { DiagnosticMode } from "@/lib/ai/diagnostic-engine";
import { generatePositioningPrompt } from "@/lib/ai/frameworks/positioning";
import { generateInvestorLensPrompt, shouldRequestDeck, type InvestorStage, type InvestorVerdict } from "@/lib/ai/frameworks/investor-lens";
import type { IRSResult } from "@/lib/fred/irs/types";
import { CATEGORY_LABELS, STAGE_BENCHMARKS, IRS_CATEGORIES, getReadinessLevel, compareToStage, type StartupStage } from "@/lib/fred/irs/types";

// Re-export prompt-layers types and functions for convenience
export type { SupplementalPromptPatch };
export { FRED_CORE_PROMPT, buildPromptWithSupplements };

// Phase 80 (v3.0): Re-export proactive guidance block for backward compat
export { buildProactiveGuidanceBlock } from "@/lib/ai/stage-gate/redirect-templates";

// Phase 80 v8.0: Re-export unified stage-gate prompt builders
export { buildStageAwarePromptBlock, buildStageRedirectBlock } from "@/lib/oases/stage-gate-prompt";

// ============================================================================
// FRED CARY SYSTEM PROMPT — Backward-compatible alias
//
// This export points to FRED_CORE_PROMPT.content so all existing imports
// (tests, routes, services) continue to work with zero changes.
//
// For new code, prefer importing FRED_CORE_PROMPT from ./prompt-layers.
// ============================================================================

export const FRED_CAREY_SYSTEM_PROMPT: string = FRED_CORE_PROMPT.content;

// ============================================================================
// Topic-Specific Coaching Overlays (Layer 3 Framework Documents)
// ============================================================================

export const COACHING_PROMPTS = {
  fundraising: `Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up.

## FRAMEWORK ACTIVE: Investor Lens

Apply the Investor Lens framework for this conversation:
- Verdict first: Yes / No / Not yet — and explain why
- Pass reasons before fixes
- Translate vague feedback into explicit investor filters
- Prescribe smallest proofs to flip the verdict
- Determine current stage and traction (Pre-Seed, Seed, Series A readiness)
- Assess target raise amount and timeline
- Evaluate investor targeting strategy
- Review pitch materials readiness (but do NOT ask for a deck by default)

Remember: Capital is a tool, not the goal. Challenge the assumption that raising is the right move before helping them raise. Never optimize narrative over fundamentals.`,

  pitchReview: `Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up.

## FRAMEWORK ACTIVE: Deck Review Protocol

Review the pitch using the Deck Review Protocol:
1. Scorecard (0-10): problem, customer, solution, market realism, business model, traction, GTM, competition, team, economics, narrative
2. Top 5 highest-leverage fixes
3. Slide-by-slide rewrite guidance
4. Likely investor objections (10+) with suggested responses
5. One-page tight narrative

Apply the Reality Lens (5 Dimensions): Feasibility, Economics, Demand, Distribution, Timing.
Be specific about what's strong and what's weak. No softball feedback. Evidence > narrative.`,

  strategy: `Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up.

## FRAMEWORK ACTIVE: 9-Step Startup Process

Apply the 9-Step Startup Process:
- Identify which step they are actually on (not where they think they are)
- Do not let them skip ahead — validate the current step first
- Apply "Do Not Advance If" gates for each step
- Identify current challenges and blockers
- Determine what validation is needed before proceeding
- Prioritize resource allocation
- Define clear milestones

Remember: Decision sequencing is non-negotiable. Upstream truth before downstream optimization. If they want to scale but haven't validated demand, redirect plainly.`,

  positioning: `Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up.

## FRAMEWORK ACTIVE: Positioning Readiness Framework

Apply the Positioning Readiness Framework:
- **Clarity (30%)**: One sentence explanation without jargon
- **Differentiation (25%)**: Why this vs all alternatives
- **Market Understanding (20%)**: Validated through real customer interaction
- **Narrative Strength (25%)**: Coherent story, compelling "why now"

Output: Grade (A-F), Narrative Tightness Score (1-10), 3-5 specific gaps, and Next 3 Actions.
Rule: Do not jump into messaging rewrites unless explicitly requested. Positioning must be earned through clarity, not polished through language.`,

  mindset: `Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up.

## TOPIC FOCUS: Mindset & Founder Wellbeing

Draw on Fred's philosophy for mindset mentoring:
- "Mindset is the pillar to success"
- Address self-doubt directly with facts, not platitudes
- Create micro-victories to build momentum
- Focus on what they CAN control and release what they cannot
- Share relevant failure-to-success stories from your experience
- Normalize the emotional load — insecurity, burnout, imposter syndrome are common, not weakness
- Reduce to controllables, offer practical exits
- If burnout signals are present, address wellbeing before business

Remember: Encourage without flattery. Tough love with genuine care. Be present, warm, steady. You are not therapy — if serious risk signals appear, encourage professional support.`,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a complete prompt with topic-specific overlay.
 * Uses buildSystemPrompt to replace the {{FOUNDER_CONTEXT}} placeholder.
 */
export function getPromptForTopic(topic: keyof typeof COACHING_PROMPTS): string {
  return `${buildSystemPrompt("")}\n\n${COACHING_PROMPTS[topic]}`;
}

/**
 * Inject dynamic founder context into the system prompt.
 * Replaces the {{FOUNDER_CONTEXT}} placeholder with actual data.
 * When no context is provided, the placeholder and surrounding blank lines are removed.
 *
 * @param founderContext - Pre-built context string (or empty string)
 * @returns The complete system prompt with context injected
 */
export function buildSystemPrompt(founderContext: string): string {
  if (!founderContext) {
    // Remove placeholder and collapse surrounding blank lines
    return FRED_CAREY_SYSTEM_PROMPT.replace(/\n*\{\{FOUNDER_CONTEXT\}\}\n*/g, "\n\n");
  }
  return FRED_CAREY_SYSTEM_PROMPT.replace("{{FOUNDER_CONTEXT}}", founderContext);
}

/**
 * Build a complete prompt with topic overlay AND founder context.
 */
export function buildTopicPrompt(
  topic: keyof typeof COACHING_PROMPTS,
  founderContext: string
): string {
  const base = buildSystemPrompt(founderContext);
  return `${base}\n\n${COACHING_PROMPTS[topic]}`;
}

/**
 * Generate a contextual greeting based on Fred's style.
 * Uses canonical opening prompts from the Operating Bible.
 */
export function getFredGreeting(startupContext?: {
  name?: string;
  stage?: string;
  mainChallenge?: string;
}): string {
  const greetings = [
    `Hey, I'm Fred Cary. I've advised ${FRED_COMPANIES.summaryStats.companiesFounded} companies over ${FRED_BIO.yearsExperience}+ years and mentored hundreds of founders. What are you building, who is it for, and what are you trying to accomplish right now?`,
    `Welcome. I'm Fred — ${FRED_BIO.yearsExperience}+ years of building companies and mentoring founders. Let's get into it. What are you building, and what's the real bottleneck right now?`,
    `Hey! Fred Cary here. I've seen what works and what doesn't across ${FRED_COMPANIES.summaryStats.companiesFounded} companies and ${FRED_BIO.yearsExperience}+ years. If we fixed one thing in the next 30 days, what would matter most to your business?`,
  ];
  const base = greetings[Math.floor(Math.random() * greetings.length)];

  if (startupContext?.name) {
    const name = startupContext.name;
    const stage = (startupContext.stage || "startup").replace("-", " ");
    const challenge = startupContext.mainChallenge || "growth";
    return `${base}\n\nI see you're working on ${name} at the ${stage} stage, focused on ${challenge}. Let's dig in.`;
  }

  return base;
}

// ============================================================================
// Step Guidance Block (Phase 36)
// ============================================================================

/**
 * Build a step-specific guidance block for the system prompt.
 * Tells FRED what to focus on at the founder's current step in the
 * 9-Step Startup Process, including priority questions, required output,
 * do-not-advance conditions, and active blockers.
 *
 * Target: <300 tokens to avoid eating the context window.
 */
export function buildStepGuidanceBlock(
  currentStep: StartupStep,
  stepStatuses: Record<StartupStep, string>,
  blockers: string[]
): string {
  const step = STARTUP_STEPS[currentStep];
  if (!step) return "";

  const lines: string[] = [];
  lines.push("## CURRENT PROCESS POSITION");
  lines.push("");
  lines.push(`You are guiding this founder through **Step ${step.stepNumber}: ${step.name}**`);
  lines.push("");
  lines.push(`**Objective:** ${step.objective}`);
  lines.push("");

  // Key questions to ask
  lines.push("**Your priority questions for this step:**");
  for (const q of step.questions) {
    lines.push(`- ${q}`);
  }
  lines.push("");

  // What the founder needs to produce
  lines.push(`**Required output before advancing:** ${step.requiredOutput}`);
  lines.push("");

  // Do not advance conditions
  lines.push("**Do NOT advance to the next step if:**");
  for (const d of step.doNotAdvanceIf) {
    lines.push(`- ${d}`);
  }

  // Current blockers
  if (blockers.length > 0) {
    lines.push("");
    lines.push("**Active blockers on this step:**");
    for (const b of blockers) {
      lines.push(`- ${b}`);
    }
    lines.push("Address these before moving forward.");
  }

  // Validated steps summary
  const validatedSteps = Object.entries(stepStatuses)
    .filter(([, status]) => status === "validated")
    .map(([s]) => s);
  if (validatedSteps.length > 0) {
    lines.push("");
    lines.push(`**Steps already validated:** ${validatedSteps.join(", ")}`);
    lines.push("Do not re-ask questions that have been answered in validated steps.");
  }

  return lines.join("\n");
}

/**
 * Build a prompt block instructing FRED to redirect the founder back
 * to the current step. Injected into the system prompt when drift is
 * detected. The LLM generates the actual redirect language -- we provide
 * the instruction and context.
 */
export function buildDriftRedirectBlock(
  currentStep: StartupStep,
  targetStep: StartupStep
): string {
  const currentStepName = STARTUP_STEPS[currentStep]?.name || currentStep;
  const targetStepName = STARTUP_STEPS[targetStep]?.name || targetStep;

  return `## REDIRECT INSTRUCTION (Active This Turn)

The founder is asking about "${targetStepName}" but has not yet validated "${currentStepName}".

Your response MUST:
1. Acknowledge what they asked about ("I hear you on ${targetStepName.toLowerCase()}...")
2. Explain why you need to finish the current step first -- downstream work built on unvalidated assumptions fails
3. Redirect to a specific question or action for "${currentStepName}"
4. Be warm but firm -- do not let the founder skip ahead

Do NOT ignore their question entirely. Briefly note it, then redirect.`;
}

// ============================================================================
// Reality Lens Gate Blocks (Phase 37)
// ============================================================================

/** Redirect counter threshold before compromise mode activates */
const COMPROMISE_THRESHOLD = 2;

/**
 * Build a prompt block that enforces the Reality Lens gate.
 * Injected when the founder requests downstream work but upstream truth
 * is not established.
 *
 * Escalation path:
 * - Redirect 1-2: Acknowledge request, explain gaps, redirect to upstream work
 * - Redirect 3+: COMPROMISE MODE -- help with the downstream work but be
 *   transparent about weaknesses.
 *
 * Operating Bible Section 2.2 and 2.3.
 */
export function buildRealityLensGateBlock(
  downstreamRequest: string,
  weakDimensions: RealityLensFactor[],
  unassessedDimensions: RealityLensFactor[],
  redirectCount: number = 0
): string {
  const lines: string[] = [];
  const requestLabel = downstreamRequest.replace(/_/g, " ");

  // COMPROMISE MODE: After COMPROMISE_THRESHOLD redirects, help with caveats
  if (redirectCount >= COMPROMISE_THRESHOLD) {
    lines.push("## REALITY LENS GATE — COMPROMISE MODE (Active This Turn)");
    lines.push("");
    lines.push(`The founder has asked about **${requestLabel}** ${redirectCount + 1} times.`);
    lines.push("You have redirected them before. They are persistent. Switch to **compromise mode**.");
    lines.push("");
    lines.push("**Your response MUST:**");
    lines.push(`1. Acknowledge their persistence: "I hear you — you want to work on ${requestLabel.toLowerCase()}. Let's do it."`);
    lines.push("2. Help them with the downstream work they requested");
    lines.push("3. BUT be transparent about the gaps as you go. Weave the weaknesses INTO the work:");

    const allGaps = [...weakDimensions, ...unassessedDimensions];
    for (const dim of allGaps) {
      lines.push(`   - **${dim.charAt(0).toUpperCase() + dim.slice(1)}**: Flag this gap where it matters in the output. E.g., if building a deck with unvalidated demand, note: "This slide claims market demand — you'll need evidence here before presenting."`);
    }

    lines.push("4. End with: what would make this work STRONGER (the upstream truth they're missing)");
    lines.push("");
    lines.push("The goal is to be USEFUL while honest. A deck that's transparent about gaps is better than no deck and a frustrated founder.");

    return lines.join("\n");
  }

  // STANDARD REDIRECT MODE (redirects 1-2)
  lines.push("## REALITY LENS GATE (Active This Turn)");
  lines.push("");
  lines.push(`The founder is asking about **${requestLabel}**.`);
  lines.push("This is downstream work. The relevant upstream dimensions are not yet established.");
  lines.push("");

  if (weakDimensions.length > 0) {
    lines.push("**Weak dimensions (need strengthening):**");
    for (const dim of weakDimensions) {
      lines.push(`- **${dim.charAt(0).toUpperCase() + dim.slice(1)}**: ${FACTOR_DESCRIPTIONS[dim]}`);
    }
    lines.push("");
  }

  if (unassessedDimensions.length > 0) {
    lines.push("**Unassessed dimensions (no data yet):**");
    for (const dim of unassessedDimensions) {
      lines.push(`- **${dim.charAt(0).toUpperCase() + dim.slice(1)}**: ${FACTOR_DESCRIPTIONS[dim]}`);
    }
    lines.push("");
  }

  lines.push("**Your response MUST:**");
  lines.push("1. Acknowledge what they asked about — do not dismiss it");
  lines.push("2. Explain plainly which upstream dimensions are weak or unassessed");
  lines.push("3. Ask a specific question to address the most critical gap");
  lines.push("4. Be direct but warm — this is a conversation, not a wall");
  lines.push("");
  lines.push("Do NOT proceed with downstream work yet. But if the founder pushes back again, you will shift to helping them while being transparent about the gaps.");

  return lines.join("\n");
}

/**
 * Build a compact summary of Reality Lens gate status for the system prompt.
 * Always injected so FRED knows the current state of upstream validation.
 */
export function buildRealityLensStatusBlock(gate: RealityLensGate): string {
  const entries = Object.entries(gate)
    .map(([dim, state]) => {
      let label = `${dim}=${state.status}`;
      if (state.status === "weak" && state.blockers && state.blockers.length > 0) {
        label += `(blocked)`;
      }
      return label;
    })
    .join(", ");

  return `Reality Lens: ${entries}`;
}

// ============================================================================
// Framework Mode Injection Blocks (Phase 38)
// ============================================================================

/**
 * Build the framework injection block for the system prompt.
 * Returns the full framework document for the active mode.
 *
 * In founder-os mode, the 9-Step Process is the default backbone
 * (step guidance from Phase 36 already handles this, so we return
 * a minimal reinforcement block rather than the full process prompt).
 *
 * In positioning/investor mode, the specialized framework is injected
 * as an ACTIVE FRAMEWORK section.
 */
export function buildFrameworkInjectionBlock(
  activeMode: DiagnosticMode
): string {
  switch (activeMode) {
    case "positioning":
      return `\n\n## ACTIVE FRAMEWORK: Positioning Readiness\n\n${generatePositioningPrompt()}`;

    case "investor-readiness":
      return `\n\n## ACTIVE FRAMEWORK: Investor Lens\n\n${generateInvestorLensPrompt()}`;

    case "founder-os":
    default:
      // In founder-os mode, the step guidance block (Phase 36) already
      // provides process context. Add a minimal reinforcement.
      return `\n\n## ACTIVE MODE: Founder Decision OS\n\nYou are in the default mentoring mode. Use the 9-Step Startup Process as your backbone. Focus on the founder's current step. Do not introduce specialized frameworks unless signals warrant it.`;
  }
}

/**
 * Build a one-time introduction block when entering a new framework mode.
 * This tells FRED to deliver the introduction language in its response.
 *
 * The introduction is PROMPT-DRIVEN: we instruct the LLM to include it,
 * rather than hardcoding it in the response.
 */
export function buildModeTransitionBlock(
  framework: "positioning" | "investor",
  direction: "enter" | "exit"
): string {
  if (direction === "exit") {
    return `\n\n## MODE TRANSITION\n\nYou have returned to the default Founder Decision OS mode. Resume guiding the founder through their current step in the 9-Step Process. Do not reference the previous framework unless the founder brings it up.`;
  }

  if (framework === "positioning") {
    return `\n\n## MODE TRANSITION: Entering Positioning Mode\n\nYou have detected positioning signals. Before applying the Positioning Readiness Framework, introduce it naturally:\n\n"Before we talk about scaling or investors, we need to get clear on how this is positioned. Right now, it's hard to tell who this is for and why they'd choose it."\n\nUse this language verbatim or adapt it naturally to the conversation flow. Do NOT frame this as marketing or branding. After introducing, begin applying the framework's diagnostic questions.`;
  }

  if (framework === "investor") {
    return `\n\n## MODE TRANSITION: Entering Investor Mode\n\nYou have detected investor/fundraising signals. Before applying the Investor Lens, introduce it naturally:\n\n"We can evaluate this the way investors actually will. That includes a clear verdict — yes, no, or not yet — and why."\n\nUse this language verbatim or adapt it naturally. Remember: Do NOT encourage fundraising by default. Verdict first, then pass reasons, then fixes. Never optimize narrative over fundamentals.`;
  }

  return "";
}

// ============================================================================
// Phase 39: IRS, Deck Protocol, and Deck Review Prompt Blocks
// ============================================================================

/** How many days an IRS score remains relevant in prompts */
const IRS_FRESHNESS_DAYS = 7;

/**
 * Build a prompt block summarizing the founder's IRS score.
 *
 * - When a recent IRS exists (< 7 days), injects score summary with stage benchmarks.
 * - When missing, instructs FRED to assess readiness using the 6 IRS categories
 *   when sufficient data is available.
 */
export function buildIRSPromptBlock(
  latestIRS: IRSResult | null,
  founderStage: string
): string {
  if (!latestIRS || !latestIRS.createdAt) {
    return `## INVESTOR READINESS SCORE

No IRS has been calculated yet for this founder. When you have gathered sufficient data about their team, market, product, traction, financials, and pitch readiness, you can assess their investor readiness across these 6 categories. Do NOT mention the score system to the founder unless they ask about investor readiness.`;
  }

  // Check freshness
  const ageMs = Date.now() - latestIRS.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > IRS_FRESHNESS_DAYS) {
    return `## INVESTOR READINESS SCORE

The founder's last IRS was calculated ${Math.round(ageDays)} days ago (score: ${latestIRS.overall}/100). It may be outdated. Use it as a reference point but rely on current conversation data for guidance.`;
  }

  const readiness = getReadinessLevel(latestIRS.overall);
  const stageKey = founderStage || "seed";
  const lines: string[] = [];
  lines.push("## INVESTOR READINESS SCORE");
  lines.push("");
  lines.push(`**Overall: ${latestIRS.overall}/100 — ${readiness.label}**`);
  lines.push(readiness.description);
  lines.push("");
  lines.push("**Category Breakdown (vs. stage benchmark):**");

  for (const cat of IRS_CATEGORIES) {
    const catScore = latestIRS.categories[cat];
    if (!catScore) continue;
    const comparison = compareToStage(catScore.score, cat, stageKey);
    const arrow = comparison.status === "above" ? "+" : comparison.status === "below" ? "" : "=";
    lines.push(`- ${CATEGORY_LABELS[cat]}: ${catScore.score}/100 (${arrow}${comparison.diff} vs ${stageKey} benchmark)`);
  }

  if (latestIRS.strengths.length > 0) {
    lines.push("");
    lines.push(`**Top strengths:** ${latestIRS.strengths.slice(0, 3).join("; ")}`);
  }
  if (latestIRS.weaknesses.length > 0) {
    lines.push(`**Key gaps:** ${latestIRS.weaknesses.slice(0, 3).join("; ")}`);
  }

  lines.push("");
  lines.push("Use this data to inform your guidance. Reference scores naturally when relevant — do not dump the full scorecard unprompted.");

  return lines.join("\n");
}

/**
 * Build a prompt block encoding Deck Request Protocol rules.
 *
 * Conditions:
 * - No verdict yet → "Issue provisional verdict BEFORE mentioning decks"
 * - Verdict issued, shouldRequestDeck() says yes → include request language
 * - Verdict issued, shouldn't request → "Do NOT request a deck"
 * - Deck already uploaded → "Proceed to review"
 */
export function buildDeckProtocolBlock(
  formalAssessments: ModeContext["formalAssessments"],
  hasUploadedDeck: boolean,
  founderStage: string
): string {
  const lines: string[] = [];
  lines.push("## DECK REQUEST PROTOCOL");
  lines.push("");

  // Deck already uploaded — skip request logic
  if (hasUploadedDeck) {
    lines.push("The founder has already uploaded a pitch deck. Proceed to review. Do NOT ask for another deck.");
    return lines.join("\n");
  }

  // No verdict issued yet
  if (!formalAssessments.verdictIssued) {
    lines.push("**You have NOT yet issued an investor verdict for this founder.**");
    lines.push("");
    lines.push("You MUST issue a provisional verdict (Yes / No / Not yet) BEFORE mentioning pitch decks or requesting materials.");
    lines.push("A deck is a tool for conviction, not a prerequisite for thinking. Assess readiness from the conversation first.");
    return lines.join("\n");
  }

  // Verdict issued — check shouldRequestDeck logic
  const stage = normalizeInvestorStage(founderStage);
  const verdict = formalAssessments.verdictValue;
  if (!verdict) {
    lines.push("Verdict was issued but value is unclear. Focus on clarifying the verdict before requesting materials.");
    return lines.join("\n");
  }

  const deckDecision = shouldRequestDeck(
    { mentionsFundraising: true, mentionsValuation: false, mentionsDeck: false, asksAboutReadiness: false, uploadedDeck: false },
    stage,
    verdict
  );

  if (deckDecision.shouldRequest) {
    const materialType = deckDecision.requestType === "summary" ? "1-2 page summary" : "pitch deck";
    lines.push(`**Verdict issued: ${verdict.toUpperCase()}. A ${materialType} would be valuable.**`);
    lines.push("");
    lines.push(`${deckDecision.reason}`);
    lines.push("");
    lines.push(`If the founder hasn't shared a ${materialType}, you may request one naturally — but only after discussing the verdict and its reasoning.`);
    if (!formalAssessments.deckRequested) {
      lines.push("You have not yet requested materials from this founder.");
    }
  } else {
    lines.push(`**Verdict issued: ${verdict.toUpperCase()}. Do NOT request a deck at this time.**`);
    lines.push("");
    lines.push("Focus on strengthening fundamentals before introducing deck-level work.");
  }

  return lines.join("\n");
}

/**
 * Build a prompt block for when deck review is available and ready.
 * Injected when:
 * - activeMode === "investor-readiness"
 * - RL gate is open for pitch_deck
 * - Verdict has been issued
 */
export function buildDeckReviewReadyBlock(
  rlGateOpenForDeck: boolean,
  verdictIssued: boolean,
  hasUploadedDeck: boolean
): string {
  if (!rlGateOpenForDeck || !verdictIssued) return "";

  const lines: string[] = [];
  lines.push("## DECK REVIEW AVAILABLE");
  lines.push("");

  if (hasUploadedDeck) {
    lines.push("The founder has uploaded a pitch deck and all Reality Lens dimensions are validated.");
    lines.push("The 11-dimension deck review with per-slide investor objections is available.");
    lines.push("Guide the founder to initiate the review when ready — it will score each slide, identify gaps, and generate the skeptical investor questions they need to prepare for.");
  } else {
    lines.push("All Reality Lens dimensions are validated and a verdict has been issued.");
    lines.push("The 11-dimension deck review with per-slide investor objections is available when the founder uploads a PDF deck.");
    lines.push("If the conversation naturally leads to deck preparation, let the founder know they can upload their deck for a comprehensive IC-perspective review.");
    lines.push("Do NOT push for a deck upload — mention it only when contextually appropriate.");
  }

  return lines.join("\n");
}

/** Normalize founder stage string to InvestorStage */
function normalizeInvestorStage(stage: string): InvestorStage {
  const lower = (stage || "").toLowerCase();
  if (lower.includes("pre-seed") || lower.includes("preseed") || lower.includes("idea")) return "pre-seed";
  if (lower.includes("series") || lower.includes("growth")) return "series-a";
  return "seed";
}
