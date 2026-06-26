/**
 * Founder Progress Snapshot Aggregator (AI-7489)
 *
 * Builds a deterministic, LLM-free FounderProgressSnapshot from the user's
 * journey data. This is the single source of truth the narration prompt and
 * the renderer both consume. Every read is defensive: missing tables/rows
 * degrade to zeros rather than throwing, so the report still generates for a
 * brand-new founder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGE_CONFIG, STAGE_ORDER, getStageIndex } from "@/lib/oases/stage-config";
import {
  STARTUP_STEPS,
  STEP_ORDER,
  type StartupStep,
} from "@/lib/ai/frameworks/startup-process";
import type { OasesStage } from "@/types/oases";
import type {
  FounderProgressSnapshot,
  MilestoneSnapshot,
  ProgramStepSnapshot,
  StageProgressSnapshot,
} from "./types";

interface AggregateContext {
  founderName: string;
  companyName: string | null;
  /** Lower bound for "since last report" deltas; null = all-time. */
  periodStart: string | null;
}

/**
 * Build the full progress snapshot for a user.
 *
 * Uses a service-role client (passed in) so it works from both the
 * authenticated API route and the unattended weekly cron.
 */
export async function buildProgressSnapshot(
  supabase: SupabaseClient,
  userId: string,
  ctx: AggregateContext
): Promise<FounderProgressSnapshot> {
  const periodEnd = new Date().toISOString();

  // --- Current stage from profile -----------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("oases_stage")
    .eq("id", userId)
    .maybeSingle();

  const currentStage = ((profile as { oases_stage?: string | null } | null)
    ?.oases_stage ?? "clarity") as OasesStage;
  const currentStageIndex = getStageIndex(currentStage);

  // --- Completed Oases checklist steps ------------------------------------
  const { data: progressRows } = await supabase
    .from("oases_progress")
    .select("stage, step_id")
    .eq("user_id", userId);

  const completedSet = new Set(
    (progressRows ?? []).map((r) => `${r.stage}:${r.step_id}`)
  );

  let stepsCompleted = 0;
  let stepsTotal = 0;
  let programStepNumber = 0;
  const stages: StageProgressSnapshot[] = [];
  const programSteps: ProgramStepSnapshot[] = [];

  for (const stageConfig of STAGE_CONFIG) {
    const stageIndex = getStageIndex(stageConfig.id);
    let stageCompleted = 0;

    for (const step of stageConfig.steps) {
      programStepNumber += 1;
      const done = completedSet.has(`${stageConfig.id}:${step.id}`);
      if (done) stageCompleted += 1;
      programSteps.push({
        number: programStepNumber,
        name: step.label,
        stage: stageConfig.id,
        completed: done,
      });
    }

    const stageTotal = stageConfig.steps.length;
    stepsCompleted += stageCompleted;
    stepsTotal += stageTotal;

    let status: StageProgressSnapshot["status"];
    if (stageIndex < currentStageIndex) status = "completed";
    else if (stageIndex === currentStageIndex) status = "current";
    else status = "locked";

    stages.push({
      id: stageConfig.id,
      name: stageConfig.name,
      status,
      stepsCompleted: stageCompleted,
      stepsTotal: stageTotal,
    });
  }

  const overallPercentage =
    stepsTotal === 0 ? 0 : Math.round((stepsCompleted / stepsTotal) * 100);

  // --- 9-step Fred Cary startup process -----------------------------------
  const { data: processRow } = await supabase
    .from("startup_processes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let startupProcess: FounderProgressSnapshot["startupProcess"] = null;
  if (processRow) {
    const row = processRow as Record<string, unknown>;
    const stepNames = STEP_ORDER.map((key: StartupStep, idx) => {
      const def = STARTUP_STEPS[key];
      const completed = row[`step_${idx + 1}_completed`] === true;
      return { number: def.stepNumber, name: def.name, completed };
    });
    startupProcess = {
      currentStep:
        typeof row.current_step === "number" ? (row.current_step as number) : 1,
      completedSteps: stepNames.filter((s) => s.completed).length,
      totalSteps: STEP_ORDER.length,
      stepNames,
    };
  }

  // --- Milestones ----------------------------------------------------------
  const { data: milestoneRows } = await supabase
    .from("milestones")
    .select("title, category, status, completed_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const allMilestones = milestoneRows ?? [];
  const milestoneCount = (status: string) =>
    allMilestones.filter((m) => m.status === status).length;

  const recentMilestones: MilestoneSnapshot[] = allMilestones
    .slice(0, 8)
    .map((m) => ({
      title: String(m.title ?? "Untitled milestone"),
      category: String(m.category ?? "product"),
      status: (m.status ?? "pending") as MilestoneSnapshot["status"],
      completedAt: m.completed_at ? String(m.completed_at) : null,
    }));

  // --- Journey events (timeline + score deltas) ---------------------------
  const { data: eventRows } = await supabase
    .from("journey_events")
    .select("event_type, created_at, score_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const events = eventRows ?? [];

  // Latest non-null score (most recent first).
  const latestScore =
    events.find((e) => typeof e.score_after === "number")?.score_after ?? null;

  // Prior score: most recent score AT OR BEFORE periodStart.
  let priorScore: number | null = null;
  if (ctx.periodStart) {
    const before = events
      .filter(
        (e) =>
          typeof e.score_after === "number" &&
          new Date(e.created_at).toISOString() <= ctx.periodStart!
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    priorScore = before[0]?.score_after ?? null;
  }

  // Events within the covered period (for "this week" narration).
  const periodEvents = ctx.periodStart
    ? events.filter(
        (e) => new Date(e.created_at).toISOString() >= ctx.periodStart!
      )
    : events.slice(0, 15);

  const activeDays = new Set(
    periodEvents.map((e) => new Date(e.created_at).toISOString().slice(0, 10))
  ).size;

  // --- Company name (best-effort) -----------------------------------------
  let companyName = ctx.companyName;
  if (!companyName && processRow) {
    const row = processRow as Record<string, unknown>;
    companyName =
      (typeof row.company_name === "string" ? row.company_name : null) ?? null;
  }

  return {
    founderName: ctx.founderName,
    companyName,
    currentStage,
    currentStageName: STAGE_ORDER.includes(currentStage)
      ? STAGE_CONFIG[currentStageIndex].name
      : "Clarity",
    overallPercentage,
    stepsCompleted,
    stepsTotal,
    stages,
    programSteps,
    startupProcess,
    milestones: {
      completed: milestoneCount("completed"),
      inProgress: milestoneCount("in_progress"),
      pending: milestoneCount("pending"),
      total: allMilestones.length,
      recent: recentMilestones,
    },
    latestScore: typeof latestScore === "number" ? latestScore : null,
    priorScore: typeof priorScore === "number" ? priorScore : null,
    recentEvents: periodEvents.slice(0, 15).map((e) => ({
      eventType: String(e.event_type),
      createdAt: String(e.created_at),
      scoreAfter: typeof e.score_after === "number" ? e.score_after : null,
    })),
    activeDays,
    periodStart: ctx.periodStart,
    periodEnd,
  };
}
