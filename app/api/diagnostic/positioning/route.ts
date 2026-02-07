import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { generateTrackedResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  generatePositioningPrompt,
  POSITIONING_CATEGORIES,
  CATEGORY_ORDER,
} from "@/lib/ai/frameworks/positioning";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";
import { sanitizeUserInput, detectInjectionAttempt } from "@/lib/ai/guards/prompt-guard";

const POSITIONING_ASSESSMENT_PROMPT = `
You are evaluating a founder's positioning readiness using the Positioning Readiness Framework.

${generatePositioningPrompt()}

Based on the founder's description of their business, provide a comprehensive assessment.

IMPORTANT: Return your response in the following JSON format:
{
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "narrativeTightnessScore": 1-10,
  "categories": [
    {
      "category": "clarity" | "differentiation" | "market-understanding" | "narrative-strength",
      "grade": "A" | "B" | "C" | "D" | "F",
      "score": 0-100,
      "strengths": ["..."],
      "gaps": ["..."]
    }
  ],
  "topGaps": ["gap1", "gap2", "gap3", "gap4", "gap5"],
  "nextActions": ["action1", "action2", "action3"],
  "summary": "2-3 sentence summary of the positioning assessment"
}

Evaluate rigorously. This is a diagnostic, not encouragement.
`;

/**
 * POST /api/diagnostic/positioning
 * Run a positioning readiness assessment
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalUserId();

    // SECURITY: Rate limit expensive AI diagnostic calls to prevent abuse
    const identifier = userId || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const rateLimitResult = checkRateLimit(`diagnostic:positioning:${identifier}`, {
      limit: 10,
      windowSeconds: 60,
    });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { businessDescription, additionalContext } = await req.json();

    if (!businessDescription || typeof businessDescription !== "string") {
      return NextResponse.json(
        { error: "Business description is required" },
        { status: 400 }
      );
    }

    // SECURITY: Check for prompt injection attempts
    const injectionCheck = detectInjectionAttempt(businessDescription);
    if (injectionCheck.isInjection) {
      return NextResponse.json(
        { error: "Input rejected: potentially harmful content detected" },
        { status: 400 }
      );
    }
    const sanitizedDescription = sanitizeUserInput(businessDescription);

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Please evaluate the positioning readiness for this business:

${sanitizedDescription}

${additionalContext ? `Additional context: ${additionalContext}` : ""}

Provide your assessment in the specified JSON format.`,
      },
    ];

    const trackedResult = await generateTrackedResponse(
      messages,
      `${FRED_CAREY_SYSTEM_PROMPT}\n\n${POSITIONING_ASSESSMENT_PROMPT}`,
      {
        userId: userId || undefined,
        analyzer: "positioning-assessment",
        inputData: { businessDescription },
      }
    );

    // Parse the JSON response
    let assessment;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = trackedResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        assessment = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // If JSON parsing fails, return the raw response
      return NextResponse.json({
        rawAssessment: trackedResult.content,
        parseError: true,
        meta: {
          requestId: trackedResult.requestId,
          latencyMs: trackedResult.latencyMs,
        },
      });
    }

    return NextResponse.json({
      assessment,
      categories: CATEGORY_ORDER.map((cat) => ({
        id: cat,
        ...POSITIONING_CATEGORIES[cat],
      })),
      meta: {
        requestId: trackedResult.requestId,
        responseId: trackedResult.responseId,
        latencyMs: trackedResult.latencyMs,
      },
    });
  } catch (error) {
    console.error("Positioning assessment error:", error);
    return NextResponse.json(
      { error: "Failed to run positioning assessment" },
      { status: 500 }
    );
  }
}
