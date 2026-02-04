import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";

/**
 * Admin authentication check
 * Uses simple header-based authentication for now
 */
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

/**
 * GET /api/admin/ab-tests
 * List all experiments with their variants and latest metrics
 */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("[Admin A/B Tests GET] Fetching all experiments");

    // Get all experiments
    const experiments = await sql`
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
      ORDER BY created_at DESC
    `;

    // Get variants for each experiment with metrics
    const experimentsWithVariants = await Promise.all(
      experiments.map(async (experiment: any) => {
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
            SUM(CASE WHEN resp.error IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(req.id), 0) as "errorRate"
          FROM ab_variants v
          LEFT JOIN ai_requests req ON req.variant_id = v.id
          LEFT JOIN ai_responses resp ON resp.request_id = req.id
          WHERE v.experiment_id = ${experiment.id}
          GROUP BY v.id, v.experiment_id, v.variant_name, v.prompt_id, v.config_overrides, v.traffic_percentage, v.created_at
          ORDER BY v.variant_name
        `;

        // Format the metrics
        const variantsWithMetrics = variants.map((variant: any) => ({
          ...variant,
          totalRequests: parseInt(variant.totalRequests, 10) || 0,
          avgLatency: parseFloat(variant.avgLatency) || null,
          errorRate: parseFloat(variant.errorRate) || null,
        }));

        return {
          ...experiment,
          variants: variantsWithMetrics,
        };
      })
    );

    return NextResponse.json({
      success: true,
      experiments: experimentsWithVariants,
      total: experiments.length,
    });
  } catch (error) {
    console.error("[Admin A/B Tests GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch experiments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ab-tests
 * Create new experiment with control variant
 * Body: {
 *   experimentName: string (required),
 *   description?: string,
 *   controlPromptId?: string,
 *   controlTrafficPercentage?: number (default: 100)
 * }
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      experimentName,
      description = null,
      controlPromptId = null,
      controlTrafficPercentage = 100,
    } = body;

    if (!experimentName) {
      return NextResponse.json(
        { success: false, error: "experimentName is required" },
        { status: 400 }
      );
    }

    if (
      controlTrafficPercentage < 0 ||
      controlTrafficPercentage > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "controlTrafficPercentage must be between 0 and 100",
        },
        { status: 400 }
      );
    }

    console.log(`[Admin A/B Tests POST] Creating experiment: ${experimentName}`);

    // Get user ID from header (optional for now)
    const userId = request.headers.get("x-user-id") || null;

    // Create experiment
    const experimentResult = await sql`
      INSERT INTO ab_experiments (name, description, created_by)
      VALUES (${experimentName}, ${description}, ${userId})
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

    const experiment = experimentResult[0];

    // Create control variant
    const variantResult = await sql`
      INSERT INTO ab_variants (
        experiment_id,
        variant_name,
        prompt_id,
        config_overrides,
        traffic_percentage
      )
      VALUES (
        ${experiment.id},
        'control',
        ${controlPromptId},
        '{}',
        ${controlTrafficPercentage}
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
      `[Admin A/B Tests POST] Created experiment ${experiment.id} with control variant`
    );

    return NextResponse.json(
      {
        success: true,
        experiment: {
          ...experiment,
          variants: [variantResult[0]],
        },
        message: `Created experiment '${experimentName}' with control variant at ${controlTrafficPercentage}% traffic`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin A/B Tests POST] Error:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "An experiment with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create experiment" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ab-tests
 * Update variant traffic allocation or active status
 * Body: {
 *   variantId: string (required),
 *   trafficPercentage?: number,
 *   isActive?: boolean
 * }
 * Validates total traffic across variants doesn't exceed 100%
 */
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { variantId, trafficPercentage, promptId, configOverrides } = body;

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: "variantId is required" },
        { status: 400 }
      );
    }

    console.log(`[Admin A/B Tests PATCH] Updating variant ${variantId}`, body);

    // Get the variant's experiment ID first
    const variantCheck = await sql`
      SELECT experiment_id as "experimentId"
      FROM ab_variants
      WHERE id = ${variantId}
    `;

    if (variantCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Variant not found" },
        { status: 404 }
      );
    }

    const experimentId = variantCheck[0].experimentId;

    // If updating traffic percentage, validate total doesn't exceed 100%
    if (trafficPercentage !== undefined) {
      if (trafficPercentage < 0 || trafficPercentage > 100) {
        return NextResponse.json(
          { success: false, error: "trafficPercentage must be between 0 and 100" },
          { status: 400 }
        );
      }

      // Get sum of other variants' traffic
      const trafficSum = await sql`
        SELECT SUM(traffic_percentage) as "totalTraffic"
        FROM ab_variants
        WHERE experiment_id = ${experimentId}
          AND id != ${variantId}
      `;

      const otherTraffic = parseFloat(trafficSum[0]?.totalTraffic || 0);
      const totalTraffic = otherTraffic + trafficPercentage;

      if (totalTraffic > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Total traffic would be ${totalTraffic}%. Cannot exceed 100%. Other variants use ${otherTraffic}%.`,
          },
          { status: 400 }
        );
      }
    }

    // Build dynamic UPDATE query
    const setters: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (trafficPercentage !== undefined) {
      setters.push(`traffic_percentage = $${paramIndex++}`);
      values.push(trafficPercentage);
    }

    if (promptId !== undefined) {
      setters.push(`prompt_id = $${paramIndex++}`);
      values.push(promptId);
    }

    if (configOverrides !== undefined) {
      setters.push(`config_overrides = $${paramIndex++}`);
      values.push(JSON.stringify(configOverrides));
    }

    if (setters.length === 0) {
      return NextResponse.json(
        { success: false, error: "No update fields provided" },
        { status: 400 }
      );
    }

    values.push(variantId);

    const query = `
      UPDATE ab_variants
      SET ${setters.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        experiment_id as "experimentId",
        variant_name as "variantName",
        prompt_id as "promptId",
        config_overrides as "configOverrides",
        traffic_percentage as "trafficPercentage",
        created_at as "createdAt"
    `;

    // @ts-ignore - sql.unsafe doesn't have proper typing
    const result: any[] = await sql.unsafe(query, values);

    // Get experiment context
    const experimentContext = await sql`
      SELECT name FROM ab_experiments WHERE id = ${experimentId}
    `;

    console.log(`[Admin A/B Tests PATCH] Updated variant ${variantId}`);

    return NextResponse.json({
      success: true,
      variant: result[0],
      experimentName: experimentContext[0]?.name,
      message: `Updated variant for experiment '${experimentContext[0]?.name}'`,
    });
  } catch (error) {
    console.error("[Admin A/B Tests PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update variant" },
      { status: 500 }
    );
  }
}
