/**
 * FRED Decide API Endpoint
 *
 * POST /api/fred/decide
 * Get a scored decision recommendation using FRED's 7-factor scoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createFredService } from "@/lib/fred/service";
import {
  scoreDecision,
  detectDecisionType,
  recordPrediction,
  type DecisionContext,
} from "@/lib/fred/scoring";
import { checkRateLimitForUser, applyRateLimitHeaders, RATE_LIMIT_TIERS } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { sanitizeUserInput, detectInjectionAttempt } from "@/lib/ai/guards/prompt-guard";

// ============================================================================
// Request Schema
// ============================================================================

const decideRequestSchema = z.object({
  decision: z.string().min(1, "Decision question is required").max(10000),
  decisionType: z
    .enum([
      "fundraising",
      "product",
      "hiring",
      "partnership",
      "marketing",
      "pricing",
      "operations",
      "general",
    ])
    .optional(),
  context: z.object({
    startupName: z.string().optional(),
    stage: z.string().optional(),
    industry: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }),
  sessionId: z.string().uuid().optional(),
  trackCalibration: z.boolean().default(false),
});

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Require authentication
    const userId = await requireAuth();

    // Check rate limit using actual user tier
    const TIER_TO_RATE_KEY: Record<UserTier, keyof typeof RATE_LIMIT_TIERS> = {
      [UserTier.FREE]: "free",
      [UserTier.PRO]: "pro",
      [UserTier.STUDIO]: "studio",
    };
    const userTier = await getUserTier(userId);
    const rateLimitKey = TIER_TO_RATE_KEY[userTier] ?? "free";
    const { response: rateLimitResponse, result: rateLimitResult } =
      await checkRateLimitForUser(req, userId, rateLimitKey);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await req.json();
    const parsed = decideRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { decision: rawDecision, decisionType, context, sessionId, trackCalibration } =
      parsed.data;

    // Prompt injection guard
    const injectionCheck = detectInjectionAttempt(rawDecision);
    if (injectionCheck.isInjection) {
      return NextResponse.json(
        { success: false, error: "Your message could not be processed. Please rephrase and try again." },
        { status: 400 }
      );
    }

    const decision = sanitizeUserInput(rawDecision);
    const effectiveSessionId = sessionId || crypto.randomUUID();

    // Detect decision type if not provided
    const detectedType = decisionType
      ? { id: decisionType }
      : detectDecisionType(decision);

    // Build decision context for scoring
    const scoringContext: DecisionContext = {
      startupName: context.startupName,
      stage: context.stage,
      industry: context.industry,
      goals: context.goals,
    };

    // Score the decision using 7-factor scoring engine
    const scores = await scoreDecision(decision, scoringContext, {
      useAI: true,
    });

    // Also run through FRED's cognitive pipeline for full analysis
    const fredService = createFredService({
      userId,
      sessionId: effectiveSessionId,
      enableObservability: true,
    });

    const result = await fredService.process({
      message: decision,
      timestamp: new Date(),
      context: {
        ...context,
        isDecisionRequest: true,
        decisionType: detectedType.id,
      },
    });

    const latencyMs = Date.now() - startTime;

    // Build the decision ID for calibration tracking
    const decisionId = crypto.randomUUID();

    // Track for calibration if requested
    if (trackCalibration) {
      try {
        await recordPrediction(userId, decisionId, scores, detectedType.id);
      } catch (error) {
        console.warn("[FRED Decide] Failed to record calibration:", error);
      }
    }

    const response = NextResponse.json({
      success: true,
      decisionId,
      sessionId: effectiveSessionId,
      decisionType: detectedType.id,
      scores: {
        composite: scores.percentage,
        confidence: scores.confidence,
        recommendation: scores.recommendation,
        uncertaintyRange: scores.uncertaintyRange,
        factors: {
          strategicAlignment: {
            value: scores.factors.strategicAlignment.value,
            weight: scores.factors.strategicAlignment.weight,
            reasoning: scores.factors.strategicAlignment.reasoning,
          },
          leverage: {
            value: scores.factors.leverage.value,
            weight: scores.factors.leverage.weight,
            reasoning: scores.factors.leverage.reasoning,
          },
          speed: {
            value: scores.factors.speed.value,
            weight: scores.factors.speed.weight,
            reasoning: scores.factors.speed.reasoning,
          },
          revenue: {
            value: scores.factors.revenue.value,
            weight: scores.factors.revenue.weight,
            reasoning: scores.factors.revenue.reasoning,
          },
          time: {
            value: scores.factors.time.value,
            weight: scores.factors.time.weight,
            reasoning: scores.factors.time.reasoning,
          },
          risk: {
            value: scores.factors.risk.value,
            weight: scores.factors.risk.weight,
            reasoning: scores.factors.risk.reasoning,
          },
          relationships: {
            value: scores.factors.relationships.value,
            weight: scores.factors.relationships.weight,
            reasoning: scores.factors.relationships.reasoning,
          },
        },
        summary: scores.summary,
      },
      analysis: {
        recommendation: result.context.synthesis?.recommendation || "",
        reasoning: result.context.synthesis?.reasoning || "",
        alternatives: result.context.synthesis?.alternatives || [],
        risks: result.context.synthesis?.risks || [],
        assumptions: result.context.synthesis?.assumptions || [],
        nextSteps: result.context.synthesis?.nextSteps || [],
      },
      response: {
        content: result.response.content,
        action: result.response.action,
        confidence: result.response.confidence,
        requiresApproval: result.response.requiresApproval,
      },
      meta: {
        latencyMs,
        finalState: result.finalState,
        calibrationTracked: trackCalibration,
      },
    });

    // Apply rate limit headers
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error) {
    // Check if it's an auth error (Response thrown by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    console.error("[FredDecide] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
