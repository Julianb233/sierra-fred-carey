/**
 * Fred Cary Startup Process Framework
 * 9-step gating process from idea to traction
 *
 * Core Principle: Never optimize downstream artifacts before upstream truth is established.
 */

export type StartupStep =
  | "problem"
  | "buyer"
  | "founder-edge"
  | "solution"
  | "validation"
  | "gtm"
  | "execution"
  | "pilot"
  | "scale-decision";

export type StepStatus = "not_started" | "in_progress" | "validated" | "blocked" | "skipped";

export interface StepValidation {
  step: StartupStep;
  status: StepStatus;
  requiredOutput: string | null;
  killSignals: string[];
  advanceConditions: string[];
  blockers: string[];
}

export interface StartupProcessState {
  currentStep: StartupStep;
  steps: Record<StartupStep, StepValidation>;
  canAdvance: boolean;
  blockedReason: string | null;
}

export const STARTUP_STEPS: Record<
  StartupStep,
  {
    name: string;
    objective: string;
    questions: string[];
    requiredOutput: string;
    doNotAdvanceIf: string[];
    stepNumber: number;
  }
> = {
  problem: {
    name: "Define the Real Problem",
    stepNumber: 1,
    objective:
      "Clearly articulate the problem being solved, separate from any solution.",
    questions: [
      "Who specifically experiences this problem?",
      "How often does it occur?",
      "Why does it matter enough to change behavior or spend money?",
    ],
    requiredOutput:
      "A one-sentence problem statement written in the customer's language.",
    doNotAdvanceIf: [
      "The problem is vague, abstract, or generic",
      "The problem sounds like a feature description",
    ],
  },
  buyer: {
    name: "Identify the Buyer and Environment",
    stepNumber: 2,
    objective:
      "Clarify who buys, who uses, and the context in which the problem exists.",
    questions: [
      "Who is the economic buyer?",
      "Who is the user (if different)?",
      "What environment or workflow does this live in?",
    ],
    requiredOutput:
      "A clear definition of buyer vs user. The environment where the solution must fit.",
    doNotAdvanceIf: [
      '"Everyone" is the target',
      "The buyer is unclear or hypothetical",
    ],
  },
  "founder-edge": {
    name: "Establish Founder Edge",
    stepNumber: 3,
    objective:
      "Understand why this founder (or team) is credible to solve this problem.",
    questions: [
      "What lived experience, insight, or unfair advantage exists?",
      "What do you know that others don't?",
    ],
    requiredOutput: "A concise statement of founder-market fit.",
    doNotAdvanceIf: [
      "The founder has no credible path to insight, access, or learning velocity",
    ],
  },
  solution: {
    name: "Define the Simplest Viable Solution",
    stepNumber: 4,
    objective:
      "Articulate the smallest solution that meaningfully solves the core problem.",
    questions: [
      "What is the simplest version that delivers value?",
      "What is explicitly not included yet?",
    ],
    requiredOutput: "A plain-English description of the first solution.",
    doNotAdvanceIf: [
      "The solution is overbuilt or unfocused",
      "The solution tries to solve multiple problems at once",
    ],
  },
  validation: {
    name: "Validate Before Building",
    stepNumber: 5,
    objective:
      "Test demand, willingness to pay, and behavior before heavy build-out.",
    questions: [
      "What is the fastest/cheapest way to test this?",
      "What signal would prove this problem is real?",
    ],
    requiredOutput:
      "Evidence of demand (conversations, LOIs, pilots, pre-orders, usage).",
    doNotAdvanceIf: [
      "Validation is theoretical",
      "No real user or buyer interaction has occurred",
    ],
  },
  gtm: {
    name: "Define the First Go-To-Market Motion",
    stepNumber: 6,
    objective: "Identify how the first customers will actually be reached.",
    questions: [
      "How does this reach buyers in practice?",
      "What channel works now, not later?",
    ],
    requiredOutput: "One clear initial distribution path.",
    doNotAdvanceIf: [
      "Distribution is hand-waved",
      "GTM depends on scale, brand, or future capital",
    ],
  },
  execution: {
    name: "Install Execution Discipline",
    stepNumber: 7,
    objective: "Create focus and momentum through simple execution cadence.",
    questions: [
      "What matters this week?",
      "What decision cannot be avoided?",
    ],
    requiredOutput: "Weekly priorities. Clear ownership.",
    doNotAdvanceIf: ["Work is reactive or scattered"],
  },
  pilot: {
    name: "Run a Contained Pilot",
    stepNumber: 8,
    objective: "Operate a small, real-world test of the solution.",
    questions: [
      "What does success look like in a pilot?",
      "What will we measure?",
    ],
    requiredOutput:
      "Pilot results with qualitative and quantitative feedback.",
    doNotAdvanceIf: ["Results are inconclusive or ignored"],
  },
  "scale-decision": {
    name: "Decide What Earns the Right to Scale",
    stepNumber: 9,
    objective: "Determine whether to double down, iterate, or stop.",
    questions: [
      "What worked?",
      "What didn't?",
      "What must be true before scaling or fundraising?",
    ],
    requiredOutput: "A clear decision: proceed, adjust, or stop.",
    doNotAdvanceIf: ["Decisions are based on hope instead of evidence"],
  },
};

export const STEP_ORDER: StartupStep[] = [
  "problem",
  "buyer",
  "founder-edge",
  "solution",
  "validation",
  "gtm",
  "execution",
  "pilot",
  "scale-decision",
];

export function getNextStep(currentStep: StartupStep): StartupStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

export function getPreviousStep(currentStep: StartupStep): StartupStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

export function createInitialState(): StartupProcessState {
  const steps: Record<StartupStep, StepValidation> = {} as Record<
    StartupStep,
    StepValidation
  >;

  for (const step of STEP_ORDER) {
    steps[step] = {
      step,
      status: step === "problem" ? "in_progress" : "not_started",
      requiredOutput: null,
      killSignals: [],
      advanceConditions: [],
      blockers: [],
    };
  }

  return {
    currentStep: "problem",
    steps,
    canAdvance: false,
    blockedReason: null,
  };
}

export function generateStepPrompt(step: StartupStep): string {
  const stepConfig = STARTUP_STEPS[step];
  return `
## Step ${stepConfig.stepNumber}: ${stepConfig.name}

**Objective**: ${stepConfig.objective}

**Key Questions**:
${stepConfig.questions.map((q) => `- ${q}`).join("\n")}

**Required Output**: ${stepConfig.requiredOutput}

**Do Not Advance If**:
${stepConfig.doNotAdvanceIf.map((d) => `- ${d}`).join("\n")}
`;
}

export function generateFullProcessPrompt(): string {
  return `
# FRED CARY STARTUP PROCESS (IDEA → TRACTION)

## Core Principle
Never optimize downstream artifacts (decks, patents, hiring, fundraising, scaling) before upstream truth is established.

Upstream truth = feasibility, demand, economics, and distribution clarity.

If a step is weak or unproven, stop and resolve it before proceeding.

---

${STEP_ORDER.map((step) => generateStepPrompt(step)).join("\n---\n")}

---

## How This Process Is Used
- This process is the default for early-stage founders
- Steps may overlap, but none should be skipped
- The goal is clarity and momentum, not speed for its own sake
- This process exists to protect founders from premature scaling, wasted capital, and avoidable failure
`;
}
