/**
 * Daily Agenda API
 * Phase 84: Daily Mentor Guidance
 *
 * GET  /api/dashboard/daily-agenda  — Fetch today's AI-generated agenda
 * POST /api/dashboard/daily-agenda  — Log task completion
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { generateDailyAgenda, logTaskCompletion } from "@/lib/guidance/daily-agenda"
import { checkRateLimitForUser } from "@/lib/api/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth()

    // Rate limit: 10 requests per hour (agenda is cached, mostly re-fetches)
    const { response: rateLimited } = await checkRateLimitForUser(
      request,
      userId,
      "free" // Use free tier limits (10/min), effectively allowing plenty of re-fetches
    )
    if (rateLimited) return rateLimited

    const agenda = await generateDailyAgenda(userId)

    return NextResponse.json({ success: true, data: agenda })
  } catch (error) {
    if (error instanceof Response) return error

    console.error("[Daily Agenda API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load daily agenda" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()

    const body = await request.json()
    const taskId = body?.taskId

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { success: false, error: "taskId is required" },
        { status: 400 }
      )
    }

    await logTaskCompletion(userId, taskId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error

    console.error("[Daily Agenda API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to log task completion" },
      { status: 500 }
    )
  }
}
