import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";

/**
 * Admin authentication check
 * Uses simple header-based authentication for now
 */
function isAdmin(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;
  const adminKey = request.headers.get("x-admin-key");
  return !!adminKey && adminKey === secret;
}

/**
 * POST /api/admin/prompts/test
 * Test a prompt before activation
 * Body: {
 *   promptId?: string,
 *   promptContent?: string,
 *   testInput?: Record<string, any>
 * }
 * Either promptId or promptContent must be provided
 * Returns a preview of how the prompt would be rendered with test data
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
    const { promptId, promptContent, testInput = {} } = body;

    if (!promptId && !promptContent) {
      return NextResponse.json(
        { success: false, error: "Either promptId or promptContent is required" },
        { status: 400 }
      );
    }

    console.log("[Admin Prompts Test] Testing prompt", {
      promptId: promptId || "inline",
      hasTestInput: Object.keys(testInput).length > 0,
    });

    let content = promptContent;

    // If promptId is provided, fetch the prompt from database
    if (promptId) {
      const promptResult = await sql`
        SELECT
          id,
          name,
          version,
          content,
          is_active as "isActive"
        FROM ai_prompts
        WHERE id = ${promptId}
      `;

      if (promptResult.length === 0) {
        return NextResponse.json(
          { success: false, error: "Prompt not found" },
          { status: 404 }
        );
      }

      content = promptResult[0].content;
    }

    // Simple template variable replacement for testing
    // Replace {{variable}} with values from testInput
    let renderedContent = content;
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.push(match[1]);
    }

    // Replace variables with test input values
    for (const [key, value] of Object.entries(testInput)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      renderedContent = renderedContent.replace(pattern, String(value));
    }

    // Identify any unreplaced variables
    const unreplacedVars: string[] = [];
    variableRegex.lastIndex = 0;
    while ((match = variableRegex.exec(renderedContent)) !== null) {
      unreplacedVars.push(match[1]);
    }

    return NextResponse.json({
      success: true,
      prompt: {
        original: content,
        rendered: renderedContent,
        variables: [...new Set(variables)],
        unreplacedVariables: [...new Set(unreplacedVars)],
        testInput,
      },
      warnings: unreplacedVars.length > 0 
        ? [`Missing test values for: ${[...new Set(unreplacedVars)].join(", ")}`]
        : [],
      message: "Prompt test completed successfully",
    });
  } catch (error) {
    console.error("[Admin Prompts Test] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to test prompt" },
      { status: 500 }
    );
  }
}
