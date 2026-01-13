import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { generateTrackedResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  generateInvestorLensPrompt,
  STAGE_CRITERIA,
  CORE_VC_AXES,
  HIDDEN_VC_FILTERS,
  type InvestorStage,
} from "@/lib/ai/frameworks/investor-lens";

const INVESTOR_ASSESSMENT_PROMPT = `
You are evaluating a startup from an investor's perspective using the Investor Lens framework.

${generateInvestorLensPrompt()}

Based on the founder's description and the specified stage, provide a comprehensive IC-style evaluation.

IMPORTANT: Return your response in the following JSON format:
{
  "verdict": "yes" | "no" | "not-yet",
  "verdictReason": "1-2 sentence explanation",
  "stage": "pre-seed" | "seed" | "series-a",
  "axisScores": [
    {
      "axis": "Team" | "Market" | "Problem" | "Solution & Differentiation" | "Go-To-Market" | "Traction Quality" | "Business Model" | "Fund Fit" | "Valuation Realism",
      "score": 1-10,
      "notes": "brief assessment"
    }
  ],
  "passReasons": ["reason1", "reason2", "reason3", "reason4", "reason5"],
  "evidenceToFlip": [
    { "passReason": "reason1", "evidenceNeeded": "what would change this" }
  ],
  "hiddenFiltersTriggered": ["filter1", "filter2"],
  "deRiskingActions": ["action1", "action2", "action3"],
  "deckRecommendation": {
    "needed": true | false,
    "type": "summary" | "deck",
    "reason": "explanation"
  },
  "milestoneMap": {
    "timeframe": "30 days" | "6-12 months" | "90 days",
    "milestones": ["milestone1", "milestone2", "milestone3"]
  },
  "summary": "2-3 sentence IC-style summary"
}

Evaluate rigorously as a VC partner would. Do not encourage fundraising by default.
`;

/**
 * POST /api/diagnostic/investor
 * Run an investor readiness evaluation
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalUserId();
    const {
      businessDescription,
      stage,
      traction,
      askAmount,
      additionalContext
    } = await req.json();

    if (!businessDescription || typeof businessDescription !== "string") {
      return NextResponse.json(
        { error: "Business description is required" },
        { status: 400 }
      );
    }

    const investorStage: InvestorStage = stage || "pre-seed";

    if (!["pre-seed", "seed", "series-a"].includes(investorStage)) {
      return NextResponse.json(
        { error: "Invalid stage. Must be pre-seed, seed, or series-a" },
        { status: 400 }
      );
    }

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Please evaluate this startup for ${investorStage} investment readiness:

**Business Description:**
${businessDescription}

**Stage:** ${investorStage}
${traction ? `**Current Traction:** ${traction}` : ""}
${askAmount ? `**Raise Amount:** ${askAmount}` : ""}
${additionalContext ? `**Additional Context:** ${additionalContext}` : ""}

Provide your IC-style evaluation in the specified JSON format.`,
      },
    ];

    const trackedResult = await generateTrackedResponse(
      messages,
      `${FRED_CAREY_SYSTEM_PROMPT}\n\n${INVESTOR_ASSESSMENT_PROMPT}`,
      {
        userId: userId || undefined,
        analyzer: "investor-assessment",
        inputData: { businessDescription, stage: investorStage },
      }
    );

    // Parse the JSON response
    let evaluation;
    try {
      const jsonMatch = trackedResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      return NextResponse.json({
        rawEvaluation: trackedResult.content,
        parseError: true,
        meta: {
          requestId: trackedResult.requestId,
          latencyMs: trackedResult.latencyMs,
        },
      });
    }

    return NextResponse.json({
      evaluation,
      stageCriteria: STAGE_CRITERIA[investorStage],
      vcAxes: CORE_VC_AXES,
      hiddenFilters: HIDDEN_VC_FILTERS,
      meta: {
        requestId: trackedResult.requestId,
        responseId: trackedResult.responseId,
        latencyMs: trackedResult.latencyMs,
      },
    });
  } catch (error) {
    console.error("Investor evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to run investor evaluation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/diagnostic/investor
 * Get investor evaluation framework info
 */
export async function GET() {
  return NextResponse.json({
    stages: Object.keys(STAGE_CRITERIA),
    stageCriteria: STAGE_CRITERIA,
    vcAxes: CORE_VC_AXES,
    hiddenFilters: HIDDEN_VC_FILTERS,
  });
}
