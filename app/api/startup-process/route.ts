import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";
import type { StartupProcess, StepData, StepNumber } from "@/types/startup-process";
import { STEP_TITLES, STEP_DESCRIPTIONS, STEP_KEY_QUESTIONS } from "@/types/startup-process";

/**
 * GET /api/startup-process
 * Load the current user's startup process from the database.
 * Returns null data if no process exists yet.
 */
export async function GET(_request: NextRequest) {
  try {
    const userId = await requireAuth();

    const rows = await sql`
      SELECT *
      FROM startup_processes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const row = rows[0] as Record<string, unknown>;

    // Map DB row back to StartupProcess shape (steps array with data payloads)
    const steps = buildStepsFromRow(row);

    const process: StartupProcess = {
      id: String(row.id),
      userId: String(row.user_id),
      currentStep: (Number(row.current_step) || 1) as StartupProcess["currentStep"],
      steps,
      overallProgress: Number(row.completion_percentage) || 0,
      startedAt: String(row.created_at),
      lastActivityAt: String(row.updated_at),
      completedAt: row.status === "completed" ? String(row.updated_at) : undefined,
    };

    return NextResponse.json({ success: true, data: process });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[GET /api/startup-process]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load startup process" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/startup-process
 * Upsert the current user's startup process.
 * Body: StartupProcess (full object)
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const process: StartupProcess = await request.json();

    const completedSteps = process.steps.filter((s) => s.status === "validated").length;
    const completionPct = Math.round((completedSteps / 9) * 100);

    // Build the flat column map from the steps array
    const cols = buildColumnsFromSteps(process.steps);
    const stepValidations = buildStepValidations(process.steps);

    // Load previous step completion states to detect newly validated steps
    const existing = await sql`
      SELECT id,
        step_1_completed, step_2_completed, step_3_completed,
        step_4_completed, step_5_completed, step_6_completed,
        step_7_completed, step_8_completed, step_9_completed
      FROM startup_processes WHERE user_id = ${userId} LIMIT 1
    `;
    const oldCompleted = new Set<number>();
    if (existing.length > 0) {
      const row = existing[0] as Record<string, unknown>;
      for (let i = 1; i <= 9; i++) {
        if (row[`step_${i}_completed`]) oldCompleted.add(i);
      }
    }

    if (existing.length === 0) {
      // INSERT
      await sql`
        INSERT INTO startup_processes (
          user_id, current_step,
          step_1_completed, step_2_completed, step_3_completed,
          step_4_completed, step_5_completed, step_6_completed,
          step_7_completed, step_8_completed, step_9_completed,
          problem_statement, problem_who, problem_frequency, problem_urgency,
          step_1_validated_at,
          economic_buyer, user_if_different, environment_context,
          step_2_validated_at,
          founder_edge, unique_insight, unfair_advantage,
          step_3_validated_at,
          simplest_solution, explicitly_excluded,
          step_4_validated_at,
          validation_method, demand_evidence, validation_results,
          step_5_validated_at,
          gtm_channel, gtm_approach,
          step_6_validated_at,
          weekly_priorities, ownership_structure,
          step_7_validated_at,
          pilot_definition, pilot_success_criteria,
          step_8_validated_at,
          what_worked, what_didnt_work, scale_decision, scale_reasoning,
          step_9_validated_at,
          completion_percentage,
          status
        ) VALUES (
          ${userId}, ${process.currentStep},
          ${stepValidations[1].completed}, ${stepValidations[2].completed}, ${stepValidations[3].completed},
          ${stepValidations[4].completed}, ${stepValidations[5].completed}, ${stepValidations[6].completed},
          ${stepValidations[7].completed}, ${stepValidations[8].completed}, ${stepValidations[9].completed},
          ${cols.problem_statement}, ${cols.problem_who}, ${cols.problem_frequency}, ${cols.problem_urgency},
          ${stepValidations[1].validatedAt},
          ${cols.economic_buyer}, ${cols.user_if_different}, ${cols.environment_context},
          ${stepValidations[2].validatedAt},
          ${cols.founder_edge}, ${cols.unique_insight}, ${cols.unfair_advantage},
          ${stepValidations[3].validatedAt},
          ${cols.simplest_solution}, ${cols.explicitly_excluded},
          ${stepValidations[4].validatedAt},
          ${cols.validation_method}, ${cols.demand_evidence}, ${cols.validation_results},
          ${stepValidations[5].validatedAt},
          ${cols.gtm_channel}, ${cols.gtm_approach},
          ${stepValidations[6].validatedAt},
          ${cols.weekly_priorities}, ${cols.ownership_structure},
          ${stepValidations[7].validatedAt},
          ${cols.pilot_definition}, ${cols.pilot_success_criteria},
          ${stepValidations[8].validatedAt},
          ${cols.what_worked}, ${cols.what_didnt_work}, ${cols.scale_decision}, ${cols.scale_reasoning},
          ${stepValidations[9].validatedAt},
          ${completionPct},
          ${process.completedAt ? "completed" : "active"}
        )
      `;
    } else {
      // UPDATE
      await sql`
        UPDATE startup_processes SET
          current_step = ${process.currentStep},
          step_1_completed = ${stepValidations[1].completed},
          step_2_completed = ${stepValidations[2].completed},
          step_3_completed = ${stepValidations[3].completed},
          step_4_completed = ${stepValidations[4].completed},
          step_5_completed = ${stepValidations[5].completed},
          step_6_completed = ${stepValidations[6].completed},
          step_7_completed = ${stepValidations[7].completed},
          step_8_completed = ${stepValidations[8].completed},
          step_9_completed = ${stepValidations[9].completed},
          problem_statement = ${cols.problem_statement},
          problem_who = ${cols.problem_who},
          problem_frequency = ${cols.problem_frequency},
          problem_urgency = ${cols.problem_urgency},
          step_1_validated_at = ${stepValidations[1].validatedAt},
          economic_buyer = ${cols.economic_buyer},
          user_if_different = ${cols.user_if_different},
          environment_context = ${cols.environment_context},
          step_2_validated_at = ${stepValidations[2].validatedAt},
          founder_edge = ${cols.founder_edge},
          unique_insight = ${cols.unique_insight},
          unfair_advantage = ${cols.unfair_advantage},
          step_3_validated_at = ${stepValidations[3].validatedAt},
          simplest_solution = ${cols.simplest_solution},
          explicitly_excluded = ${cols.explicitly_excluded},
          step_4_validated_at = ${stepValidations[4].validatedAt},
          validation_method = ${cols.validation_method},
          demand_evidence = ${cols.demand_evidence},
          validation_results = ${cols.validation_results},
          step_5_validated_at = ${stepValidations[5].validatedAt},
          gtm_channel = ${cols.gtm_channel},
          gtm_approach = ${cols.gtm_approach},
          step_6_validated_at = ${stepValidations[6].validatedAt},
          weekly_priorities = ${cols.weekly_priorities},
          ownership_structure = ${cols.ownership_structure},
          step_7_validated_at = ${stepValidations[7].validatedAt},
          pilot_definition = ${cols.pilot_definition},
          pilot_success_criteria = ${cols.pilot_success_criteria},
          step_8_validated_at = ${stepValidations[8].validatedAt},
          what_worked = ${cols.what_worked},
          what_didnt_work = ${cols.what_didnt_work},
          scale_decision = ${cols.scale_decision},
          scale_reasoning = ${cols.scale_reasoning},
          step_9_validated_at = ${stepValidations[9].validatedAt},
          completion_percentage = ${completionPct},
          status = ${process.completedAt ? "completed" : "active"},
          updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }

    // Log journey_events for newly validated steps (fire-and-forget)
    const newlyValidated: number[] = [];
    for (let i = 1; i <= 9; i++) {
      if (stepValidations[i].completed && !oldCompleted.has(i)) {
        newlyValidated.push(i);
      }
    }
    if (newlyValidated.length > 0) {
      (async () => {
        try {
          for (const stepNum of newlyValidated) {
            await sql`
              INSERT INTO journey_events (user_id, event_type, event_data, score_after)
              VALUES (
                ${userId},
                'milestone_achieved',
                ${JSON.stringify({
                  source: 'startup_process',
                  stepNumber: stepNum,
                  stepTitle: STEP_TITLES[stepNum as StepNumber],
                })},
                ${completionPct}
              )
            `;
          }
        } catch (err) {
          console.warn("[PUT /api/startup-process] Failed to log journey events:", err);
        }
      })();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[PUT /api/startup-process]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save startup process" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStepData(steps: StartupProcess["steps"], num: number): Record<string, unknown> {
  const data = steps.find((s) => s.stepNumber === num)?.data;
  return (data as unknown as Record<string, unknown>) ?? {};
}

function buildColumnsFromSteps(steps: StartupProcess["steps"]) {
  const s1 = getStepData(steps, 1);
  const s2 = getStepData(steps, 2);
  const s3 = getStepData(steps, 3);
  const s4 = getStepData(steps, 4);
  const s5 = getStepData(steps, 5);
  const s6 = getStepData(steps, 6);
  const s7 = getStepData(steps, 7);
  const s8 = getStepData(steps, 8);
  const s9 = getStepData(steps, 9);

  return {
    problem_statement: (s1.problemStatement as string) || null,
    problem_who: (s1.who as string) || null,
    problem_frequency: (s1.frequency as string) || null,
    problem_urgency: (s1.urgency as string) || null,
    economic_buyer: (s2.economicBuyer as string) || null,
    user_if_different: (s2.user as string) || null,
    environment_context: (s2.environment as string) || null,
    founder_edge: (s3.founderEdge as string) || null,
    unique_insight: (s3.uniqueInsight as string) || null,
    unfair_advantage: (s3.unfairAdvantage as string) || null,
    simplest_solution: (s4.simplestSolution as string) || null,
    explicitly_excluded: (s4.explicitlyExcluded as string) || null,
    validation_method: (s5.validationMethod as string) || null,
    demand_evidence: JSON.stringify(s5.evidence ? [s5.evidence] : []),
    validation_results: (s5.customerQuotes as string) || null,
    gtm_channel: (s6.gtmChannel as string) || null,
    gtm_approach: (s6.approach as string) || null,
    weekly_priorities: JSON.stringify(s7.weeklyPriorities ?? []),
    ownership_structure: JSON.stringify({ structure: s7.ownershipStructure, decisionMaker: s7.decisionMaker }),
    pilot_definition: (s8.pilotDefinition as string) || null,
    pilot_success_criteria: (s8.successCriteria as string) || null,
    what_worked: JSON.stringify(s9.whatWorked ? [s9.whatWorked] : []),
    what_didnt_work: JSON.stringify(s9.whatDidntWork ? [s9.whatDidntWork] : []),
    scale_decision: mapScaleDecision(s9.scaleDecision as string),
    scale_reasoning: (s9.nextSteps as string) || null,
  };
}

function mapScaleDecision(v: string | undefined): string | null {
  const map: Record<string, string> = { scale: "proceed", pivot: "adjust", iterate: "adjust", kill: "stop" };
  return v ? (map[v] ?? null) : null;
}

function buildStepValidations(steps: StartupProcess["steps"]) {
  const result: Record<number, { completed: boolean; validatedAt: string | null }> = {};
  for (let i = 1; i <= 9; i++) {
    const step = steps.find((s) => s.stepNumber === i);
    result[i] = {
      completed: step?.status === "validated",
      validatedAt: step?.completedAt || null,
    };
  }
  return result;
}

function buildStepsFromRow(row: Record<string, unknown>): StartupProcess["steps"] {
  return Array.from({ length: 9 }, (_, i) => {
    const num = (i + 1) as StartupProcess["steps"][number]["stepNumber"];
    const completed = Boolean(row[`step_${num}_completed`]);
    const validatedAt = row[`step_${num}_validated_at`] as string | null;
    const status = completed ? "validated" : num === 1 ? "in_progress" : "not_started";

    return {
      stepNumber: num,
      title: STEP_TITLES[num],
      description: STEP_DESCRIPTIONS[num],
      keyQuestions: STEP_KEY_QUESTIONS[num],
      status,
      data: extractStepData(row, num),
      validation: null,
      completedAt: validatedAt ?? undefined,
    };
  }) as StartupProcess["steps"];
}

function extractStepData(row: Record<string, unknown>, step: number): StepData | null {
  switch (step) {
    case 1:
      if (!row.problem_statement) return null;
      return { problemStatement: row.problem_statement, who: row.problem_who, frequency: row.problem_frequency, urgency: row.problem_urgency } as StepData;
    case 2:
      if (!row.economic_buyer) return null;
      return { economicBuyer: row.economic_buyer, user: row.user_if_different, environment: row.environment_context } as StepData;
    case 3:
      if (!row.founder_edge) return null;
      return { founderEdge: row.founder_edge, uniqueInsight: row.unique_insight, unfairAdvantage: row.unfair_advantage } as StepData;
    case 4:
      if (!row.simplest_solution) return null;
      return { simplestSolution: row.simplest_solution, explicitlyExcluded: row.explicitly_excluded } as StepData;
    case 5:
      if (!row.validation_method) return null;
      return { validationMethod: row.validation_method, evidence: row.validation_results, customerQuotes: row.validation_results } as StepData;
    case 6:
      if (!row.gtm_channel) return null;
      return { gtmChannel: row.gtm_channel, approach: row.gtm_approach } as StepData;
    case 7: {
      const priorities = row.weekly_priorities;
      if (!priorities) return null;
      const wp = typeof priorities === "string" ? JSON.parse(priorities) : priorities;
      return { weeklyPriorities: Array.isArray(wp) ? wp : [], ownershipStructure: row.ownership_structure || "" } as StepData;
    }
    case 8:
      if (!row.pilot_definition) return null;
      return { pilotDefinition: row.pilot_definition, successCriteria: row.pilot_success_criteria } as StepData;
    case 9: {
      const ww = row.what_worked;
      const wdw = row.what_didnt_work;
      if (!ww && !wdw) return null;
      const wwArr = typeof ww === "string" ? JSON.parse(ww) : ww;
      const wdwArr = typeof wdw === "string" ? JSON.parse(wdw) : wdw;
      return {
        whatWorked: Array.isArray(wwArr) ? wwArr[0] ?? "" : "",
        whatDidntWork: Array.isArray(wdwArr) ? wdwArr[0] ?? "" : "",
        scaleDecision: "iterate",
        nextSteps: row.scale_reasoning || "",
      } as StepData;
    }
    default:
      return null;
  }
}
