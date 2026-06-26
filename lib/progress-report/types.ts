/**
 * Automated Founder Progress Report — Types (AI-7489)
 *
 * Two layers:
 *  1. FounderProgressSnapshot — the deterministic, LLM-free aggregation of a
 *     founder's position in the program (Oases stages, startup-process steps,
 *     milestones, recent events). This is auditable and stored alongside the
 *     report so we can reproduce/debug narration without re-running Claude.
 *  2. ProgressReportPayload — the narrated, FRED-voice report Claude produces
 *     FROM the snapshot. The renderer is fully declarative over this shape.
 */

import type { OasesStage } from "@/types/oases";

export type ReportTier = "clarity" | "validate" | "accelerator";

// ---------------------------------------------------------------------------
// Snapshot (deterministic aggregation — no LLM)
// ---------------------------------------------------------------------------

export interface StageProgressSnapshot {
  id: OasesStage;
  name: string;
  status: "completed" | "current" | "locked";
  stepsCompleted: number;
  stepsTotal: number;
}

export interface ProgramStepSnapshot {
  /** 1-based position in the overall program. */
  number: number;
  name: string;
  stage: OasesStage;
  completed: boolean;
}

export interface MilestoneSnapshot {
  title: string;
  category: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt: string | null;
}

export interface JourneyEventSnapshot {
  eventType: string;
  createdAt: string;
  scoreAfter: number | null;
}

export interface FounderProgressSnapshot {
  founderName: string;
  companyName: string | null;
  currentStage: OasesStage;
  currentStageName: string;

  /** Overall program completion percentage (0-100). */
  overallPercentage: number;
  /** Completed vs total across the whole program. */
  stepsCompleted: number;
  stepsTotal: number;

  stages: StageProgressSnapshot[];
  /** Flattened program steps in order (the "19-step program" view). */
  programSteps: ProgramStepSnapshot[];

  /** 9-step Fred Cary startup process completion (idea readiness flow). */
  startupProcess: {
    currentStep: number;
    completedSteps: number;
    totalSteps: number;
    stepNames: { number: number; name: string; completed: boolean }[];
  } | null;

  milestones: {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    recent: MilestoneSnapshot[];
  };

  /** Latest investor-readiness style score if present in journey events. */
  latestScore: number | null;
  /** Score at the start of the covered period, for deltas. */
  priorScore: number | null;

  recentEvents: JourneyEventSnapshot[];
  /** Number of distinct active days in the covered period. */
  activeDays: number;

  periodStart: string | null;
  periodEnd: string;
}

// ---------------------------------------------------------------------------
// Narrated report payload (Claude output)
// ---------------------------------------------------------------------------

export interface ProgressSectionReport {
  /** Stage or theme this section narrates (e.g. "Clarity", "Momentum"). */
  title: string;
  /** 1-2 paragraph FRED-voice narrative of what the founder accomplished. */
  body: string;
  /** Optional status pill shown next to the title. */
  status?: "ahead" | "on_track" | "stalled" | "not_started";
}

export interface ProgressReportPayload {
  /** 0-100 overall program completion (echo of snapshot, LLM may not change). */
  overallPercentage: number;
  /** Short momentum headline, e.g. "Strong momentum through Validation.". */
  headline: string;
  /** Sub-text, e.g. "9 of 19 program steps complete — 3 new this week.". */
  subline: string;
  /** Single-paragraph FRED-voice executive summary of overall progress. */
  executiveSummary: string;
  /** Per-stage / per-theme narrative sections, in order. */
  sections: ProgressSectionReport[];
  /** 2-4 concrete, prioritized next actions to keep momentum. */
  nextActions: string[];
  /** Recommended next-tier upgrade based on progress + momentum. */
  recommendedTier: ReportTier;
  /** 1-2 sentence tailored upgrade pitch tied to where they are. */
  upgradePitch: string;
}

export interface GenerateProgressReportResult {
  success: boolean;
  reportId?: string;
  status: "pending" | "generating" | "completed" | "failed";
  overallPercentage?: number;
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
