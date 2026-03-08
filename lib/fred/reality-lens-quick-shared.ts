/**
 * Quick Reality Lens -- Shared Types & Questions
 *
 * Client-safe module: no server-only imports.
 * Used by both the client UI page and the server-side assessment logic.
 *
 * Phase 81: Reality Lens First Interaction
 */

import type { OasesStage } from "@/types/oases"

// ============================================================================
// Types
// ============================================================================

export interface QuickAnswers {
  /** Q1: "Describe your startup idea in 2-3 sentences" */
  idea: string
  /** Q2: "Who is your target customer?" */
  targetCustomer: string
  /** Q3: "How will you make money?" */
  revenueModel: "subscription" | "marketplace" | "services" | "ads" | "other"
  /** Q4: "Have you talked to potential customers?" */
  customerValidation:
    | "none"
    | "informal"
    | "interviews-10plus"
    | "paying-customers"
  /** Q5: "Do you have a working prototype?" */
  prototypeStage: "idea-only" | "mockups" | "mvp" | "launched"
  /** Q6: "What is your biggest challenge right now?" */
  biggestChallenge: string
}

export interface QuickAssessmentResult {
  /** Overall readiness score 0-100 */
  overallScore: number
  /** Mapped Oases stage */
  stage: OasesStage
  /** 3-5 items: areas the founder needs to figure out */
  gaps: string[]
  /** 2-3 items: what is working for the founder */
  strengths: string[]
  /** Single recommended next step */
  nextAction: string
  /** Human-readable verdict, e.g. "Early Stage - Focus on Clarity" */
  verdictLabel: string
}

// ============================================================================
// Question Definitions
// ============================================================================

export interface QuickQuestion {
  id: keyof QuickAnswers
  question: string
  type: "text" | "select"
  placeholder?: string
  options?: { value: string; label: string }[]
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: "idea",
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
      { value: "none", label: "Not yet" },
      { value: "informal", label: "Informal conversations" },
      { value: "interviews-10plus", label: "10+ structured interviews" },
      { value: "paying-customers", label: "Already have paying customers" },
    ],
  },
  {
    id: "prototypeStage",
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
]
