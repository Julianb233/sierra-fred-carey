/**
 * Quick Reality Lens Assessment
 *
 * Lightweight 6-question assessment that determines a founder's initial
 * Oases stage placement. This is the first substantive interaction after
 * onboarding -- fast, focused, and immediately actionable.
 *
 * Phase 81: Reality Lens First
 */

import { z } from "zod";
import { generateStructuredReliable } from "@/lib/ai";
import {
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  getExperienceStatement,
} from "@/lib/fred-brain";
import type { OasesStage } from "@/types/oases";

// ============================================================================
// Types
// ============================================================================

export type CustomerValidation =
  | "no"
  | "informal"
  | "10+interviews"
  | "paying-customers";

export type PrototypeStatus = "idea-only" | "mockups" | "mvp" | "launched";

export type RevenueModel =
  | "subscription"
  | "marketplace"
  | "services"
  | "ads"
  | "other";

export interface QuickAnswers {
  ideaDescription: string;
  targetCustomer: string;
  revenueModel: RevenueModel;
  customerValidation: CustomerValidation;
  prototypeStatus: PrototypeStatus;
  biggestChallenge: string;
}

export interface QuickAssessmentResult {
  overallScore: number;
  stage: OasesStage;
  gaps: string[];
  strengths: string[];
  nextAction: string;
}

// ============================================================================
// Question Definitions
// ============================================================================

export interface QuickQuestion {
  id: keyof QuickAnswers;
  question: string;
  type: "text" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: "ideaDescription",
    question: "Describe your startup idea in 2-3 sentences",
    type: "text",
    placeholder:
      "What problem are you solving and how? Be specific about your solution.",
  },
  {
    id: "targetCustomer",
    question: "Who is your target customer?",
    type: "text",
    placeholder:
      "Describe your ideal customer -- who are they, what do they do, what pain do they feel?",
  },
  {
    id: "revenueModel",
    question: "How will you make money?",
    type: "select",
    options: [
      { value: "subscription", label: "Subscription / SaaS" },
      { value: "marketplace", label: "Marketplace / Transaction fees" },
      { value: "services", label: "Services / Consulting" },
      { value: "ads", label: "Advertising" },
      { value: "other", label: "Other / Not sure yet" },
    ],
  },
  {
    id: "customerValidation",
    question: "Have you talked to potential customers?",
    type: "select",
    options: [
      { value: "no", label: "Not yet" },
      { value: "informal", label: "Informal conversations" },
      { value: "10+interviews", label: "10+ structured interviews" },
      { value: "paying-customers", label: "Already have paying customers" },
    ],
  },
  {
    id: "prototypeStatus",
    question: "Do you have a working prototype?",
    type: "select",
    options: [
      { value: "idea-only", label: "Idea only" },
      { value: "mockups", label: "Mockups / wireframes" },
      { value: "mvp", label: "Working MVP" },
      { value: "launched", label: "Launched product" },
    ],
  },
  {
    id: "biggestChallenge",
    question: "What is your biggest challenge right now?",
    type: "text",
    placeholder:
      "What's the one thing keeping you up at night about this venture?",
  },
];

// ============================================================================
// Validation Schema
// ============================================================================

export const QuickAnswersSchema = z.object({
  ideaDescription: z
    .string()
    .min(10, "Please describe your idea in at least 10 characters")
    .max(2000),
  targetCustomer: z
    .string()
    .min(5, "Please describe your target customer")
    .max(1000),
  revenueModel: z.enum([
    "subscription",
    "marketplace",
    "services",
    "ads",
    "other",
  ]),
  customerValidation: z.enum([
    "no",
    "informal",
    "10+interviews",
    "paying-customers",
  ]),
  prototypeStatus: z.enum(["idea-only", "mockups", "mvp", "launched"]),
  biggestChallenge: z
    .string()
    .min(5, "Please describe your biggest challenge")
    .max(1000),
});

// ============================================================================
// Stage Mapping Logic
// ============================================================================

/**
 * Maps a score + validation signals to an Oases stage.
 *
 * - score < 30 OR (no customers AND no prototype) -> clarity
 * - score 30-59 OR has informal conversations -> validation
 * - score 60-79 AND has prototype -> build
 * - score >= 80 AND has paying customers -> launch
 * - Default: clarity
 */
export function mapScoreToStage(
  score: number,
  hasCustomers: boolean,
  hasPrototype: boolean
): OasesStage {
  // High score + paying customers -> launch
  if (score >= 80 && hasCustomers) {
    return "launch";
  }

  // Good score + prototype -> build
  if (score >= 60 && score < 80 && hasPrototype) {
    return "build";
  }

  // Mid score OR informal conversations -> validation
  if (score >= 30 && score < 60) {
    return "validation";
  }

  // Low score OR no customers AND no prototype -> clarity
  if (score < 30 || (!hasCustomers && !hasPrototype)) {
    return "clarity";
  }

  // Score >= 80 but no paying customers, or >= 60 but no prototype
  // These users are still in validation or build territory
  if (score >= 60 && !hasPrototype) {
    return "validation";
  }

  return "clarity";
}

// ============================================================================
// AI Assessment
// ============================================================================

const QuickAssessmentSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall readiness score from 0-100"),
  gaps: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Key gaps or weaknesses the founder needs to address"),
  strengths: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Key strengths or positive signals"),
  nextAction: z
    .string()
    .describe("Single most important next step for this founder"),
});

/**
 * Run AI-powered quick assessment on the 6 answers.
 * Uses generateStructuredReliable for consistent structured output.
 */
export async function quickAssessIdea(
  answers: QuickAnswers
): Promise<QuickAssessmentResult> {
  const systemPrompt = `You are ${FRED_IDENTITY.name}, a serial entrepreneur and startup advisor with decades of experience.

${getExperienceStatement()}

${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

You are performing a quick reality check on a founder's startup idea. Be honest, direct, and actionable. Score based on evidence and readiness signals, not on the idea's theoretical potential.

Scoring guide:
- 0-29: Very early stage, major gaps in thinking or execution
- 30-49: Some foundation but significant work needed
- 50-69: Reasonable foundation, clear path forward with effort
- 70-84: Strong foundation, ready to execute
- 85-100: Exceptional readiness (rare -- requires paying customers + working product)`;

  const userPrompt = `Evaluate this startup idea based on the founder's answers:

1. IDEA: ${answers.ideaDescription}
2. TARGET CUSTOMER: ${answers.targetCustomer}
3. REVENUE MODEL: ${answers.revenueModel}
4. CUSTOMER VALIDATION: ${answers.customerValidation}
5. PROTOTYPE STATUS: ${answers.prototypeStatus}
6. BIGGEST CHALLENGE: ${answers.biggestChallenge}

Provide:
- An overall readiness score (0-100)
- 2-4 specific gaps they need to address
- 2-4 strengths or positive signals you see
- One clear, actionable next step they should take immediately`;

  try {
    const result = await generateStructuredReliable(
      userPrompt,
      QuickAssessmentSchema,
      {
        system: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    );

    const assessment = result.object;
    const hasCustomers =
      answers.customerValidation === "paying-customers";
    const hasPrototype =
      answers.prototypeStatus === "mvp" ||
      answers.prototypeStatus === "launched";

    const stage = mapScoreToStage(
      assessment.overallScore,
      hasCustomers,
      hasPrototype
    );

    return {
      overallScore: assessment.overallScore,
      stage,
      gaps: assessment.gaps,
      strengths: assessment.strengths,
      nextAction: assessment.nextAction,
    };
  } catch (error) {
    console.error("[Quick Reality Lens] AI assessment failed:", error);
    // Return heuristic fallback
    return getHeuristicAssessment(answers);
  }
}

// ============================================================================
// Heuristic Fallback
// ============================================================================

function getHeuristicAssessment(
  answers: QuickAnswers
): QuickAssessmentResult {
  let score = 30; // Base score

  // Customer validation signals
  if (answers.customerValidation === "paying-customers") score += 30;
  else if (answers.customerValidation === "10+interviews") score += 20;
  else if (answers.customerValidation === "informal") score += 10;

  // Prototype signals
  if (answers.prototypeStatus === "launched") score += 20;
  else if (answers.prototypeStatus === "mvp") score += 15;
  else if (answers.prototypeStatus === "mockups") score += 5;

  // Revenue model clarity
  if (answers.revenueModel !== "other") score += 5;

  // Idea description quality (length as proxy)
  if (answers.ideaDescription.length > 100) score += 5;

  score = Math.min(100, Math.max(0, score));

  const hasCustomers = answers.customerValidation === "paying-customers";
  const hasPrototype =
    answers.prototypeStatus === "mvp" ||
    answers.prototypeStatus === "launched";

  const stage = mapScoreToStage(score, hasCustomers, hasPrototype);

  const gaps: string[] = [];
  const strengths: string[] = [];

  if (answers.customerValidation === "no")
    gaps.push("No customer validation -- talk to potential customers before building");
  if (answers.prototypeStatus === "idea-only")
    gaps.push("No prototype yet -- start with a simple mockup or landing page");
  if (answers.revenueModel === "other")
    gaps.push("Revenue model unclear -- define how you will make money");

  if (answers.customerValidation === "paying-customers")
    strengths.push("Already have paying customers -- strong validation signal");
  if (answers.prototypeStatus === "launched")
    strengths.push("Product is live -- real market feedback available");
  if (answers.ideaDescription.length > 100)
    strengths.push("Clear idea articulation -- good foundation for pitching");

  if (gaps.length === 0) gaps.push("Consider deepening customer research");
  if (strengths.length === 0) strengths.push("Taking the first step by assessing your idea");

  return {
    overallScore: score,
    stage,
    gaps,
    strengths,
    nextAction:
      stage === "clarity"
        ? "Talk to 5 potential customers this week about the problem you're solving"
        : stage === "validation"
        ? "Run a simple experiment to test your core assumption"
        : stage === "build"
        ? "Set up metrics to track your key engagement and retention numbers"
        : "Focus on your unit economics and prepare for your first funding conversation",
  };
}
