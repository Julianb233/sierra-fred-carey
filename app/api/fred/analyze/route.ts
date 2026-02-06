/**
 * FRED Analyze API Endpoint
 *
 * POST /api/fred/analyze
 * Analyze a message/question using FRED's cognitive framework.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createFredService } from "@/lib/fred/service";
import { checkRateLimitForUser, applyRateLimitHeaders, RATE_LIMIT_TIERS } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// ============================================================================
// Request Schema
// ============================================================================

const analyzeRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(10000),
  context: z
    .object({
      startupName: z.string().optional(),
      stage: z.string().optional(),
      industry: z.string().optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
  sessionId: z.string().uuid().optional(),
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
      checkRateLimitForUser(req, userId, rateLimitKey);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await req.json();
    const parsed = analyzeRequestSchema.safeParse(body);

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

    const { message, context, sessionId } = parsed.data;
    const effectiveSessionId = sessionId || crypto.randomUUID();

    // Create FRED service and process the message
    const fredService = createFredService({
      userId,
      sessionId: effectiveSessionId,
      enableObservability: true,
    });

    const result = await fredService.process({
      message,
      timestamp: new Date(),
      context,
    });

    const latencyMs = Date.now() - startTime;

    // Extract analysis details
    const response = NextResponse.json({
      success: true,
      sessionId: effectiveSessionId,
      analysis: {
        intent: result.context.validatedInput?.intent || "unknown",
        confidence: result.context.validatedInput?.confidence || 0,
        entities: result.context.validatedInput?.entities || [],
        clarificationNeeded: result.context.validatedInput?.clarificationNeeded || [],
      },
      mentalModels: (result.context.mentalModels || []).map((m) => ({
        model: m.model,
        relevance: m.relevance,
        confidence: m.confidence,
        insights: m.insights,
      })),
      synthesis: result.context.synthesis
        ? {
            recommendation: result.context.synthesis.recommendation,
            confidence: result.context.synthesis.confidence,
            reasoning: result.context.synthesis.reasoning,
            alternatives: result.context.synthesis.alternatives,
          }
        : null,
      response: {
        content: result.response.content,
        action: result.response.action,
        confidence: result.response.confidence,
        requiresApproval: result.response.requiresApproval,
      },
      meta: {
        latencyMs,
        finalState: result.finalState,
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

    console.error("[FRED Analyze] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
