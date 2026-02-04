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
 * PATCH /api/admin/ab-tests/[id]/traffic
 * Adjust traffic allocation for experiment variants
 * Body: {
 *   variantAllocations: Array<{ variantId: string, trafficPercentage: number }>
 * }
 * Validates that total traffic equals 100%
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
    const { variantAllocations } = body;

    if (!Array.isArray(variantAllocations) || variantAllocations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "variantAllocations must be a non-empty array of { variantId, trafficPercentage }",
        },
        { status: 400 }
      );
    }

    console.log(`[Admin A/B Traffic] Adjusting traffic for experiment ${experimentId}`);

    // Check if experiment exists and is active
    const experimentCheck = await sql`
      SELECT id, name, is_active as "isActive" FROM ab_experiments WHERE id = ${experimentId}
    `;

    if (experimentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Experiment not found" },
        { status: 404 }
      );
    }

    const experimentName = experimentCheck[0].name;
    const isActive = experimentCheck[0].isActive;

    if (!isActive) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot adjust traffic for inactive experiment '${experimentName}'`,
        },
        { status: 400 }
      );
    }

    // Validate all percentages
    let totalPercentage = 0;
    for (const allocation of variantAllocations) {
      const { variantId, trafficPercentage } = allocation;

      if (!variantId || trafficPercentage === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: "Each allocation must have variantId and trafficPercentage",
          },
          { status: 400 }
        );
      }

      if (trafficPercentage < 0 || trafficPercentage > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Traffic percentage must be between 0 and 100 (got ${trafficPercentage} for variant ${variantId})`,
          },
          { status: 400 }
        );
      }

      totalPercentage += trafficPercentage;
    }

    // Allow slight rounding errors (e.g., 99.9 or 100.1)
    if (Math.abs(totalPercentage - 100) > 0.5) {
      return NextResponse.json(
        {
          success: false,
          error: `Total traffic allocation must equal 100% (current: ${totalPercentage}%)`,
        },
        { status: 400 }
      );
    }

    // Verify all variants belong to this experiment
    const variantIds = variantAllocations.map((a: any) => a.variantId);
    const variantCheck = await sql`
      SELECT id, variant_name as "variantName"
      FROM ab_variants
      WHERE experiment_id = ${experimentId}
        AND id = ANY(${variantIds})
    `;

    if (variantCheck.length !== variantIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more variant IDs do not belong to this experiment",
        },
        { status: 400 }
      );
    }

    // Update traffic allocations
    const updatedVariants = [];
    for (const allocation of variantAllocations) {
      const { variantId, trafficPercentage } = allocation;

      const result = await sql`
        UPDATE ab_variants
        SET traffic_percentage = ${trafficPercentage}
        WHERE id = ${variantId}
        RETURNING
          id,
          experiment_id as "experimentId",
          variant_name as "variantName",
          traffic_percentage as "trafficPercentage"
      `;

      updatedVariants.push(result[0]);
    }

    console.log(
      `[Admin A/B Traffic] Updated traffic for ${updatedVariants.length} variants in experiment '${experimentName}'`
    );

    return NextResponse.json({
      success: true,
      experimentId,
      experimentName,
      updatedVariants,
      totalTraffic: totalPercentage,
      message: `Updated traffic allocation for experiment '${experimentName}'`,
    });
  } catch (error) {
    console.error("[Admin A/B Traffic] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to adjust traffic allocation" },
      { status: 500 }
    );
  }
}
