/**
 * Quick Reality Lens API Endpoint
 *
 * POST /api/fred/reality-lens/quick
 * Perform a quick 6-question reality check and determine initial Oases stage.
 *
 * GET /api/fred/reality-lens/quick
 * Check if user has already completed the Quick Reality Lens.
 *
 * Rate limits:
 * - Free: 3 assessments per day
 * - Pro: 10 assessments per day
 * - Studio: 50 assessments per day
 *
 * Phase 81: Reality Lens First
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserTier as getUserTierFromSubscription } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import {
  checkRateLimit,
  applyRateLimitHeaders,
  createRateLimitResponse,
} from "@/lib/api/rate-limit";
import {
  quickAssessIdea,
  QuickAnswersSchema,
  type QuickAnswers,
} from "@/lib/fred/reality-lens-quick";
import {
  markRealityLensComplete,
  getRealityLensStatus,
} from "@/lib/db/reality-lens-state";

// ============================================================================
// Rate Limit Configuration
// ============================================================================

const QUICK_LENS_RATE_LIMITS = {
  free: { limit: 3, windowSeconds: 86400 },
  pro: { limit: 10, windowSeconds: 86400 },
  studio: { limit: 50, windowSeconds: 86400 },
} as const;

type QuickLensTier = keyof typeof QUICK_LENS_RATE_LIMITS;

async function getUserTier(userId: string): Promise<QuickLensTier> {
  try {
    const tier = await getUserTierFromSubscription(userId);
    const tierMap: Record<number, QuickLensTier> = {
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
// POST -- Run Quick Assessment
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const userId = await requireAuth();
    const tier = await getUserTier(userId);

    // Rate limit
    const rateConfig = {
      ...QUICK_LENS_RATE_LIMITS[tier],
      identifier: "user" as const,
    };
    const identifier = `quick-reality-lens:${userId}`;
    const rateLimitResult = await checkRateLimit(identifier, rateConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse body
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

    // Validate answers
    const parsed = QuickAnswersSchema.safeParse(
      (body as Record<string, unknown>)?.answers ?? body
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.issues.map(
              (e) => `${e.path.join(".")}: ${e.message}`
            ),
          },
        },
        { status: 400 }
      );
    }

    const answers: QuickAnswers = parsed.data;

    // Run assessment
    const result = await quickAssessIdea(answers);

    // Persist to profiles (non-blocking error handling)
    try {
      await markRealityLensComplete(userId, result.stage, result.overallScore);
    } catch (saveErr) {
      console.error(
        "[Quick Reality Lens API] Failed to persist stage:",
        saveErr
      );
      // Don't fail the request -- the assessment result is still useful
    }

    const latencyMs = Date.now() - startTime;

    const response = NextResponse.json({
      success: true,
      data: result,
      meta: {
        latencyMs,
        tier,
        rateLimitRemaining: rateLimitResult.remaining,
      },
    });

    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error) {
    if (error instanceof Response) {
      return error as NextResponse;
    }

    console.error("[Quick Reality Lens API] Error:", error);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Quick assessment failed",
        },
        meta: { latencyMs },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET -- Check Completion Status
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const status = await getRealityLensStatus(userId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error as NextResponse;
    }

    console.error("[Quick Reality Lens API] GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get status",
        },
      },
      { status: 500 }
    );
  }
}
