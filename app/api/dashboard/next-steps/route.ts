/**
 * Next Steps Hub API — Phase 43
 *
 * GET   /api/dashboard/next-steps — List next steps grouped by priority
 * POST  /api/dashboard/next-steps — Extract from FRED conversations and persist
 * PATCH /api/dashboard/next-steps — Mark a step complete/incomplete/dismissed
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getNextSteps,
  markComplete,
  markIncomplete,
  dismissStep,
  extractAndStoreNextSteps,
} from "@/lib/next-steps/next-steps-service";

export async function GET() {
  try {
    const userId = await requireAuth();

    let data;
    try {
      data = await getNextSteps(userId);
    } catch (dbError) {
      console.warn("[Next Steps API] DB query failed, returning empty:", dbError);
      data = { critical: [], important: [], optional: [] };
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Next Steps API] GET error:", error);
    return NextResponse.json({
      success: true,
      data: { critical: [], important: [], optional: [] },
    });
  }
}

export async function POST() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Get recent FRED assistant responses (most recent first)
    const { data: episodes } = await supabase
      .from("fred_episodic_memory")
      .select("content, created_at")
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!episodes || episodes.length === 0) {
      return NextResponse.json({
        success: true,
        data: { critical: [], important: [], optional: [] },
        message: "No conversations found",
      });
    }

    // Find the most recent episode with Next 3 Actions
    for (const episode of episodes) {
      const content = episode.content as Record<string, unknown> | null;
      if (!content) continue;

      const role = content.role as string | undefined;
      const text = content.content as string | undefined;
      if (role !== "assistant" || !text) continue;

      // Check if this episode contains Next 3 Actions
      if (/\*?\*?Next 3 [Aa]ctions:?\*?\*?\s*\n/i.test(text)) {
        const stored = await extractAndStoreNextSteps(
          userId,
          text,
          episode.created_at
        );

        if (stored.length > 0) {
          // Return fresh grouped data
          const grouped = await getNextSteps(userId);
          return NextResponse.json({
            success: true,
            data: grouped,
            message: `Extracted ${stored.length} next steps`,
          });
        }
      }
    }

    // No new actions found
    const grouped = await getNextSteps(userId);
    return NextResponse.json({
      success: true,
      data: grouped,
      message: "No new next actions found in recent conversations",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Next Steps API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to extract next steps" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { id, completed, dismissed } = body as {
      id?: string;
      stepId?: string;
      completed?: boolean;
      dismissed?: boolean;
    };

    // Support both `id` and `stepId` for backward compatibility
    const stepId = id || body.stepId;

    if (!stepId) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (completed === undefined && dismissed === undefined) {
      return NextResponse.json(
        { success: false, error: "At least one of completed or dismissed is required" },
        { status: 400 }
      );
    }

    let step;

    if (dismissed === true) {
      step = await dismissStep(userId, stepId);
    } else if (completed !== undefined) {
      step = completed
        ? await markComplete(userId, stepId)
        : await markIncomplete(userId, stepId);
    }

    return NextResponse.json({
      success: true,
      data: step,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Next Steps API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update next step" },
      { status: 500 }
    );
  }
}
