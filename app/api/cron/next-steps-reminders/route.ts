/**
 * Next Steps Overdue Reminder Cron Job
 *
 * GET /api/cron/next-steps-reminders
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Vercel Cron: { "path": "/api/cron/next-steps-reminders", "schedule": "0 15 * * *" }
 * (8am PT = 15:00 UTC — runs alongside daily-guidance)
 *
 * Finds all users with overdue next steps (past due_date, not completed,
 * not already reminded) and sends a push notification nudge.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getOverdueSteps, markReminderSent } from "@/lib/next-steps/next-steps-service"
import { notifyOverdueStep } from "@/lib/push/triggers"
import {
  sendReminderSMS,
  buildOverdueReminderMessage,
  isTwilioConfigured,
} from "@/lib/sms/send-reminder"
import { timingSafeEqual } from "crypto"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const LOG_PREFIX = "[Cron: Next Steps Reminders]"

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
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find all users with overdue, un-reminded next steps
    const supabase = createServiceClient()
    const { data: overdueRows, error } = await supabase
      .from("next_steps")
      .select("user_id")
      .eq("completed", false)
      .eq("dismissed", false)
      .eq("reminder_sent", false)
      .not("due_date", "is", null)
      .lt("due_date", new Date().toISOString())

    if (error) {
      console.error(`${LOG_PREFIX} Query error:`, error)
      return NextResponse.json({ success: false, error: "Query failed" }, { status: 500 })
    }

    // Deduplicate user IDs
    const userIds = [...new Set((overdueRows || []).map((r: { user_id: string }) => r.user_id))]
    console.log(`${LOG_PREFIX} Found ${userIds.length} users with overdue steps`)

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, processed: 0, reminded: 0 })
    }

    let reminded = 0
    let failed = 0
    let smsSent = 0
    const smsEnabled = isTwilioConfigured()

    for (const userId of userIds) {
      try {
        const overdueSteps = await getOverdueSteps(userId)
        const unreminded = overdueSteps.filter(s => !s.reminderSent)

        if (unreminded.length === 0) continue

        // Send one push per user with count of overdue items
        const topStep = unreminded[0]
        notifyOverdueStep(userId, {
          count: unreminded.length,
          topDescription: topStep.description,
          topPriority: topStep.priority,
        })

        // Also send SMS reminder to opted-in users (fire-and-forget)
        if (smsEnabled) {
          // Fetch founder name for personalized SMS
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", userId)
            .single()

          const smsMessage = buildOverdueReminderMessage(
            profile?.name || "Founder",
            unreminded.length,
            topStep.description
          )

          sendReminderSMS(userId, smsMessage, {
            deepLink: "/dashboard/next-steps",
          })
            .then((result) => {
              if (result.success) smsSent++
            })
            .catch((err) => {
              console.error(`${LOG_PREFIX} SMS failed for user ${userId}:`, err)
            })
        }

        // Mark all as reminded to prevent duplicates
        for (const step of unreminded) {
          await markReminderSent(userId, step.id)
        }

        reminded++
      } catch (err) {
        failed++
        console.error(`${LOG_PREFIX} Failed for user ${userId}:`, err)
      }
    }

    console.log(`${LOG_PREFIX} Complete: ${reminded} users reminded, ${failed} failed, ~${smsSent} SMS sent`)

    return NextResponse.json({
      success: true,
      processed: userIds.length,
      reminded,
      failed,
    })
  } catch (error) {
    console.error(`${LOG_PREFIX} Unhandled error:`, error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
