import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/admin";
import {
  scanAndPromoteWinners,
  promoteWinner,
  checkPromotionEligibility,
  rollbackPromotion,
} from "@/lib/experiments/auto-promotion-engine";
import {
  loadAutoPromotionConfig,
  validateAutoPromotionConfig,
} from "@/lib/experiments/auto-promotion-config";

/**
 * POST /api/experiments/auto-promote
 * Trigger auto-promotion for experiments
 * 
 * Body params:
 *   - action: "scan" | "promote" | "check" | "rollback"
 *   - experimentName: string (for promote/check actions)
 *   - promotionId: string (for rollback action)
 *   - reason: string (for rollback action)
 *   - config: Partial<AutoPromotionConfig> (optional overrides)
 *   - preset: "aggressive" | "conservative" | "balanced" (optional)
 *   - dryRun: boolean (optional)
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, experimentName, promotionId, reason, config, preset, dryRun } = body;

    // Load configuration
    let finalConfig = loadAutoPromotionConfig(preset);

    // Apply config overrides
    if (config) {
      finalConfig = { ...finalConfig, ...config };
    }

    // Apply dry run override
    if (typeof dryRun === "boolean") {
      finalConfig.dryRun = dryRun;
    }

    // Validate configuration
    const validation = validateAutoPromotionConfig(finalConfig);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid configuration",
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    switch (action) {
      case "scan":
        // Scan all experiments and promote eligible winners
        const scanResults = await scanAndPromoteWinners(finalConfig);
        return NextResponse.json({
          success: true,
          action: "scan",
          data: scanResults,
          config: {
            enabled: finalConfig.enabled,
            dryRun: finalConfig.dryRun,
            preset,
          },
          timestamp: new Date().toISOString(),
        });

      case "promote":
        // Promote specific experiment
        if (!experimentName) {
          return NextResponse.json(
            {
              success: false,
              error: "experimentName is required for promote action",
            },
            { status: 400 }
          );
        }

        const promotionResult = await promoteWinner(experimentName, finalConfig);
        return NextResponse.json({
          success: promotionResult.success,
          action: "promote",
          data: promotionResult,
          timestamp: new Date().toISOString(),
        });

      case "check":
        // Check eligibility without promoting
        if (!experimentName) {
          return NextResponse.json(
            {
              success: false,
              error: "experimentName is required for check action",
            },
            { status: 400 }
          );
        }

        const eligibility = await checkPromotionEligibility(
          experimentName,
          finalConfig
        );
        return NextResponse.json({
          success: true,
          action: "check",
          data: eligibility,
          timestamp: new Date().toISOString(),
        });

      case "rollback":
        // Rollback a promotion
        if (!promotionId || !reason) {
          return NextResponse.json(
            {
              success: false,
              error: "promotionId and reason are required for rollback action",
            },
            { status: 400 }
          );
        }

        const rollbackResult = await rollbackPromotion(promotionId, reason);
        return NextResponse.json({
          success: rollbackResult.success,
          action: "rollback",
          data: rollbackResult,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid actions: scan, promote, check, rollback`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("[Auto-Promote API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/experiments/auto-promote
 * Get auto-promotion configuration and status
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const preset = searchParams.get("preset") || undefined;

    const config = loadAutoPromotionConfig(preset);
    const validation = validateAutoPromotionConfig(config);

    return NextResponse.json({
      success: true,
      data: {
        config,
        validation,
        presets: ["aggressive", "conservative", "balanced"],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Auto-Promote API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
