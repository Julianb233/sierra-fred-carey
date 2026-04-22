/**
 * Founder Report Types
 *
 * Generated from the 9-step Fred Cary Startup Process. Shape mirrors
 * the JSON schema we ask Claude to return so the renderer is fully
 * declarative.
 */

import type { StartupStep } from "@/lib/ai/frameworks/startup-process";

export type StepStatus = "validated" | "tightening" | "blocking" | "not_started";

export type ReportTier = "clarity" | "validate" | "accelerator";

export interface StepReport {
  stepNumber: number;
  step: StartupStep;
  name: string;
  status: StepStatus;
  /** One-paragraph summary of what the founder answered (in their own language). */
  answerSummary: string;
  /** Fred-voice 1-2 paragraph verdict + recommendation. */
  verdict: string;
  /** Optional callout box (only for amber/red steps). */
  killboxText?: string;
}

export interface ReportPayload {
  /** 0-100 process score. */
  score: number;
  /** Short headline verdict (e.g. "Earns the right to scale."). */
  verdictHeadline: string;
  /** Sub-text below headline (e.g. "7 of 9 steps validated. 2 need tightening."). */
  verdictSubline: string;
  /** Single-paragraph executive summary in Fred's voice. */
  executiveSummary: string;
  /** All 9 step reports, in order. */
  steps: StepReport[];
  /** Recommended next-tier upgrade based on score. */
  recommendedTier: ReportTier;
  /** Optional: a 1-2 sentence "What's next" pitch tailored to the founder. */
  nextPitch?: string;
}

export interface GenerateReportResult {
  success: boolean;
  reportId?: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

export const TIER_PRICE_CENTS: Record<ReportTier, number> = {
  clarity: 2900,
  validate: 4900,
  accelerator: 9900,
};

export const TIER_LABEL: Record<ReportTier, string> = {
  clarity: "Sahara Clarity",
  validate: "Sahara Validate",
  accelerator: "Sahara Accelerator",
};
