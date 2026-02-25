/**
 * Reality Lens Assessment API Endpoint
 *
 * POST /api/fred/reality-lens
 * Perform a 5-factor Reality Lens assessment on a startup idea.
 *
 * Rate limits by tier:
 * - Free: 5 assessments per day
 * - Pro: 50 assessments per day
 * - Studio: Unlimited
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserTier as getUserTierFromSubscription } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import {
  checkRateLimit,
  applyRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitResult,
} from "@/lib/api/rate-limit";
import {
  assessIdea,
  validateInput,
  type RealityLensInput,
} from "@/lib/fred/reality-lens";

// ============================================================================
// Rate Limit Configuration
// ============================================================================

// Reality Lens has more restrictive rate limits (expensive AI calls)
const REALITY_LENS_RATE_LIMITS = {
  free: { limit: 5, windowSeconds: 86400 }, // 5 per day
  pro: { limit: 50, windowSeconds: 86400 }, // 50 per day
  studio: { limit: 500, windowSeconds: 86400 }, // 500 per day (effectively unlimited)
} as const;

type RealityLensTier = keyof typeof REALITY_LENS_RATE_LIMITS;

/**
 * Get user's subscription tier from Stripe via tier-middleware
 */
async function getUserTier(userId: string): Promise<RealityLensTier> {
  try {
    const tier = await getUserTierFromSubscription(userId);
    const tierMap: Record<number, RealityLensTier> = {
      [UserTier.FREE]: "free",
      [UserTier.PRO]: "pro",
      [UserTier.STUDIO]: "studio",
    };
    return tierMap[tier] || "free";
  } catch {
    return "free";
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Require authentication
    const userId = await requireAuth();

    // Get user's subscription tier
    const tier = await getUserTier(userId);

    // Check rate limit for this specific endpoint
    const rateConfig = {
      ...REALITY_LENS_RATE_LIMITS[tier],
      identifier: "user" as const,
    };
    const identifier = `reality-lens:${userId}`;
    const rateLimitResult = await checkRateLimit(identifier, rateConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const input: RealityLensInput = {
      ...validation.data,
      userId,
    };

    // Perform assessment
    const result = await assessIdea(input);

    // Persist results to DB (non-blocking - don't fail the request if save fails)
    (async () => {
      try {
        const { sql } = await import("@/lib/db/supabase-sql");
        const f = result.factors;

        // Save to reality_lens_analyses table
        await sql`
          INSERT INTO reality_lens_analyses (
            user_id, idea, stage, market,
            overall_score,
            feasibility_score, feasibility_analysis,
            economics_score, economics_analysis,
            demand_score, demand_analysis,
            distribution_score, distribution_analysis,
            timing_score, timing_analysis,
            strengths, weaknesses, recommendations
          ) VALUES (
            ${userId},
            ${input.idea},
            ${input.context?.stage || null},
            ${input.context?.targetMarket || null},
            ${result.overallScore},
            ${f.feasibility.score}, ${f.feasibility.summary},
            ${f.economics.score}, ${f.economics.summary},
            ${f.demand.score}, ${f.demand.summary},
            ${f.distribution.score}, ${f.distribution.summary},
            ${f.timing.score}, ${f.timing.summary},
            ${JSON.stringify(result.topStrengths)},
            ${JSON.stringify(result.criticalRisks)},
            ${JSON.stringify(result.nextSteps)}
          )
        `;

        // Log journey event so the Journey dashboard Idea Score updates
        await sql`
          INSERT INTO journey_events (user_id, event_type, event_data, score_after)
          VALUES (
            ${userId},
            'analysis_completed',
            ${JSON.stringify({
              assessmentId: result.metadata.assessmentId,
              verdict: result.verdict,
              idea: input.idea.slice(0, 200),
            })},
            ${result.overallScore}
          )
        `;
      } catch (saveErr) {
        console.error("[Reality Lens API] Failed to persist results:", saveErr);
      }
    })();

    const latencyMs = Date.now() - startTime;

    // Build response
    const response = NextResponse.json({
      success: true,
      data: result,
      meta: {
        latencyMs,
        tier,
        rateLimitRemaining: rateLimitResult.remaining,
        rateLimitReset: rateLimitResult.reset,
      },
    });

    // Apply rate limit headers
    applyRateLimitHeaders(response, rateLimitResult);

    return response;
  } catch (error) {
    // Handle auth errors (NextResponse thrown by requireAuth)
    if (error instanceof Response) {
      return error as NextResponse;
    }

    console.error("[Reality Lens API] Error:", error);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Assessment failed",
        },
        meta: {
          latencyMs,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fred/reality-lens
 * Returns feature info (default) or user's analysis history (?history=true)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wantsHistory = searchParams.get("history") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    // History endpoint requires authentication
    if (wantsHistory) {
      const userId = await requireAuth();
      const { createServiceClient } = await import("@/lib/supabase/server");
      const supabase = createServiceClient();

      const { data, error } = await supabase
        .from("reality_lens_analyses")
        .select("id, idea, stage, market, overall_score, feasibility_score, economics_score, demand_score, distribution_score, timing_score, strengths, weaknesses, recommendations, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[Reality Lens API] History query failed:", error);
        return NextResponse.json(
          { success: false, error: { code: "QUERY_ERROR", message: "Failed to load history" } },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: (data || []).map((row) => ({
          id: row.id,
          idea: row.idea,
          stage: row.stage,
          market: row.market,
          overallScore: row.overall_score,
          scores: {
            feasibility: row.feasibility_score,
            economics: row.economics_score,
            demand: row.demand_score,
            distribution: row.distribution_score,
            timing: row.timing_score,
          },
          strengths: row.strengths || [],
          weaknesses: row.weaknesses || [],
          recommendations: row.recommendations || [],
          createdAt: row.created_at,
        })),
      });
    }

    // Default: return feature info
    // Optionally check auth for personalized limits
    let userId: string | null = null;
    let tier: RealityLensTier = "free";
    let rateLimitResult: RateLimitResult | null = null;

    try {
      userId = await requireAuth();
      tier = await getUserTier(userId);

      // Check current rate limit status (without consuming)
      const rateConfig = {
        ...REALITY_LENS_RATE_LIMITS[tier],
        identifier: "user" as const,
      };
      const identifier = `reality-lens:${userId}`;

      // Get current status without incrementing
      rateLimitResult = {
        success: true,
        limit: rateConfig.limit,
        remaining: rateConfig.limit, // Would need to check store for actual remaining
        reset: rateConfig.windowSeconds,
      };
    } catch {
      // Not authenticated, return general info
    }

    return NextResponse.json({
      success: true,
      data: {
        name: "Reality Lens",
        description:
          "5-factor startup assessment engine that evaluates feasibility, economics, demand, distribution, and timing.",
        version: "1.0",
        factors: [
          {
            name: "Feasibility",
            weight: 0.2,
            description:
              "Can this actually be built with available resources?",
          },
          {
            name: "Economics",
            weight: 0.25,
            description: "Do the unit economics work? Is it fundable?",
          },
          {
            name: "Demand",
            weight: 0.25,
            description:
              "Is there real market demand? Evidence of willingness to pay?",
          },
          {
            name: "Distribution",
            weight: 0.15,
            description: "Can you reach customers? What channels exist?",
          },
          {
            name: "Timing",
            weight: 0.15,
            description: "Is the market ready? Not too early, not too late?",
          },
        ],
        verdicts: [
          { name: "strong", range: "80-100", description: "Proceed with confidence" },
          { name: "promising", range: "60-79", description: "Good potential, address weaknesses" },
          { name: "needs-work", range: "40-59", description: "Significant concerns to resolve" },
          { name: "reconsider", range: "0-39", description: "Fundamental issues, consider pivoting" },
        ],
        rateLimits: {
          tier,
          limit: REALITY_LENS_RATE_LIMITS[tier].limit,
          windowSeconds: REALITY_LENS_RATE_LIMITS[tier].windowSeconds,
          windowDescription:
            REALITY_LENS_RATE_LIMITS[tier].windowSeconds === 86400
              ? "per day"
              : `per ${REALITY_LENS_RATE_LIMITS[tier].windowSeconds} seconds`,
          remaining: rateLimitResult?.remaining,
        },
        inputSchema: {
          idea: {
            type: "string",
            required: true,
            minLength: 10,
            maxLength: 5000,
            description: "Description of the startup idea to assess",
          },
          context: {
            type: "object",
            required: false,
            properties: {
              stage: {
                type: "enum",
                values: ["idea", "mvp", "launched", "scaling"],
              },
              funding: {
                type: "enum",
                values: [
                  "bootstrapped",
                  "pre-seed",
                  "seed",
                  "series-a",
                  "series-b-plus",
                ],
              },
              teamSize: { type: "number", min: 1, max: 10000 },
              industry: { type: "string", maxLength: 100 },
              targetMarket: { type: "string", maxLength: 500 },
              mrr: { type: "number", min: 0, description: "Monthly recurring revenue in USD" },
              customerCount: { type: "number", min: 0 },
              runwayMonths: { type: "number", min: 0 },
            },
          },
        },
      },
    });
  } catch (error) {
    // Handle auth errors (NextResponse thrown by requireAuth)
    if (error instanceof Response) {
      return error as NextResponse;
    }
    console.error("[Reality Lens API] GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get Reality Lens info",
        },
      },
      { status: 500 }
    );
  }
}
