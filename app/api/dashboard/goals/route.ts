/**
 * Goals API — Structured goal sets by funding stage
 *
 * GET   /api/dashboard/goals — List goals for the current user
 * POST  /api/dashboard/goals — Generate goal set based on stage (idempotent)
 * PATCH /api/dashboard/goals — Toggle goal completion
 *
 * Linear: AI-1283
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getFounderGoals,
  generateGoalSet,
  toggleGoalComplete,
  type FounderGoal,
} from "@/lib/goals/goal-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const userId = await requireAuth();

    let goals: FounderGoal[];
    try {
      goals = await getFounderGoals(userId);
    } catch (dbError) {
      console.warn("[Goals API] DB query failed, returning empty:", dbError);
      goals = [];
    }

    return NextResponse.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Goals API] GET error:", error);
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Optionally accept stage in the body; otherwise read from profile
    let stage: string | null = null;
    try {
      const body = await request.json();
      stage = body.stage || null;
    } catch {
      // No body — will read from profile
    }

    if (!stage) {
      const supabase = createServiceClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("stage")
        .eq("id", userId)
        .single();

      stage = profile?.stage || null;
    }

    const force = false; // Don't overwrite by default
    const goals = await generateGoalSet(userId, stage, { force });

    return NextResponse.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Goals API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate goals" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { id, completed } = body as {
      id?: string;
      completed?: boolean;
    };

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (completed === undefined) {
      return NextResponse.json(
        { success: false, error: "completed is required" },
        { status: 400 }
      );
    }

    const goal = await toggleGoalComplete(userId, id, completed);

    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Goal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Goals API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update goal" },
      { status: 500 }
    );
  }
}
