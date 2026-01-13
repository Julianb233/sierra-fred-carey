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
  type PositioningSignals,
  POSITIONING_INTRODUCTION_LANGUAGE,
  generatePositioningPrompt,
} from "./frameworks/positioning";

import {
  detectInvestorSignals,
  needsInvestorLens,
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
  return Object.values(signals).filter(Boolean).length;
}

function countInvestorSignals(signals: InvestorReadinessSignals): number {
  return Object.values(signals).filter(Boolean).length;
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
  const investorCount = countInvestorSignals(investorSignals);

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
