import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { logger } from "@/lib/logger";

// Quick clarity check prompt - lightweight diagnostic
const QUICK_CLARITY_CHECK_PROMPT = `You are Fred Carey, a startup advisor. Perform a QUICK positioning clarity check on the provided startup description.

This is a diagnostic signal for a routing flow - NOT a full assessment.

Evaluate ONLY these 3 core clarity signals:
1. Can the value proposition be understood in under 10 seconds?
2. Is the target customer clearly identifiable?
3. Is there a clear problem-solution connection?

Based on these signals, classify the positioning clarity as:
- "high": All 3 signals present - positioning is clear
- "medium": 1-2 signals present - some clarity gaps
- "low": 0-1 signals present - significant clarity issues

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "clarity": "<high/medium/low>",
  "signals": {
    "valuePropositionClear": <boolean>,
    "targetIdentifiable": <boolean>,
    "problemSolutionConnected": <boolean>
  },
  "quickTake": "<one sentence summary of clarity state>",
  "suggestedPath": "<full_assessment/icp_refinement/problem_exploration>"
}

RULES:
- Be decisive - pick the clearest classification
- The quickTake should be direct and useful
- suggestedPath recommendations:
  - "full_assessment" if clarity is high (ready for deep positioning work)
  - "icp_refinement" if target is unclear
  - "problem_exploration" if problem-solution connection is weak`;

interface QuickCheckInput {
  description: string;
}

interface QuickCheckAnalysis {
  clarity: "high" | "medium" | "low";
  signals: {
    valuePropositionClear: boolean;
    targetIdentifiable: boolean;
    problemSolutionConnected: boolean;
  };
  quickTake: string;
  suggestedPath: "full_assessment" | "icp_refinement" | "problem_exploration";
}

/**
 * POST /api/positioning/quick-check
 * Quick positioning clarity check for diagnostic flow routing
 *
 * Returns a low/medium/high clarity signal without full assessment
 * Useful for determining which diagnostic path a founder should take
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    // SECURITY: Require Pro tier for Positioning quick check
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const body: QuickCheckInput = await request.json();
    const { description } = body;

    // Validation
    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    if (description.trim().length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide more details (minimum 20 characters)",
        },
        { status: 400 }
      );
    }

    if (description.trim().length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Description is too long (maximum 2000 characters)",
        },
        { status: 400 }
      );
    }

    logger.log("[Positioning Quick Check] Checking clarity for user:", userId);

    // Generate quick clarity check
    const trackedResult = await generateTrackedResponse(
      [
        {
          role: "user",
          content: `Startup description:\n\n${description.trim()}`,
        },
      ],
      QUICK_CLARITY_CHECK_PROMPT,
      {
        userId,
        analyzer: "positioning_quick_check",
        inputData: { description: description.trim() },
      }
    );

    const aiResponse = trackedResult.content;

    // Parse AI response
    let analysis: QuickCheckAnalysis;
    try {
      analysis = extractJSON<QuickCheckAnalysis>(aiResponse);

      // Validate structure
      if (!analysis.clarity || !analysis.signals || !analysis.quickTake) {
        throw new Error("Invalid AI response structure");
      }

      // Validate clarity value
      if (!["high", "medium", "low"].includes(analysis.clarity)) {
        throw new Error(`Invalid clarity value: ${analysis.clarity}`);
      }

      // Validate suggested path
      const validPaths = [
        "full_assessment",
        "icp_refinement",
        "problem_exploration",
      ];
      if (!validPaths.includes(analysis.suggestedPath)) {
        // Default based on clarity
        analysis.suggestedPath =
          analysis.clarity === "high"
            ? "full_assessment"
            : analysis.clarity === "medium"
            ? "icp_refinement"
            : "problem_exploration";
      }
    } catch (parseError) {
      console.error(
        "[Positioning Quick Check] AI response parse error:",
        parseError
      );
      console.error("[Positioning Quick Check] Raw AI response:", aiResponse);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to check positioning clarity. Please try again.",
          details:
            process.env.NODE_ENV === "development" ? aiResponse : undefined,
        },
        { status: 500 }
      );
    }

    logger.log(
      "[Positioning Quick Check] Clarity:",
      analysis.clarity,
      "Path:",
      analysis.suggestedPath
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          clarity: analysis.clarity,
          signals: analysis.signals,
          quickTake: analysis.quickTake,
          suggestedPath: analysis.suggestedPath,
        },
        meta: {
          requestId: trackedResult.requestId,
          responseId: trackedResult.responseId,
          latencyMs: trackedResult.latencyMs,
          variant: trackedResult.variant,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Positioning Quick Check] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check positioning clarity. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
