import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { SubmitFeedbackRequest, SubmitFeedbackResponse } from "@/lib/feedback/types"
import { MAX_COMMENT_LENGTH } from "@/lib/feedback/constants"

/**
 * POST /api/feedback
 *
 * Accepts thumbs up/down feedback on FRED assistant messages.
 * Upserts into the chat_feedback table keyed by (user_id, message_id).
 * Gracefully degrades if the table doesn't exist yet (returns success).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const supabase = await createClient()

    let body: SubmitFeedbackRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<SubmitFeedbackResponse>(
        { success: false, error: "Invalid or empty JSON body" },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.message_id || !body.session_id || !body.signal) {
      return NextResponse.json<SubmitFeedbackResponse>(
        { success: false, error: "Missing required fields: message_id, session_id, signal" },
        { status: 400 }
      )
    }

    // Validate signal value
    if (body.signal !== "thumbs_up" && body.signal !== "thumbs_down") {
      return NextResponse.json<SubmitFeedbackResponse>(
        { success: false, error: "Invalid signal. Must be thumbs_up or thumbs_down" },
        { status: 400 }
      )
    }

    // Trim comment if present
    const comment = body.comment?.slice(0, MAX_COMMENT_LENGTH)?.trim() || null

    // Attempt upsert into feedback table
    const { data, error } = await supabase
      .from("chat_feedback")
      .upsert(
        {
          user_id: userId,
          message_id: body.message_id,
          session_id: body.session_id,
          signal: body.signal,
          comment,
          source: body.source || "chat",
        },
        { onConflict: "user_id,message_id" }
      )
      .select("id")
      .single()

    if (error) {
      // If table doesn't exist yet, return success anyway (graceful degradation)
      // The feedback was received -- we just can't persist it until migration runs
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[feedback] Table chat_feedback does not exist yet. Feedback accepted but not persisted.")
        return NextResponse.json<SubmitFeedbackResponse>({
          success: true,
          id: `local-${Date.now()}`,
        })
      }

      console.error("[feedback] Upsert error:", error)
      return NextResponse.json<SubmitFeedbackResponse>(
        { success: false, error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    return NextResponse.json<SubmitFeedbackResponse>({
      success: true,
      id: data?.id,
    })
  } catch (err) {
    // requireAuth throws NextResponse on 401 -- return it directly
    if (err instanceof NextResponse) return err

    console.error("[feedback] Unexpected error:", err)
    return NextResponse.json<SubmitFeedbackResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
