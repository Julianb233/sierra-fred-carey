/**
 * Command Center Data Aggregation
 *
 * Provides all data needed by the Founder Command Center dashboard
 * in a single orchestrated call. Reads from fred_conversation_state,
 * fred_step_evidence, profiles, and sms_checkins.
 */

import { createServiceClient } from "@/lib/supabase/server";
import {
  getOrCreateConversationState,
  type ConversationState,
  type DiagnosticTags,
  type FounderSnapshot,
} from "@/lib/db/conversation-state";
import {
  STARTUP_STEPS,
  STEP_ORDER,
  type StartupStep,
  type StepStatus,
} from "@/lib/ai/frameworks/startup-process";

// ============================================================================
// Types — these define the API response shape consumed by the frontend
// ============================================================================

export interface FounderSnapshotData {
  name: string | null;
  stage: string | null;
  primaryConstraint: string | null;
  ninetyDayGoal: string | null;
  runway: { time?: string; money?: string; energy?: string } | null;
  industry: string | null;
  productStatus: string | null;
  traction: string | null;
  lastUpdatedAt: string | null;
}

export interface CurrentStepInfo {
  stepKey: StartupStep;
  stepNumber: number;
  name: string;
  objective: string;
  questions: string[];
  requiredOutput: string;
  status: StepStatus;
  blockers: string[];
}

export interface StepProgressEntry {
  stepKey: StartupStep;
  stepNumber: number;
  name: string;
  status: StepStatus;
  evidenceCount: number;
}

export interface ProcessProgressData {
  currentStep: StartupStep;
  processStatus: string;
  steps: StepProgressEntry[];
  totalSteps: number;
  completedSteps: number;
}

export type ReadinessZone = "red" | "yellow" | "green";

export interface FundingReadinessData {
  zone: ReadinessZone;
  label: string;
  topBlockers: string[];
  hasIntakeCompleted: boolean;
  investorReadinessSignal: string | null;
  /** IRS overall score (0-100) when available */
  irsScore: number | null;
  /** Top IRS recommendations for action items */
  irsRecommendations: Array<{ action: string; category: string }>;
}

export interface WeeklyMomentumData {
  lastCheckinSummary: string | null;
  lastCheckinDate: string | null;
  streak: number;
  totalCheckins: number;
}

export interface DisplayRules {
  showFundingGauge: boolean;
  blurReadiness: boolean;
  showConstraintOverPositioning: boolean;
  highStressDetected: boolean;
}

export interface CommandCenterData {
  founderSnapshot: FounderSnapshotData;
  currentStep: CurrentStepInfo;
  processProgress: ProcessProgressData;
  fundingReadiness: FundingReadinessData;
  weeklyMomentum: WeeklyMomentumData;
  diagnosticTags: DiagnosticTags;
  displayRules: DisplayRules;
}

// ============================================================================
// Individual Data Functions
// ============================================================================

/**
 * Merges fred_conversation_state.founder_snapshot with profiles table data.
 * Profile data provides the baseline; conversation state overrides with
 * more recent FRED-observed values.
 */
export async function getFounderSnapshot(
  userId: string,
  state: ConversationState
): Promise<FounderSnapshotData> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "name, stage, primary_constraint, ninety_day_goal, runway, industry, product_status, traction"
    )
    .eq("id", userId)
    .single();

  const snap: FounderSnapshot = state.founderSnapshot || {};

  return {
    name: profile?.name ?? null,
    stage: snap.stage || profile?.stage || null,
    primaryConstraint:
      snap.primaryConstraint || profile?.primary_constraint || null,
    ninetyDayGoal: snap.ninetyDayGoal || profile?.ninety_day_goal || null,
    runway: snap.runway || profile?.runway || null,
    industry: profile?.industry || null,
    productStatus: snap.productStatus || profile?.product_status || null,
    traction: snap.traction || profile?.traction || null,
    lastUpdatedAt: state.updatedAt ? state.updatedAt.toISOString() : null,
  };
}

/**
 * Gets current step from conversation state and maps to STARTUP_STEPS
 * for name, objective, questions, and blockers.
 */
export function getCurrentStepInfo(
  state: ConversationState
): CurrentStepInfo {
  const stepKey = state.currentStep;
  const stepConfig = STARTUP_STEPS[stepKey];
  const status = state.stepStatuses[stepKey] || "not_started";

  return {
    stepKey,
    stepNumber: stepConfig.stepNumber,
    name: stepConfig.name,
    objective: stepConfig.objective,
    questions: stepConfig.questions,
    requiredOutput: stepConfig.requiredOutput,
    status,
    blockers: state.currentBlockers || [],
  };
}

/**
 * Builds step statuses and evidence counts from conversation state
 * and fred_step_evidence table.
 */
export async function getProcessProgress(
  userId: string,
  state: ConversationState
): Promise<ProcessProgressData> {
  const supabase = createServiceClient();

  // Get evidence counts per step
  const { data: evidenceRows } = await supabase
    .from("fred_step_evidence")
    .select("step")
    .eq("user_id", userId)
    .eq("is_active", true);

  const evidenceCounts: Record<string, number> = {};
  for (const row of evidenceRows || []) {
    const step = row.step as string;
    evidenceCounts[step] = (evidenceCounts[step] || 0) + 1;
  }

  const steps: StepProgressEntry[] = STEP_ORDER.map((stepKey) => {
    const stepConfig = STARTUP_STEPS[stepKey];
    return {
      stepKey,
      stepNumber: stepConfig.stepNumber,
      name: stepConfig.name,
      status: state.stepStatuses[stepKey] || "not_started",
      evidenceCount: evidenceCounts[stepKey] || 0,
    };
  });

  const completedSteps = steps.filter(
    (s) => s.status === "validated"
  ).length;

  return {
    currentStep: state.currentStep,
    processStatus: state.processStatus,
    steps,
    totalSteps: STEP_ORDER.length,
    completedSteps,
  };
}

/**
 * Extracts diagnostic tags from conversation state for Dynamic Display Rules.
 */
export function getDiagnosticTags(state: ConversationState): DiagnosticTags {
  return state.diagnosticTags || {};
}

/**
 * Computes Red/Yellow/Green readiness zone from diagnostic tags and stage.
 *
 * Zone logic:
 * - Red (Build): stage=idea OR stage=pre-seed with positioning=low
 * - Yellow (Prove): stage=pre-seed OR seed, validation not complete
 * - Green (Raise): stage=seed+, validation+gtm validated, investor readiness signal=med+
 */
export function computeReadinessZone(
  diagnosticTags: DiagnosticTags,
  stepStatuses: Record<StartupStep, StepStatus>
): { zone: ReadinessZone; label: string } {
  const stage = diagnosticTags.stage;
  const positioning = diagnosticTags.positioningClarity;
  const investorSignal = diagnosticTags.investorReadinessSignal;
  const validationStatus = stepStatuses["validation"] || "not_started";
  const gtmStatus = stepStatuses["gtm"] || "not_started";

  // Green: stage=seed+ with validation+gtm validated and investor signal med+
  if (
    (stage === "seed" || stage === "growth") &&
    validationStatus === "validated" &&
    gtmStatus === "validated" &&
    (investorSignal === "med" || investorSignal === "high")
  ) {
    return { zone: "green", label: "Raise" };
  }

  // Red: stage=idea OR stage=pre-seed with positioning=low
  if (stage === "idea" || (stage === "pre-seed" && positioning === "low")) {
    return { zone: "red", label: "Build" };
  }

  // Yellow: everything else (pre-seed/seed, validation not complete)
  return { zone: "yellow", label: "Prove" };
}

/**
 * Gets weekly momentum data from sms_checkins table.
 * Returns last check-in summary, streak count, and date.
 */
export async function getWeeklyMomentum(
  userId: string
): Promise<WeeklyMomentumData> {
  const supabase = createServiceClient();

  // Get recent check-ins ordered by date
  const { data: checkins } = await supabase
    .from("sms_checkins")
    .select("body, created_at, direction")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(30);

  // Get total count
  const { count: totalCheckins } = await supabase
    .from("sms_checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "inbound");

  if (!checkins || checkins.length === 0) {
    return {
      lastCheckinSummary: null,
      lastCheckinDate: null,
      streak: 0,
      totalCheckins: totalCheckins ?? 0,
    };
  }

  const lastCheckin = checkins[0];

  // Calculate weekly streak: count consecutive weeks with a check-in
  let streak = 0;
  const checkinWeeks = new Set<string>();
  for (const c of checkins) {
    const date = new Date(c.created_at);
    // Get ISO week identifier (year-week)
    const yearWeek = getISOWeekString(date);
    checkinWeeks.add(yearWeek);
  }

  // Count consecutive weeks backwards from current week
  const now = new Date();
  let weekOffset = 0;
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - weekOffset * 7);
    const weekStr = getISOWeekString(checkDate);
    if (checkinWeeks.has(weekStr)) {
      streak++;
      weekOffset++;
    } else {
      // Allow current week to be missing if it hasn't ended yet
      if (i === 0) {
        weekOffset++;
        continue;
      }
      break;
    }
  }

  return {
    lastCheckinSummary: lastCheckin.body
      ? String(lastCheckin.body).slice(0, 500)
      : null,
    lastCheckinDate: lastCheckin.created_at,
    streak,
    totalCheckins: totalCheckins ?? 0,
  };
}

/**
 * Computes Dynamic Display Rules based on diagnostic tags and data state.
 */
export function computeDisplayRules(
  diagnosticTags: DiagnosticTags,
  fundingReadiness: FundingReadinessData
): DisplayRules {
  const stage = diagnosticTags.stage;

  // Early stage: hide funding gauge, show positioning first
  const showFundingGauge = stage !== "idea" && stage !== undefined;

  // No intake completed: blur readiness gauge
  const blurReadiness = !fundingReadiness.hasIntakeCompleted;

  // Growth stage: show Primary Constraint instead of positioning grade
  const showConstraintOverPositioning = stage === "growth";

  // High stress: no persistent wellbeing data store exists yet; burnout detector runs per-message only
  const highStressDetected = false;

  return {
    showFundingGauge,
    blurReadiness,
    showConstraintOverPositioning,
    highStressDetected,
  };
}

/**
 * Orchestrates all data functions into a single CommandCenterData response.
 * This is the main function called by the API endpoint.
 */
export async function getCommandCenterData(
  userId: string
): Promise<CommandCenterData> {
  // Get or create conversation state (single DB read for the core state)
  const state = await getOrCreateConversationState(userId);

  // Run independent queries in parallel — use allSettled so one failure doesn't crash the dashboard
  const [founderSnapshotResult, processProgressResult, weeklyMomentumResult, latestIRSResult] = await Promise.allSettled([
    getFounderSnapshot(userId, state),
    getProcessProgress(userId, state),
    getWeeklyMomentum(userId),
    (async () => {
      try {
        const { getLatestIRS } = await import("@/lib/fred/irs/db");
        const sb = createServiceClient();
        return await getLatestIRS(sb, userId);
      } catch {
        return null;
      }
    })(),
  ]);

  const founderSnapshot: FounderSnapshotData = founderSnapshotResult.status === "fulfilled"
    ? founderSnapshotResult.value
    : { name: null, stage: null, primaryConstraint: null, ninetyDayGoal: null, runway: null, industry: null, productStatus: null, traction: null, lastUpdatedAt: null };

  const processProgress: ProcessProgressData = processProgressResult.status === "fulfilled"
    ? processProgressResult.value
    : {
        currentStep: state.currentStep,
        processStatus: state.processStatus,
        steps: STEP_ORDER.map((stepKey) => ({
          stepKey,
          stepNumber: STARTUP_STEPS[stepKey].stepNumber,
          name: STARTUP_STEPS[stepKey].name,
          status: state.stepStatuses[stepKey] || "not_started",
          evidenceCount: 0,
        })),
        totalSteps: STEP_ORDER.length,
        completedSteps: 0,
      };

  const weeklyMomentum: WeeklyMomentumData = weeklyMomentumResult.status === "fulfilled"
    ? weeklyMomentumResult.value
    : { lastCheckinSummary: null, lastCheckinDate: null, streak: 0, totalCheckins: 0 };

  const latestIRS = latestIRSResult.status === "fulfilled" ? latestIRSResult.value : null;

  // Synchronous computations from state
  const currentStep = getCurrentStepInfo(state);
  const diagnosticTags = getDiagnosticTags(state);
  const { zone, label } = computeReadinessZone(
    diagnosticTags,
    state.stepStatuses
  );

  // Use latestIRS to determine intake status (no extra DB call needed)
  const hasIRS = latestIRS !== null;

  // When IRS exists, override zone from the actual score
  let finalZone = zone;
  let finalLabel = label;
  if (hasIRS && latestIRS) {
    if (latestIRS.overall >= 70) {
      finalZone = "green";
      finalLabel = "Raise";
    } else if (latestIRS.overall >= 40) {
      finalZone = "yellow";
      finalLabel = "Prove";
    } else {
      finalZone = "red";
      finalLabel = "Build";
    }
  }

  // Collect top blockers: prefer IRS recommendations, fall back to step blockers
  const irsRecommendations = latestIRS?.recommendations?.slice(0, 2).map((r) => ({
    action: r.action,
    category: r.category,
  })) ?? [];
  const topBlockers = irsRecommendations.length > 0
    ? irsRecommendations.map((r) => r.action)
    : state.currentBlockers.slice(0, 2);

  const fundingReadiness: FundingReadinessData = {
    zone: finalZone,
    label: finalLabel,
    topBlockers,
    hasIntakeCompleted: hasIRS,
    investorReadinessSignal:
      diagnosticTags.investorReadinessSignal ?? null,
    irsScore: latestIRS?.overall ?? null,
    irsRecommendations,
  };

  const displayRules = computeDisplayRules(diagnosticTags, fundingReadiness);

  return {
    founderSnapshot,
    currentStep,
    processProgress,
    fundingReadiness,
    weeklyMomentum,
    diagnosticTags,
    displayRules,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Returns an ISO week identifier string like "2026-W07" */
function getISOWeekString(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
