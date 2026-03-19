/**
 * Send SMS Reminder API
 * AI-2582: Twilio integration for user reminders and notifications
 *
 * POST /api/sms/send
 *
 * Sends an ad-hoc SMS reminder to a founder. Supports two modes:
 *   1. By userId -- looks up the user's verified phone from SMS preferences
 *   2. By phone -- sends directly to a phone number (admin only)
 *
 * Authorization:
 *   - Authenticated users can send to themselves
 *   - Admin (ADMIN_SECRET_KEY header) can send to any user or phone
 *   - Cron (CRON_SECRET bearer token) can send to any user
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import {
  sendReminderSMS,
  sendReminderToPhone,
  isTwilioConfigured,
} from "@/lib/sms/send-reminder"
import { timingSafeEqual, createHmac } from "crypto"
import { z } from "zod"

export const dynamic = "force-dynamic"

const LOG_PREFIX = "[SMS Send API]"

// ============================================================================
// Request Schema
// ============================================================================

const SendSMSSchema = z.object({
  /** Target user ID -- will look up their verified phone */
  userId: z.string().uuid().optional(),
  /** Direct phone number in E.164 format (admin only) */
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
    .optional(),
  /** The message to send */
  message: z
    .string()
    .min(1, "Message is required")
    .max(1600, "Message too long (max 1600 chars / 10 segments)"),
  /** Optional deep link path (e.g., "/dashboard/next-steps") */
  deepLink: z.string().optional(),
}).refine((data) => data.userId || data.phone, {
  message: "Either userId or phone is required",
})

// ============================================================================
// Auth Helpers
// ============================================================================

function isAdminRequest(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) return false

  const headerKey = request.headers.get("x-admin-secret")
  if (!headerKey) return false

  try {
    const hmac1 = createHmac("sha256", "admin-auth").update(headerKey).digest()
    const hmac2 = createHmac("sha256", "admin-auth").update(adminKey).digest()
    return timingSafeEqual(hmac1, hmac2)
  } catch {
    return false
  }
}

function isCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get("authorization")
  if (!authHeader) return false

  const token = authHeader.replace("Bearer ", "")

  try {
    const hmac1 = createHmac("sha256", "cron-auth")
      .update(`Bearer ${token}`)
      .digest()
    const hmac2 = createHmac("sha256", "cron-auth")
      .update(`Bearer ${cronSecret}`)
      .digest()
    return timingSafeEqual(hmac1, hmac2)
  } catch {
    return false
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check Twilio configuration
    if (!isTwilioConfigured()) {
      return NextResponse.json(
        {
          error: "SMS service not configured",
          code: "SMS_NOT_CONFIGURED",
          hint: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID",
        },
        { status: 503 }
      )
    }

    // Determine caller identity
    const isAdmin = isAdminRequest(request)
    const isCron = isCronRequest(request)
    let authenticatedUserId: string | null = null

    if (!isAdmin && !isCron) {
      try {
        authenticatedUserId = await requireAuth()
      } catch (error) {
        if (error instanceof Response) return error
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Parse and validate request body
    const body = await request.json()
    const parsed = SendSMSSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { userId, phone, message, deepLink } = parsed.data

    // Non-admin/non-cron users can only send to themselves
    if (!isAdmin && !isCron && authenticatedUserId) {
      if (userId && userId !== authenticatedUserId) {
        return NextResponse.json(
          { error: "You can only send reminders to yourself" },
          { status: 403 }
        )
      }
      if (phone) {
        return NextResponse.json(
          { error: "Direct phone sending requires admin access" },
          { status: 403 }
        )
      }
    }

    // Route to the appropriate send method
    if (phone) {
      // Direct phone send (admin only)
      console.log(`${LOG_PREFIX} Admin sending to phone ${phone}`)
      const result = await sendReminderToPhone(phone, message)
      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      })
    }

    // User ID send (looks up phone from preferences)
    const targetUserId = userId || authenticatedUserId!
    console.log(`${LOG_PREFIX} Sending reminder to user ${targetUserId}`)

    const result = await sendReminderSMS(targetUserId, message, { deepLink })

    if (result.skipped) {
      return NextResponse.json(
        {
          success: false,
          skipped: true,
          reason: result.reason,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    if (error instanceof Response) return error

    console.error(`${LOG_PREFIX} Unhandled error:`, error)
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    )
  }
}
