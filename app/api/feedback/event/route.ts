/**
 * Event Feedback API
 *
 * Phase 90: User Testing Loop
 * POST endpoint to persist event feedback submissions.
 * Inserts into event_feedback table and creates a feedback_signals row
 * so the existing feedback pipeline picks it up.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface EventFeedbackBody {
  userId: string
  eventName?: string
  rating: number
  fredRating?: number | null
  recommend?: "yes" | "maybe" | "no" | null
  improvementText?: string | null
  loveText?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body: EventFeedbackBody = await request.json()

    // Validate required fields
    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }
    if (
      !body.rating ||
      typeof body.rating !== "number" ||
      body.rating < 1 ||
      body.rating > 5
    ) {
      return NextResponse.json(
        { error: "rating must be a number between 1 and 5" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Insert into event_feedback table
    const { data: feedbackRow, error: feedbackError } = await supabase
      .from("event_feedback")
      .insert({
        user_id: body.userId,
        event_name: body.eventName || "default",
        rating: body.rating,
        fred_rating: body.fredRating ?? null,
        recommend: body.recommend ?? null,
        improvement_text: body.improvementText ?? null,
        love_text: body.loveText ?? null,
        source: "widget",
      })
      .select("id")
      .single()

    if (feedbackError) {
      console.error("[event-feedback] Insert error:", feedbackError.message)
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    // Also create a feedback_signals row so the existing pipeline picks it up
    const combinedMessage = [
      body.improvementText ? `Improvement: ${body.improvementText}` : null,
      body.loveText ? `Loved: ${body.loveText}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    await supabase.from("feedback_signals").insert({
      user_id: body.userId,
      channel: "event_survey",
      signal_type: "sentiment",
      rating: body.rating >= 4 ? 1 : body.rating <= 2 ? -1 : 0,
      message: combinedMessage || `Event rating: ${body.rating}/5`,
      category: "other",
      user_tier: "free",
      weight: 1.0,
      consent_given: true,
      status: "new",
      metadata: {
        event_name: body.eventName || "default",
        event_feedback_id: feedbackRow?.id,
        fred_rating: body.fredRating,
        recommend: body.recommend,
      },
    })

    return NextResponse.json(
      { success: true, id: feedbackRow?.id },
      { status: 201 }
    )
  } catch (err) {
    console.error("[event-feedback] Error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
