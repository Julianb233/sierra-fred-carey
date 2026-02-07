/**
 * Wellbeing Check-in API
 *
 * POST /api/wellbeing/check-in - Store assessment results and return recommendations
 * GET  /api/wellbeing/check-in - Retrieve last check-in score and date
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

interface Recommendation {
  text: string;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// Recommendation Generator (Fred's voice)
// ============================================================================

function generateRecommendations(score: number): Recommendation[] {
  if (score < 40) {
    return [
      {
        text: "Stop what you're doing and take 24 hours off. I'm serious. No emails, no Slack, no pitch decks. Your brain needs a reset, and pushing through exhaustion isn't grit -- it's bad strategy.",
        priority: "high",
      },
      {
        text: "Talk to someone you trust today -- a co-founder, a mentor, a friend, anyone. After 50 years I can tell you: the founders who isolate are the ones who fail. Asking for help is a power move.",
        priority: "high",
      },
      {
        text: "Delegate one thing that's been eating at you. You don't have to do everything yourself. The best CEOs I've seen are the ones who know what to hand off.",
        priority: "high",
      },
      {
        text: "Write down the three things that are causing you the most stress right now. Getting them out of your head and onto paper is the first step to solving them.",
        priority: "medium",
      },
    ];
  }

  if (score < 70) {
    return [
      {
        text: "Set one hard boundary this week -- a time when you stop working and actually disconnect. I've watched founders run themselves into the ground for years. Boundaries aren't laziness; they're sustainability.",
        priority: "medium",
      },
      {
        text: "Block 30 minutes for something that has nothing to do with your startup. Exercise, a walk, a meal with a friend. Your best ideas come when you give your brain breathing room.",
        priority: "medium",
      },
      {
        text: "Reassess your top three priorities. If everything is urgent, nothing is. Pick the one thing that moves the needle most and let the rest wait.",
        priority: "medium",
      },
      {
        text: "Check in with yourself again in a week. Tracking your wellbeing isn't soft -- it's smart. The data will tell you if you're trending in the right direction.",
        priority: "low",
      },
    ];
  }

  return [
    {
      text: "You're in a solid place -- and that matters more than you think. Keep doing whatever routines are working for you. Consistency is what separates the founders who last from the ones who flame out.",
      priority: "low",
    },
    {
      text: "Celebrate a recent win this week, even a small one. Micro victories build the momentum that carries you through the hard months. I've seen it work over and over across 40+ companies.",
      priority: "low",
    },
    {
      text: "Consider sharing how you're doing with your team. When founders model healthy habits, it creates a culture where everyone performs better. That's leadership.",
      priority: "low",
    },
  ];
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    const { score, answers } = body;

    if (typeof score !== "number" || score < 0 || score > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid score. Must be a number between 0 and 100." },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid answers. Must be an object." },
        { status: 400 }
      );
    }

    // Persist to profiles metadata
    const supabase = await createClient();

    // Fetch current metadata to merge
    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", userId)
      .single();

    const existingMetadata = (profile?.metadata as Record<string, unknown>) || {};

    const updatedMetadata = {
      ...existingMetadata,
      wellbeing_last_score: score,
      wellbeing_last_check_in: new Date().toISOString(),
      wellbeing_last_answers: answers,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ metadata: updatedMetadata })
      .eq("id", userId);

    if (updateError) {
      console.error("[Wellbeing] Failed to persist check-in:", updateError);
      // Still return recommendations even if persist fails
    }

    const recommendations = generateRecommendations(score);

    return NextResponse.json({
      success: true,
      data: {
        score,
        recommendations,
        savedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[Wellbeing] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", userId)
      .single();

    const metadata = (profile?.metadata as Record<string, unknown>) || {};

    return NextResponse.json({
      success: true,
      data: {
        score: (metadata.wellbeing_last_score as number) ?? null,
        lastCheckIn: (metadata.wellbeing_last_check_in as string) ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("[Wellbeing] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
