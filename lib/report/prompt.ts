/**
 * Claude prompt + JSON schema for founder report generation.
 *
 * The model is asked to return a JSON object matching ReportPayload.
 * We extract it from a code fence to be robust to incidental prose.
 */

import { STARTUP_STEPS, STEP_ORDER, type StartupStep } from "@/lib/ai/frameworks/startup-process";
import type { ReportPayload } from "./types";

export interface FounderAnswers {
  // Step 1
  problem_statement?: string | null;
  problem_who?: string | null;
  problem_frequency?: string | null;
  problem_urgency?: string | null;

  // Step 2
  economic_buyer?: string | null;
  user_if_different?: string | null;
  environment_context?: string | null;

  // Step 3
  founder_edge?: string | null;
  unique_insight?: string | null;
  unfair_advantage?: string | null;

  // Step 4
  simplest_solution?: string | null;
  explicitly_excluded?: string | null;

  // Step 5
  validation_method?: string | null;
  demand_evidence?: unknown;
  validation_results?: string | null;

  // Step 6
  gtm_channel?: string | null;
  gtm_approach?: string | null;

  // Step 7
  weekly_priorities?: unknown;
  ownership_structure?: unknown;

  // Step 8
  pilot_definition?: string | null;
  pilot_success_criteria?: string | null;
  pilot_results?: unknown;

  // Step 9
  what_worked?: unknown;
  what_didnt_work?: unknown;
  scale_decision?: string | null;
  scale_reasoning?: string | null;

  // Completion flags
  step_1_completed?: boolean;
  step_2_completed?: boolean;
  step_3_completed?: boolean;
  step_4_completed?: boolean;
  step_5_completed?: boolean;
  step_6_completed?: boolean;
  step_7_completed?: boolean;
  step_8_completed?: boolean;
  step_9_completed?: boolean;
}

export interface FounderContext {
  founderName?: string | null;
  companyName?: string | null;
  stage?: string | null;
}

/**
 * Builds the Claude system prompt that establishes Fred's voice.
 */
export function buildSystemPrompt(): string {
  return `You are Fred Cary, a serial founder and investor with 30+ years of experience. You wrote the 9-step Fred Cary Startup Process: Idea -> Traction. Your voice is direct, specific, founder-to-founder, and grounded in pattern recognition. You speak in concrete examples, never abstractions. You are blunt but never cruel. You are generating a personalized founder readiness report for a user who just completed all 9 steps.

YOUR CORE PRINCIPLE
Never optimize downstream artifacts (decks, fundraising, scaling) before upstream truth (problem clarity, demand evidence, distribution) is established. If a step is weak, name it. If a step is strong, validate it. Never inflate. Never sugarcoat. But also: do not scare the founder. The goal is clarity and momentum.

OUTPUT FORMAT
Return ONLY a single JSON object inside a \`\`\`json code fence. No prose before or after. The shape is:

{
  "score": <0-100 integer overall process readiness>,
  "verdictHeadline": "<6-10 word verdict, e.g. 'Earns the right to scale.' or 'Promising idea, missing upstream truth.'>",
  "verdictSubline": "<one-line summary of step counts and what to do next>",
  "executiveSummary": "<single paragraph, 5-8 sentences, in Fred's voice. Open with the founder's name. Name what they did right, then the 1-2 things to fix, then a forward-looking line. Never use 'we' - it's first-person 'you'.>",
  "steps": [
    {
      "stepNumber": 1,
      "step": "problem",
      "name": "Define the Real Problem",
      "status": "validated" | "tightening" | "blocking" | "not_started",
      "answerSummary": "<one sentence summarizing what the founder said, in their own language; quote if powerful>",
      "verdict": "<2-4 sentences. Specific feedback. If validated: tell them why it's strong and how to use it. If tightening: name the exact fix. If blocking: name what to do this week to unblock.>",
      "killboxText": "<only present for tightening/blocking steps. 1-2 sentences. The 'watch for' or 'this is blocking' callout.>"
    },
    ... (all 9 steps in order)
  ],
  "recommendedTier": "clarity" | "validate" | "accelerator",
  "nextPitch": "<1-2 sentences explaining why the recommended tier is right for them>"
}

STATUS RULES
- "validated": the founder gave a concrete, specific, customer-language answer that satisfies the step's required output
- "tightening": there's a real answer but it has a gap (too broad, conflates buyer/user, etc.). Fixable in days.
- "blocking": the answer is too vague to advance OR triggers a kill signal. Must be fixed before moving on.
- "not_started": the founder skipped the step or wrote "TBD"

SCORE RUBRIC
- 80-100: 7+ validated, 0 blocking
- 60-79: 5-6 validated, at most 1 blocking
- 40-59: 3-4 validated, OR 2+ blocking
- 20-39: 1-2 validated, multiple blocking
- 0-19: 0 validated

TIER RECOMMENDATION
- score >= 70: "accelerator" (they're ready to scale, $99/mo, get the playbook)
- score 40-69: "validate" (they need validation/GTM tightening, $49/mo)
- score < 40: "clarity" (they need to narrow buyer/problem, $29/mo)

VOICE EXAMPLES
- Validated: "Strong. The problem is named in customer language, scoped to a specific buyer segment, and quantified. Keep using this exact framing in every conversation."
- Tightening: "You named a segment, but you didn't separate buyer from user. Pick which one you're building for FIRST."
- Blocking: "'Sounds cool' is not validation. It's politeness. You need a paid pilot, an LOI, or a behavior change before you spend another dollar building."

NEVER use these phrases: "synergy", "leverage", "world-class", "best-in-class", "ideate", "circle back".`;
}

/**
 * Builds the user message that injects the founder's actual answers.
 */
export function buildUserMessage(
  answers: FounderAnswers,
  context: FounderContext
): string {
  const founder = context.founderName ?? "Founder";
  const company = context.companyName ?? "Untitled Company";
  const stage = context.stage ?? "Early stage";

  const stepBlocks = STEP_ORDER.map((step) => {
    const config = STARTUP_STEPS[step];
    const completed = answers[`step_${config.stepNumber}_completed` as keyof FounderAnswers] as
      | boolean
      | undefined;
    const answerLines = answersForStep(step, answers);

    return `STEP ${config.stepNumber}: ${config.name}
Completed: ${completed ? "yes" : "no"}
Answers:
${answerLines.length ? answerLines.map((l) => `  - ${l}`).join("\n") : "  - (none)"}
`;
  }).join("\n");

  return `Generate a founder readiness report for:

Founder: ${founder}
Company: ${company}
Stage: ${stage}

Here are their answers across all 9 steps. Many fields will be blank if the founder skipped them - mark those steps "not_started" or "blocking" depending on whether the founder is genuinely early or skipping work.

${stepBlocks}

Return ONLY the JSON object inside a \`\`\`json code fence as specified in the system prompt.`;
}

function answersForStep(step: StartupStep, a: FounderAnswers): string[] {
  const out: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      out.push(`${label}: ${value.map((v) => JSON.stringify(v)).join("; ")}`);
      return;
    }
    if (typeof value === "object") {
      const json = JSON.stringify(value);
      if (json === "{}" || json === "[]") return;
      out.push(`${label}: ${json}`);
      return;
    }
    out.push(`${label}: ${value}`);
  };

  switch (step) {
    case "problem":
      push("Problem statement", a.problem_statement);
      push("Who experiences it", a.problem_who);
      push("How often", a.problem_frequency);
      push("Why it matters", a.problem_urgency);
      break;
    case "buyer":
      push("Economic buyer", a.economic_buyer);
      push("User (if different)", a.user_if_different);
      push("Environment / workflow", a.environment_context);
      break;
    case "founder-edge":
      push("Founder edge", a.founder_edge);
      push("Unique insight", a.unique_insight);
      push("Unfair advantage", a.unfair_advantage);
      break;
    case "solution":
      push("Simplest viable solution", a.simplest_solution);
      push("Explicitly NOT building", a.explicitly_excluded);
      break;
    case "validation":
      push("Validation method", a.validation_method);
      push("Demand evidence", a.demand_evidence);
      push("Results", a.validation_results);
      break;
    case "gtm":
      push("Channel", a.gtm_channel);
      push("Approach", a.gtm_approach);
      break;
    case "execution":
      push("Weekly priorities", a.weekly_priorities);
      push("Ownership", a.ownership_structure);
      break;
    case "pilot":
      push("Pilot definition", a.pilot_definition);
      push("Success criteria", a.pilot_success_criteria);
      push("Results", a.pilot_results);
      break;
    case "scale-decision":
      push("What worked", a.what_worked);
      push("What didn't work", a.what_didnt_work);
      push("Scale decision", a.scale_decision);
      push("Reasoning", a.scale_reasoning);
      break;
  }
  return out;
}

/**
 * Extract a JSON object from a Claude response that may have a code fence
 * or stray prose. Throws if no valid JSON ReportPayload can be parsed.
 */
export function parseReportPayload(text: string): ReportPayload {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : text;
  const parsed = JSON.parse(jsonText);

  // Lightweight shape check; trust Claude for the rest
  if (
    typeof parsed.score !== "number" ||
    typeof parsed.verdictHeadline !== "string" ||
    typeof parsed.executiveSummary !== "string" ||
    !Array.isArray(parsed.steps)
  ) {
    throw new Error("Report payload missing required fields");
  }

  return parsed as ReportPayload;
}
