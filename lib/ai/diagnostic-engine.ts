/**
 * Diagnostic Introduction Flow Engine
 * Silently diagnoses positioning and investor readiness without overwhelming founders
 *
 * Core Principle: Founders do not choose diagnostics.
 * The system diagnoses silently, then introduces the right lens at the right moment.
 */

import {
  detectPositioningSignals,
  needsPositioningFramework,
  countPositioningSignals,
  type PositioningSignals,
  POSITIONING_INTRODUCTION_LANGUAGE,
  generatePositioningPrompt,
} from "./frameworks/positioning";

import {
  detectInvestorSignals,
  needsInvestorLens,
  countInvestorSignals as countInvestorSignalsFromFramework,
  type InvestorReadinessSignals,
  INVESTOR_LENS_INTRODUCTION,
  generateInvestorLensPrompt,
} from "./frameworks/investor-lens";

import { generateFullProcessPrompt } from "./frameworks/startup-process";

export type DiagnosticMode =
  | "founder-os" // Default mode
  | "positioning" // Positioning framework active
  | "investor-readiness"; // Investor lens active

export type SignalStrength = "low" | "medium" | "high";

export interface DiagnosticState {
  currentMode: DiagnosticMode;
  positioningSignalStrength: SignalStrength;
  investorSignalStrength: SignalStrength;
  positioningSignals: PositioningSignals;
  investorSignals: InvestorReadinessSignals;
  shouldIntroducePositioning: boolean;
  shouldIntroduceInvestor: boolean;
  introductionDelivered: {
    positioning: boolean;
    investor: boolean;
  };
}

export interface ConversationContext {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  hasUploadedDeck: boolean;
  userProfile?: {
    stage?: string;
    challenges?: string[];
  };
}

function countTrueSignals(signals: PositioningSignals): number {
  return countPositioningSignals(signals);
}

function countInvSignals(signals: InvestorReadinessSignals): number {
  return countInvestorSignalsFromFramework(signals);
}

function calculateSignalStrength(count: number, total: number): SignalStrength {
  const ratio = count / total;
  if (ratio >= 0.6) return "high";
  if (ratio >= 0.3) return "medium";
  return "low";
}

export function createInitialDiagnosticState(): DiagnosticState {
  return {
    currentMode: "founder-os",
    positioningSignalStrength: "low",
    investorSignalStrength: "low",
    positioningSignals: {
      icpVagueOrUndefined: false,
      everyoneAsTarget: false,
      genericMessaging: false,
      highEffortLowTraction: false,
    },
    investorSignals: {
      mentionsFundraising: false,
      mentionsValuation: false,
      mentionsDeck: false,
      asksAboutReadiness: false,
      uploadedDeck: false,
    },
    shouldIntroducePositioning: false,
    shouldIntroduceInvestor: false,
    introductionDelivered: {
      positioning: false,
      investor: false,
    },
  };
}

export function analyzeConversation(
  context: ConversationContext
): DiagnosticState {
  // Combine all user messages for analysis
  const userContent = context.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  // Detect signals
  const positioningSignals = detectPositioningSignals(userContent);
  const investorSignals = detectInvestorSignals(userContent, context.hasUploadedDeck);

  // Calculate signal strengths
  const positioningCount = countTrueSignals(positioningSignals);
  const investorCount = countInvSignals(investorSignals);

  const positioningSignalStrength = calculateSignalStrength(positioningCount, 4);
  const investorSignalStrength = calculateSignalStrength(investorCount, 5);

  // Determine if frameworks should be introduced
  const shouldIntroducePositioning =
    needsPositioningFramework(positioningSignals) &&
    !needsInvestorLens(investorSignals); // Positioning takes precedence if no investor signals

  const shouldIntroduceInvestor = needsInvestorLens(investorSignals);

  // Determine current mode
  let currentMode: DiagnosticMode = "founder-os";
  if (shouldIntroduceInvestor) {
    currentMode = "investor-readiness";
  } else if (shouldIntroducePositioning) {
    currentMode = "positioning";
  }

  return {
    currentMode,
    positioningSignalStrength,
    investorSignalStrength,
    positioningSignals,
    investorSignals,
    shouldIntroducePositioning,
    shouldIntroduceInvestor,
    introductionDelivered: {
      positioning: false,
      investor: false,
    },
  };
}

export function getIntroductionText(
  state: DiagnosticState
): string | null {
  if (state.shouldIntroduceInvestor && !state.introductionDelivered.investor) {
    return INVESTOR_LENS_INTRODUCTION;
  }

  if (
    state.shouldIntroducePositioning &&
    !state.introductionDelivered.positioning
  ) {
    return POSITIONING_INTRODUCTION_LANGUAGE;
  }

  return null;
}

export function getActiveFrameworkPrompt(state: DiagnosticState): string {
  switch (state.currentMode) {
    case "positioning":
      return generatePositioningPrompt();
    case "investor-readiness":
      return generateInvestorLensPrompt();
    case "founder-os":
    default:
      return generateFullProcessPrompt();
  }
}

export function generateDiagnosticSystemPrompt(
  basePrompt: string,
  state: DiagnosticState
): string {
  const frameworkPrompt = getActiveFrameworkPrompt(state);

  const diagnosticInstructions = `
## DIAGNOSTIC INTRODUCTION FLOW (INTERNAL)

### Current Diagnostic State
- **Mode**: ${state.currentMode}
- **Positioning Signal Strength**: ${state.positioningSignalStrength}
- **Investor Signal Strength**: ${state.investorSignalStrength}

### Core Principle
Founders do not choose diagnostics.
The system diagnoses silently, then introduces the right lens at the right moment.
Everyone is treated the same at first interaction.
Differentiation happens through analysis, not onboarding choice.

### Phase 1: Universal Entry (All Founders)
At first interaction, always begin with open context gathering:
- What are you building?
- Who is it for?
- What are you trying to accomplish right now?

Do NOT mention:
- Investor readiness
- Positioning frameworks
- Scores or assessments

### Phase 2: Silent Diagnosis (Internal Only)
While engaging the founder, continuously assess:

**Positioning Signals:**
- ICP vague or undefined
- "Everyone" as target market
- Messaging sounds generic or buzzword-heavy
- Founder effort high but traction low

**Investor Readiness Signals:**
- Founder mentions fundraising, valuation, or decks
- Deck is uploaded or referenced
- Founder asks "are we ready to raise?"

If neither signal is strong, remain in Founder Decision OS mode.

### Phase 3: Explicit Introduction (Selective)
Introduce only ONE framework at a time.

**A) When to Introduce POSITIONING**
Introduce when:
- ICP or buyer is unclear
- Founder struggles to explain value crisply
- Traction is weak despite activity

Language to use:
"Before we talk about scaling or investors, we need to get clear on how this is positioned. Right now, it's hard to tell who this is for and why they'd choose it."

Do NOT frame this as marketing or branding.

**B) When to Introduce INVESTOR READINESS**
Introduce only when:
- Founder explicitly discusses fundraising
- Founder uploads a deck
- Founder asks about investor interest or valuation

Language to use:
"We can evaluate this the way investors actually will. That includes a clear verdict — yes, no, or not yet — and why."

Do NOT encourage fundraising.
Do NOT soften verdicts.
`;

  return `${basePrompt}

${diagnosticInstructions}

---

## ACTIVE FRAMEWORK
${frameworkPrompt}
`;
}

export interface DiagnosticAnalysis {
  state: DiagnosticState;
  systemPrompt: string;
  introduction: string | null;
}

export function runDiagnosticAnalysis(
  basePrompt: string,
  context: ConversationContext
): DiagnosticAnalysis {
  const state = analyzeConversation(context);
  const systemPrompt = generateDiagnosticSystemPrompt(basePrompt, state);
  const introduction = getIntroductionText(state);

  return {
    state,
    systemPrompt,
    introduction,
  };
}

// ============================================================================
// Phase 38: Persisted Mode Transition Support
// ============================================================================

import type { ModeContext } from "@/lib/db/conversation-state";

/**
 * How many consecutive messages without signals before exiting a mode.
 * 5 consecutive quiet messages prevents premature exit from frameworks
 * that naturally have question-answer gaps.
 */
const MODE_EXIT_THRESHOLD = 5;

/** Minimum number of framework signals required to trigger a mode transition */
const MIN_SIGNALS_TO_TRANSITION = 2;

export interface ModeTransitionResult {
  /** The mode FRED should be in after this message */
  newMode: DiagnosticMode;
  /** Whether a transition occurred */
  transitioned: boolean;
  /** Direction of transition */
  direction: "enter" | "exit" | "none";
  /** Which framework was entered or exited */
  framework: "positioning" | "investor" | null;
  /** Whether the introduction needs to be delivered */
  needsIntroduction: boolean;
  /** Signals detected in this message */
  detectedSignals: string[];
  /** Confidence score (0-1) based on detected signals / total possible signals */
  signalConfidence: number;
  /** Updated mode context (caller persists this) */
  updatedModeContext: ModeContext;
}

/**
 * Determine mode transition based on current message + persisted state.
 *
 * Rules:
 * 1. Investor signals override everything (investor > positioning > founder-os)
 * 2. Entering a mode requires MIN_SIGNALS_TO_TRANSITION (2+) signals from framework functions
 * 3. Sliding window: at least 1 recent signal in the last 3 history entries for the target framework
 * 4. Exiting a mode requires MODE_EXIT_THRESHOLD (5) consecutive quiet messages
 * 5. Introduction is needed only if the framework hasn't been introduced yet
 */
export function determineModeTransition(
  currentMessage: string,
  currentMode: DiagnosticMode,
  modeContext: ModeContext,
  hasUploadedDeck: boolean = false
): ModeTransitionResult {
  // Detect signals in current message only (not all history)
  const posSignals = detectPositioningSignals(currentMessage);
  const invSignals = detectInvestorSignals(currentMessage, hasUploadedDeck);

  const hasPositioningSignals = needsPositioningFramework(posSignals);
  const hasInvestorSignals = needsInvestorLens(invSignals);

  // Build signal list for history
  const detectedSignals: string[] = [];
  if (posSignals.icpVagueOrUndefined) detectedSignals.push("icp_vague");
  if (posSignals.everyoneAsTarget) detectedSignals.push("everyone_target");
  if (posSignals.genericMessaging) detectedSignals.push("generic_messaging");
  if (posSignals.highEffortLowTraction) detectedSignals.push("high_effort_low_traction");
  if (invSignals.mentionsFundraising) detectedSignals.push("mentions_fundraising");
  if (invSignals.mentionsValuation) detectedSignals.push("mentions_valuation");
  if (invSignals.mentionsDeck) detectedSignals.push("mentions_deck");
  if (invSignals.asksAboutReadiness) detectedSignals.push("asks_readiness");
  if (invSignals.uploadedDeck) detectedSignals.push("uploaded_deck");

  // Clone mode context for mutation
  const updatedContext: ModeContext = JSON.parse(JSON.stringify(modeContext));

  // Add to signal history
  if (detectedSignals.length > 0) {
    const framework = hasInvestorSignals ? "investor" : "positioning";
    updatedContext.signalHistory.push({
      signal: detectedSignals.join(","),
      framework,
      detectedAt: new Date().toISOString(),
      context: currentMessage.substring(0, 100),
    });
    updatedContext.quietCount = 0;
  } else {
    updatedContext.quietCount = (updatedContext.quietCount || 0) + 1;
  }

  // --- Sliding window confidence check ---
  // Look at the last 3 entries in signal history to prevent single-message bursts
  // from triggering mode entry. Requires at least 1 recent signal for the target
  // framework in the sliding window (or the current message must have strong signals).
  const recentHistory = updatedContext.signalHistory.slice(-3);

  // --- Mode transition logic ---

  let newMode: DiagnosticMode = currentMode;
  let transitioned = false;
  let direction: "enter" | "exit" | "none" = "none";
  let framework: "positioning" | "investor" | null = null;

  // Case 1: Investor signals detected — enter investor mode (highest priority)
  if (hasInvestorSignals && currentMode !== "investor-readiness") {
    // Sliding window: allow if uploadedDeck OR at least 1 recent investor signal in history
    const recentInvestorSignals = recentHistory.filter(
      (h) => h.framework === "investor"
    ).length;
    if (invSignals.uploadedDeck || recentInvestorSignals >= 1) {
      newMode = "investor-readiness";
      transitioned = true;
      direction = "enter";
      framework = "investor";
      updatedContext.activatedAt = new Date().toISOString();
      updatedContext.activatedBy = "signal_detected";
    }
  }
  // Case 2: Positioning signals detected — enter positioning mode (only if not in investor)
  else if (hasPositioningSignals && currentMode === "founder-os") {
    // Sliding window: allow if at least 1 recent positioning signal in history
    const recentPositioningSignals = recentHistory.filter(
      (h) => h.framework === "positioning"
    ).length;
    if (recentPositioningSignals >= 1) {
      newMode = "positioning";
      transitioned = true;
      direction = "enter";
      framework = "positioning";
      updatedContext.activatedAt = new Date().toISOString();
      updatedContext.activatedBy = "signal_detected";
    }
  }
  // Case 3: No signals for a while — consider exiting to founder-os
  else if (
    currentMode !== "founder-os" &&
    !hasInvestorSignals &&
    !hasPositioningSignals &&
    updatedContext.quietCount >= MODE_EXIT_THRESHOLD
  ) {
    newMode = "founder-os";
    transitioned = true;
    direction = "exit";
    framework = currentMode === "investor-readiness" ? "investor" : "positioning";
    updatedContext.activatedAt = null;
    updatedContext.activatedBy = null;
    updatedContext.quietCount = 0;
  }

  // Determine if introduction is needed
  let needsIntroduction = false;
  if (transitioned && direction === "enter" && framework) {
    const introState = updatedContext.introductionState[framework];
    needsIntroduction = !introState.introduced;
  }

  // Calculate signal confidence for observability
  // 4 possible positioning signals, 5 possible investor signals
  const posCount = countPositioningSignals(posSignals);
  const invCount = countInvestorSignalsFromFramework(invSignals);
  let signalConfidence = 0;
  if (hasInvestorSignals) {
    signalConfidence = invCount / 5;
  } else if (hasPositioningSignals) {
    signalConfidence = posCount / 4;
  }

  return {
    newMode,
    transitioned,
    direction,
    framework,
    needsIntroduction,
    detectedSignals,
    signalConfidence,
    updatedModeContext: updatedContext,
  };
}
