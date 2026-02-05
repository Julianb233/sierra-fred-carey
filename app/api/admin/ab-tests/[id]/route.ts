import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";

/**
 * Admin authentication check
 * Uses simple header-based authentication for now
 */
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

/**
 * GET /api/admin/ab-tests/[id]
 * Get single experiment with all variants and detailed metrics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;

    console.log(`[Admin A/B Test GET] Fetching experiment ${experimentId}`);

    // Get experiment
    const experimentResult = await sql`
      SELECT
        id,
        name,
        description,
        start_date as "startDate",
        end_date as "endDate",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy"
      FROM ab_experiments
      WHERE id = ${experimentId}
    `;

    if (experimentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experiment = experimentResult[0];

    // Get variants with detailed metrics
    const variants = await sql`
      SELECT
        v.id,
        v.experiment_id as "experimentId",
        v.variant_name as "variantName",
        v.prompt_id as "promptId",
        v.config_overrides as "configOverrides",
        v.traffic_percentage as "trafficPercentage",
        v.created_at as "createdAt",
        COUNT(req.id) as "totalRequests",
        AVG(resp.latency_ms) as "avgLatency",
        MIN(resp.latency_ms) as "minLatency",
        MAX(resp.latency_ms) as "maxLatency",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resp.latency_ms) as "p50Latency",
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY resp.latency_ms) as "p95Latency",
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY resp.latency_ms) as "p99Latency",
        SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(req.id), 0) as "errorRate",
        AVG(resp.tokens_used) as "avgTokensUsed",
        SUM(resp.tokens_used) as "totalTokensUsed"
      FROM ab_variants v
      LEFT JOIN ai_requests req ON req.variant_id = v.id
      LEFT JOIN ai_responses resp ON resp.request_id = req.id
      WHERE v.experiment_id = ${experimentId}
      GROUP BY v.id, v.experiment_id, v.variant_name, v.prompt_id, v.config_overrides, v.traffic_percentage, v.created_at
      ORDER BY v.variant_name
    `;

    // Format the metrics
    const variantsWithMetrics = variants.map((variant: any) => ({
      ...variant,
      totalRequests: parseInt(variant.totalRequests, 10) || 0,
      avgLatency: parseFloat(variant.avgLatency) || null,
      minLatency: parseFloat(variant.minLatency) || null,
      maxLatency: parseFloat(variant.maxLatency) || null,
      p50Latency: parseFloat(variant.p50Latency) || null,
      p95Latency: parseFloat(variant.p95Latency) || null,
      p99Latency: parseFloat(variant.p99Latency) || null,
      errorRate: parseFloat(variant.errorRate) || null,
      avgTokensUsed: parseFloat(variant.avgTokensUsed) || null,
      totalTokensUsed: parseInt(variant.totalTokensUsed, 10) || 0,
    }));

    // Get prompt details for variants that have prompt_id
    const variantsWithPrompts = await Promise.all(
      variantsWithMetrics.map(async (variant: any) => {
        if (variant.promptId) {
          const promptResult = await sql`
            SELECT
              id,
              name,
              version,
              is_active as "isActive"
            FROM ai_prompts
            WHERE id = ${variant.promptId}
          `;

          return {
            ...variant,
            prompt: promptResult[0] || null,
          };
        }
        return variant;
      })
    );

    return NextResponse.json({
      success: true,
      experiment: {
        ...experiment,
        variants: variantsWithPrompts,
      },
    });
  } catch (error) {
    console.error("[Admin A/B Test GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch experiment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ab-tests/[id]
 * End experiment (deactivate all variants and set end_date)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;

    console.log(`[Admin A/B Test DELETE] Ending experiment ${experimentId}`);

    // Check if experiment exists
    const experimentCheck = await sql`
      SELECT id, name FROM ab_experiments WHERE id = ${experimentId}
    `;

    if (experimentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experimentName = experimentCheck[0].name;

    // End the experiment
    await sql`
      UPDATE ab_experiments
      SET
        is_active = false,
        end_date = NOW()
      WHERE id = ${experimentId}
    `;

    console.log(`[Admin A/B Test DELETE] Ended experiment ${experimentName}`);

    return NextResponse.json({
      success: true,
      message: `Ended experiment '${experimentName}'. All variants deactivated.`,
      experimentId,
      experimentName,
    });
  } catch (error) {
    console.error("[Admin A/B Test DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to end experiment" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ab-tests/[id]
 * Update experiment metadata
 * Body: {
 *   description?: string,
 *   isActive?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;
    const body = await request.json();
    const { description, isActive } = body;

    console.log(`[Admin A/B Test PATCH] Updating experiment ${experimentId}`, body);

    // Check if experiment exists
    const experimentCheck = await sql`
      SELECT id, name FROM ab_experiments WHERE id = ${experimentId}
    `;

    if (experimentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    // Build dynamic UPDATE query
    const setters: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (description !== undefined) {
      setters.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (isActive !== undefined) {
      setters.push(`is_active = $${paramIndex++}`);
      values.push(isActive);

      // If deactivating, set end_date
      if (!isActive) {
        setters.push(`end_date = NOW()`);
      } else {
        // If reactivating, clear end_date
        setters.push(`end_date = NULL`);
      }
    }

    if (setters.length === 0) {
      return NextResponse.json(
        { success: false, error: "No update fields provided" },
        { status: 400 }
      );
    }

    values.push(experimentId);

    const query = `
      UPDATE ab_experiments
      SET ${setters.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        name,
        description,
        start_date as "startDate",
        end_date as "endDate",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy"
    `;

    // @ts-ignore - sql.unsafe doesn't have proper typing
    const result: any[] = await sql.unsafe(query, values);

    console.log(`[Admin A/B Test PATCH] Updated experiment ${experimentId}`);

    return NextResponse.json({
      success: true,
      experiment: result[0],
      message: `Updated experiment '${result[0].name}'`,
    });
  } catch (error) {
    console.error("[Admin A/B Test PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update experiment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ab-tests/[id]/variants
 * Add a new variant to an existing experiment
 * Body: {
 *   variantName: string (required),
 *   promptId?: string,
 *   configOverrides?: Record<string, any>,
 *   trafficPercentage: number (required)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id: experimentId } = await params;
    const body = await request.json();
    const {
      variantName,
      promptId = null,
      configOverrides = {},
      trafficPercentage,
    } = body;

    if (!variantName || trafficPercentage === undefined) {
      return NextResponse.json(
        { success: false, error: "variantName and trafficPercentage are required" },
        { status: 400 }
      );
    }

    if (trafficPercentage < 0 || trafficPercentage > 100) {
      return NextResponse.json(
        { success: false, error: "trafficPercentage must be between 0 and 100" },
        { status: 400 }
      );
    }

    console.log(
      `[Admin A/B Test POST Variant] Adding variant ${variantName} to experiment ${experimentId}`
    );

    // Check if experiment exists
    const experimentCheck = await sql`
      SELECT id, name FROM ab_experiments WHERE id = ${experimentId}
    `;

    if (experimentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    // Check total traffic doesn't exceed 100%
    const trafficSum = await sql`
      SELECT SUM(traffic_percentage) as "totalTraffic"
      FROM ab_variants
      WHERE experiment_id = ${experimentId}
    `;

    const currentTraffic = parseFloat(trafficSum[0]?.totalTraffic || 0);
    const totalTraffic = currentTraffic + trafficPercentage;

    if (totalTraffic > 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Total traffic would be ${totalTraffic}%. Cannot exceed 100%. Current variants use ${currentTraffic}%.`,
        },
        { status: 400 }
      );
    }

    // Create the variant
    const result = await sql`
      INSERT INTO ab_variants (
        experiment_id,
        variant_name,
        prompt_id,
        config_overrides,
        traffic_percentage
      )
      VALUES (
        ${experimentId},
        ${variantName},
        ${promptId},
        ${JSON.stringify(configOverrides)},
        ${trafficPercentage}
      )
      RETURNING
        id,
        experiment_id as "experimentId",
        variant_name as "variantName",
        prompt_id as "promptId",
        config_overrides as "configOverrides",
        traffic_percentage as "trafficPercentage",
        created_at as "createdAt"
    `;

    console.log(
      `[Admin A/B Test POST Variant] Created variant ${variantName} for experiment ${experimentCheck[0].name}`
    );

    return NextResponse.json(
      {
        success: true,
        variant: result[0],
        experimentName: experimentCheck[0].name,
        message: `Added variant '${variantName}' to experiment '${experimentCheck[0].name}'`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin A/B Test POST Variant] Error:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "A variant with this name already exists in this experiment",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create variant" },
      { status: 500 }
    );
  }
}
