/**
 * Daily Guidance Cron Job
 * Phase 84: Daily Mentor Guidance
 *
 * GET /api/cron/daily-guidance
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Vercel Cron: { "path": "/api/cron/daily-guidance", "schedule": "0 15 * * *" }
 * (8am PT = 15:00 UTC)
 *
 * Generates daily agendas and sends SMS to all eligible Pro+ users.
 * Processes in batches of 10 to avoid rate limits.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateDailyAgenda } from "@/lib/guidance/daily-agenda"
import { sendDailyGuidanceSMS, getEligibleUsersForSMS } from "@/lib/sms/daily-guidance"
import { timingSafeEqual } from "crypto"

export const dynamic = "force-dynamic"

const LOG_PREFIX = "[Cron: Daily Guidance]"
const BATCH_SIZE = 10

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET not configured`)
    return false
  }
  if (!authHeader) return false

  const token = authHeader.replace("Bearer ", "")

  try {
    const a = Buffer.from(token)
    const b = Buffer.from(cronSecret)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIX} Starting scheduled dispatch`)

  try {
    // 1. Verify authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Get eligible users
    const eligibleUsers = await getEligibleUsersForSMS()
    console.log(`${LOG_PREFIX} Found ${eligibleUsers.length} eligible users`)

    if (eligibleUsers.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No eligible users for daily guidance SMS",
      })
    }

    // 3. Process in batches
    let sent = 0
    let failed = 0

    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async ({ userId, phone }) => {
          const agenda = await generateDailyAgenda(userId)
          await sendDailyGuidanceSMS(userId, phone, agenda)
          return userId
        })
      )

      for (const result of results) {
        if (result.status === "fulfilled") {
          sent++
        } else {
          failed++
          console.error(`${LOG_PREFIX} Failed for user:`, result.reason)
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < eligibleUsers.length) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    console.log(`${LOG_PREFIX} Complete: ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: eligibleUsers.length,
      sent,
      failed,
    })
  } catch (error) {
    console.error(`${LOG_PREFIX} Unhandled error:`, error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
