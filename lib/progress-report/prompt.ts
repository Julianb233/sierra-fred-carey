/**
 * Progress Report Narration Prompt (AI-7489)
 *
 * Turns a deterministic FounderProgressSnapshot into a FRED-voice, structured
 * ProgressReportPayload. The system prompt pins the JSON schema; the user
 * message serializes the snapshot. parseProgressPayload defensively extracts
 * and validates the JSON.
 */

import type {
  FounderProgressSnapshot,
  ProgressReportPayload,
  ReportTier,
} from "./types";

const VALID_TIERS: ReportTier[] = ["clarity", "validate", "accelerator"];
const VALID_SECTION_STATUS = new Set([
  "ahead",
  "on_track",
  "stalled",
  "not_started",
]);

export function buildSystemPrompt(): string {
  return `You are FRED, the AI mentor inside Sahara — Fred Cary's founder operating system.

You are writing an AUTOMATED PROGRESS REPORT for a founder. This is NOT an idea
evaluation. It summarizes how far the founder has advanced through their
structured program (the 5-stage Oases journey: Clarity -> Validation -> Build ->
Launch -> Grow), celebrates real momentum, names what stalled, and points to the
next concrete actions. The tone is direct, warm, and specific — like a mentor
who has been watching the founder's actual activity. No generic platitudes.
Ground every claim in the data provided. Never invent milestones or steps the
data does not show.

Return ONLY a single JSON object (no markdown fences, no prose before/after)
with EXACTLY this shape:

{
  "overallPercentage": <integer 0-100, echo the snapshot value>,
  "headline": "<short momentum headline, max ~60 chars>",
  "subline": "<one line: steps complete + what changed this period>",
  "executiveSummary": "<one paragraph, 2-4 sentences, FRED voice>",
  "sections": [
    {
      "title": "<stage or theme name>",
      "status": "ahead" | "on_track" | "stalled" | "not_started",
      "body": "<1-2 paragraphs narrating real progress in this area>"
    }
  ],
  "nextActions": ["<concrete next action>", "<another>"],
  "recommendedTier": "clarity" | "validate" | "accelerator",
  "upgradePitch": "<1-2 sentences tying the upgrade to where they are now>"
}

Rules:
- 3 to 5 sections. Lead with the current stage. Mark finished stages "ahead" or
  "on_track"; mark a stage with 0 completed steps "not_started"; mark a stage
  the founder is stuck in (current stage, little recent activity) "stalled".
- 2 to 4 nextActions, each a single imperative sentence the founder can do next.
- recommendedTier heuristic: early/low completion -> "clarity"; mid-journey with
  momentum -> "validate"; late stages / high completion / strong score ->
  "accelerator".
- overallPercentage MUST equal the snapshot's overallPercentage.
- Keep total output under 900 words.`;
}

export function buildUserMessage(snapshot: FounderProgressSnapshot): string {
  const lines: string[] = [];
  lines.push(`Founder: ${snapshot.founderName}`);
  if (snapshot.companyName) lines.push(`Venture: ${snapshot.companyName}`);
  lines.push(`Current stage: ${snapshot.currentStageName}`);
  lines.push(
    `Overall program completion: ${snapshot.overallPercentage}% (${snapshot.stepsCompleted}/${snapshot.stepsTotal} steps)`
  );
  if (snapshot.periodStart) {
    lines.push(
      `Reporting period: ${snapshot.periodStart.slice(0, 10)} to ${snapshot.periodEnd.slice(0, 10)} (${snapshot.activeDays} active days)`
    );
  } else {
    lines.push(`Reporting period: all-time (first report)`);
  }

  lines.push("", "STAGE BREAKDOWN:");
  for (const s of snapshot.stages) {
    lines.push(
      `- ${s.name} [${s.status}]: ${s.stepsCompleted}/${s.stepsTotal} steps`
    );
  }

  lines.push("", "PROGRAM STEPS (in order):");
  for (const step of snapshot.programSteps) {
    lines.push(
      `${step.number}. [${step.completed ? "x" : " "}] ${step.name} (${step.stage})`
    );
  }

  if (snapshot.startupProcess) {
    const sp = snapshot.startupProcess;
    lines.push(
      "",
      `9-STEP STARTUP PROCESS: ${sp.completedSteps}/${sp.totalSteps} validated (on step ${sp.currentStep})`
    );
    for (const s of sp.stepNames) {
      lines.push(`  ${s.number}. [${s.completed ? "x" : " "}] ${s.name}`);
    }
  }

  lines.push(
    "",
    `MILESTONES: ${snapshot.milestones.completed} completed, ${snapshot.milestones.inProgress} in progress, ${snapshot.milestones.pending} pending (total ${snapshot.milestones.total})`
  );
  for (const m of snapshot.milestones.recent) {
    lines.push(`- [${m.status}] ${m.title} (${m.category})`);
  }

  if (snapshot.latestScore != null) {
    const delta =
      snapshot.priorScore != null
        ? ` (was ${snapshot.priorScore} at period start, delta ${snapshot.latestScore - snapshot.priorScore})`
        : "";
    lines.push("", `LATEST SCORE: ${snapshot.latestScore}/100${delta}`);
  }

  if (snapshot.recentEvents.length > 0) {
    lines.push("", "RECENT ACTIVITY:");
    for (const e of snapshot.recentEvents) {
      lines.push(`- ${e.createdAt.slice(0, 10)} ${e.eventType}`);
    }
  } else {
    lines.push("", "RECENT ACTIVITY: none in this period.");
  }

  lines.push(
    "",
    "Write the progress report JSON now. Ground every section in the data above."
  );
  return lines.join("\n");
}

/**
 * Extract and validate the JSON payload from Claude's text output.
 * Tolerates stray prose / markdown fences by slicing the outermost braces.
 * On a structural failure, throws an Error whose `cause.rawOutput` carries the
 * model text so the generator can stash it for debugging.
 */
export function parseProgressPayload(raw: string): ProgressReportPayload {
  const fail = (msg: string): never => {
    throw new Error(msg, { cause: { rawOutput: raw } });
  };

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return fail("No JSON object found in model output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return fail(
      `Failed to JSON.parse model output: ${e instanceof Error ? e.message : "unknown"}`
    );
  }

  const p = parsed as Record<string, unknown>;

  const overallPercentage = clampPct(p.overallPercentage);
  const headline = asText(p.headline);
  const executiveSummary = asText(p.executiveSummary);
  if (!headline) return fail("Missing headline");
  if (!executiveSummary) return fail("Missing executiveSummary");

  const sectionsRaw = Array.isArray(p.sections) ? p.sections : [];
  const sections = sectionsRaw
    .map((s) => {
      const so = s as Record<string, unknown>;
      const title = asText(so.title);
      const body = asText(so.body);
      if (!title || !body) return null;
      const status =
        typeof so.status === "string" && VALID_SECTION_STATUS.has(so.status)
          ? (so.status as ProgressReportPayload["sections"][number]["status"])
          : undefined;
      return { title, body, status };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (sections.length === 0) return fail("No valid sections in model output");

  const nextActions = (Array.isArray(p.nextActions) ? p.nextActions : [])
    .map((a) => asText(a))
    .filter((a): a is string => a.length > 0)
    .slice(0, 6);

  const recommendedTier: ReportTier =
    typeof p.recommendedTier === "string" &&
    VALID_TIERS.includes(p.recommendedTier as ReportTier)
      ? (p.recommendedTier as ReportTier)
      : "clarity";

  return {
    overallPercentage,
    headline,
    subline: asText(p.subline),
    executiveSummary,
    sections,
    nextActions,
    recommendedTier,
    upgradePitch: asText(p.upgradePitch),
  };
}

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function clampPct(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
