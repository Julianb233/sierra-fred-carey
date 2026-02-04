import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { clearConfigCache } from "@/lib/ai/config-loader";

/**
 * Admin authentication check
 * Uses simple header-based authentication for now
 */
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

/**
 * POST /api/admin/prompts/activate
 * Activate a specific prompt version
 * Body: { promptId: string }
 * When activating, automatically deactivates other versions of same name
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
    const { promptId } = body;

    if (!promptId) {
      return NextResponse.json(
        { success: false, error: "promptId is required" },
        { status: 400 }
      );
    }

    console.log(`[Admin Prompts Activate] Activating prompt ${promptId}`);

    // Get the prompt details first
    const promptResult = await sql`
      SELECT id, name, version FROM ai_prompts WHERE id = ${promptId}
    `;

    if (promptResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt not found" },
        { status: 404 }
      );
    }

    const prompt = promptResult[0];

    // Deactivate all other versions of the same prompt name
    console.log(
      `[Admin Prompts Activate] Deactivating other versions of ${prompt.name}`
    );

    await sql`
      UPDATE ai_prompts
      SET is_active = false
      WHERE name = ${prompt.name}
        AND id != ${promptId}
    `;

    // Activate the target prompt
    const result = await sql`
      UPDATE ai_prompts
      SET is_active = true
      WHERE id = ${promptId}
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
      `[Admin Prompts Activate] Activated ${prompt.name} v${prompt.version}, cache cleared`
    );

    return NextResponse.json({
      success: true,
      prompt: result[0],
      message: `Activated ${prompt.name} version ${prompt.version}. All other versions deactivated. Cache cleared.`,
    });
  } catch (error) {
    console.error("[Admin Prompts Activate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to activate prompt" },
      { status: 500 }
    );
  }
}
