import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { clearConfigCache } from "@/lib/ai/config-loader";
import { isAdminRequest } from "@/lib/auth/admin";

/**
 * GET /api/admin/prompts
 * List all prompts with version history
 * Query params:
 * - category: Filter by category (optional)
 * - name: Filter by prompt name (optional)
 * - active_only: Show only active prompts (default: false)
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const name = searchParams.get("name");
    const activeOnly = searchParams.get("active_only") === "true";

    console.log("[Admin Prompts GET] Fetching prompts", {
      category,
      name,
      activeOnly,
    });

    // Build dynamic query
    let query = sql`
      SELECT
        id,
        name,
        version,
        content,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy"
      FROM ai_prompts
      WHERE 1=1
    `;

    // Apply filters
    if (name) {
      query = sql`${query} AND name = ${name}`;
    }

    if (activeOnly) {
      query = sql`${query} AND is_active = true`;
    }

    query = sql`${query} ORDER BY name, version DESC`;

    const prompts = await query;

    // Group by prompt name for easier consumption
    const groupedPrompts: Record<string, any[]> = {};
    for (const prompt of prompts as any[]) {
      if (!groupedPrompts[prompt.name]) {
        groupedPrompts[prompt.name] = [];
      }
      groupedPrompts[prompt.name].push(prompt);
    }

    return NextResponse.json({
      success: true,
      prompts: groupedPrompts,
      total: prompts.length,
    });
  } catch (error) {
    console.error("[Admin Prompts GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 * Create new prompt version
 * Body: { name, content, category? }
 * Automatically increments version based on existing prompts with same name
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
    const { name, content, category } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: "name and content are required" },
        { status: 400 }
      );
    }

    console.log(`[Admin Prompts POST] Creating new version of prompt: ${name}`);

    // Get the current max version for this prompt name
    const maxVersionResult = await sql`
      SELECT COALESCE(MAX(version), 0) as "maxVersion"
      FROM ai_prompts
      WHERE name = ${name}
    `;

    const maxVersion = maxVersionResult[0]?.maxVersion || 0;
    const newVersion = maxVersion + 1;

    // Get user ID from header (optional for now)
    const userId = request.headers.get("x-user-id") || null;

    // Insert new prompt version (NOT active by default)
    const result = await sql`
      INSERT INTO ai_prompts (
        name,
        version,
        content,
        is_active,
        created_by
      )
      VALUES (
        ${name},
        ${newVersion},
        ${content},
        false,
        ${userId}
      )
      RETURNING
        id,
        name,
        version,
        content,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy"
    `;

    console.log(
      `[Admin Prompts POST] Created prompt ${name} v${newVersion} (ID: ${result[0].id})`
    );

    return NextResponse.json(
      {
        success: true,
        prompt: result[0],
        message: `Created prompt ${name} version ${newVersion}. Activate it to use in production.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin Prompts POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/prompts
 * Activate/deactivate prompt
 * Body: { id, is_active }
 * When activating, automatically deactivates other versions of same name
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
    const { id, is_active } = body;

    if (!id || is_active === undefined) {
      return NextResponse.json(
        { success: false, error: "id and is_active are required" },
        { status: 400 }
      );
    }

    console.log(`[Admin Prompts PATCH] Updating prompt ${id} to is_active=${is_active}`);

    // Get the prompt name first
    const promptResult = await sql`
      SELECT name FROM ai_prompts WHERE id = ${id}
    `;

    if (promptResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt not found" },
        { status: 404 }
      );
    }

    const promptName = promptResult[0].name;

    // If activating this prompt, deactivate all other versions of the same name
    if (is_active) {
      console.log(
        `[Admin Prompts PATCH] Deactivating other versions of ${promptName}`
      );

      await sql`
        UPDATE ai_prompts
        SET is_active = false
        WHERE name = ${promptName}
          AND id != ${id}
      `;
    }

    // Update the target prompt
    const result = await sql`
      UPDATE ai_prompts
      SET is_active = ${is_active}
      WHERE id = ${id}
      RETURNING
        id,
        name,
        version,
        content,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy"
    `;

    // Clear the prompt cache so changes take effect immediately
    clearConfigCache();

    console.log(
      `[Admin Prompts PATCH] Updated prompt ${id}, cache cleared`
    );

    return NextResponse.json({
      success: true,
      prompt: result[0],
      message: is_active
        ? `Activated ${promptName}. All other versions deactivated. Cache cleared.`
        : `Deactivated ${promptName}. Cache cleared.`,
    });
  } catch (error) {
    console.error("[Admin Prompts PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
