import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { clearConfigCache } from "@/lib/ai/config-loader";
import { isAdminRequest } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/config
 * Get all analyzer configurations
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    logger.log("[Admin Config GET] Fetching all analyzer configs");

    const configs = await sql`
      SELECT
        id,
        analyzer,
        model,
        temperature,
        max_tokens as "maxTokens",
        dimension_weights as "dimensionWeights",
        score_thresholds as "scoreThresholds",
        custom_settings as "customSettings",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ai_config
      ORDER BY analyzer
    `;

    return NextResponse.json({
      success: true,
      configs,
      total: configs.length,
    });
  } catch (error) {
    console.error("[Admin Config GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch configs" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/config
 * Update analyzer settings
 * Body: {
 *   analyzer: string (required),
 *   model?: string,
 *   temperature?: number,
 *   maxTokens?: number,
 *   dimensionWeights?: Record<string, number>,
 *   scoreThresholds?: Record<string, number>,
 *   customSettings?: Record<string, any>
 * }
 */
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      analyzer,
      model,
      temperature,
      maxTokens,
      dimensionWeights,
      scoreThresholds,
      customSettings,
    } = body;

    if (!analyzer) {
      return NextResponse.json(
        { success: false, error: "analyzer is required" },
        { status: 400 }
      );
    }

    logger.log(`[Admin Config PATCH] Updating config for ${analyzer}`, body);

    // Validate temperature if provided
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return NextResponse.json(
        { success: false, error: "temperature must be between 0 and 2" },
        { status: 400 }
      );
    }

    // Validate maxTokens if provided
    if (maxTokens !== undefined && maxTokens < 1) {
      return NextResponse.json(
        { success: false, error: "maxTokens must be positive" },
        { status: 400 }
      );
    }

    // Check there's something to update
    if (
      model === undefined &&
      temperature === undefined &&
      maxTokens === undefined &&
      dimensionWeights === undefined &&
      scoreThresholds === undefined &&
      customSettings === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "No update fields provided" },
        { status: 400 }
      );
    }

    // Use COALESCE pattern for safe parameterized updates (no sql.unsafe needed)
    const result = await sql`
      UPDATE ai_config
      SET
        model = COALESCE(${model !== undefined ? model : null}, model),
        temperature = COALESCE(${temperature !== undefined ? temperature : null}, temperature),
        max_tokens = COALESCE(${maxTokens !== undefined ? maxTokens : null}, max_tokens),
        dimension_weights = COALESCE(${dimensionWeights !== undefined ? JSON.stringify(dimensionWeights) : null}, dimension_weights),
        score_thresholds = COALESCE(${scoreThresholds !== undefined ? JSON.stringify(scoreThresholds) : null}, score_thresholds),
        custom_settings = COALESCE(${customSettings !== undefined ? JSON.stringify(customSettings) : null}, custom_settings),
        updated_at = NOW()
      WHERE analyzer = ${analyzer}
      RETURNING
        id,
        analyzer,
        model,
        temperature,
        max_tokens as "maxTokens",
        dimension_weights as "dimensionWeights",
        score_thresholds as "scoreThresholds",
        custom_settings as "customSettings",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: `Analyzer config not found: ${analyzer}` },
        { status: 404 }
      );
    }

    // Clear the config cache so changes take effect immediately
    clearConfigCache();

    logger.log(
      `[Admin Config PATCH] Updated config for ${analyzer}, cache cleared`
    );

    return NextResponse.json({
      success: true,
      config: result[0],
      message: `Updated ${analyzer} configuration. Cache cleared.`,
    });
  } catch (error) {
    console.error("[Admin Config PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/config
 * Create new analyzer configuration
 * Body: {
 *   analyzer: string (required),
 *   model?: string,
 *   temperature?: number,
 *   maxTokens?: number,
 *   dimensionWeights?: Record<string, number>,
 *   scoreThresholds?: Record<string, number>,
 *   customSettings?: Record<string, any>
 * }
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      analyzer,
      model = "gpt-4-turbo-preview",
      temperature = 0.7,
      maxTokens = 1000,
      dimensionWeights = null,
      scoreThresholds = null,
      customSettings = {},
    } = body;

    if (!analyzer) {
      return NextResponse.json(
        { success: false, error: "analyzer is required" },
        { status: 400 }
      );
    }

    logger.log(`[Admin Config POST] Creating config for ${analyzer}`);

    const result = await sql`
      INSERT INTO ai_config (
        analyzer,
        model,
        temperature,
        max_tokens,
        dimension_weights,
        score_thresholds,
        custom_settings
      )
      VALUES (
        ${analyzer},
        ${model},
        ${temperature},
        ${maxTokens},
        ${dimensionWeights ? JSON.stringify(dimensionWeights) : null},
        ${scoreThresholds ? JSON.stringify(scoreThresholds) : null},
        ${JSON.stringify(customSettings)}
      )
      RETURNING
        id,
        analyzer,
        model,
        temperature,
        max_tokens as "maxTokens",
        dimension_weights as "dimensionWeights",
        score_thresholds as "scoreThresholds",
        custom_settings as "customSettings",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    logger.log(`[Admin Config POST] Created config for ${analyzer}`);

    return NextResponse.json(
      {
        success: true,
        config: result[0],
        message: `Created configuration for ${analyzer}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin Config POST] Error:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "Configuration for this analyzer already exists. Use PATCH to update.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create config" },
      { status: 500 }
    );
  }
}
