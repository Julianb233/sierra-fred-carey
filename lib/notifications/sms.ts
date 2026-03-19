/**
 * SMS Notification Channel
 * AI-2582: Twilio integration for user reminders and notifications
 *
 * Adds SMS as a notification channel in the unified notification system.
 * Sends SMS alerts to founders who have opted in and have a verified phone.
 */

import {
  sendReminderSMS,
  buildNotificationMessage,
  isTwilioConfigured,
} from "@/lib/sms/send-reminder"
import { createServiceClient } from "@/lib/supabase/server"
import type { NotificationPayload } from "./types"

const LOG_PREFIX = "[Notifications SMS]"

export interface SMSNotificationResult {
  success: boolean
  channel: "sms"
  messageId?: string
  error?: string
  timestamp: Date
}

/**
 * Send a notification via SMS to a user.
 *
 * Looks up the user's name for personalization and delegates to the
 * SMS reminder system which handles preference/opt-in checks.
 *
 * @param userId - Target user ID
 * @param payload - Notification payload
 * @returns SMS notification result
 */
export async function sendSMSNotification(
  userId: string,
  payload: NotificationPayload
): Promise<SMSNotificationResult> {
  if (!isTwilioConfigured()) {
    return {
      success: false,
      channel: "sms",
      error: "Twilio credentials not configured",
      timestamp: new Date(),
    }
  }

  try {
    // Fetch founder name for personalization
    const supabase = createServiceClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single()

    const founderName = profile?.name || "Founder"

    // Build SMS-friendly message from notification payload
    const message = buildNotificationMessage(
      founderName,
      payload.title,
      payload.message
    )

    // Determine deep link based on notification type
    const deepLink = getDeepLinkForType(payload.type)

    const result = await sendReminderSMS(userId, message, { deepLink })

    if (result.skipped) {
      console.log(`${LOG_PREFIX} Skipped for user ${userId}: ${result.reason}`)
      return {
        success: false,
        channel: "sms",
        error: `Skipped: ${result.reason}`,
        timestamp: new Date(),
      }
    }

    return {
      success: result.success,
      channel: "sms",
      messageId: result.messageSid,
      error: result.error,
      timestamp: new Date(),
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`${LOG_PREFIX} Error for user ${userId}:`, errorMsg)
    return {
      success: false,
      channel: "sms",
      error: errorMsg,
      timestamp: new Date(),
    }
  }
}

/**
 * Determine the appropriate dashboard deep link for a notification type.
 */
function getDeepLinkForType(type: string): string {
  switch (type) {
    case "errors":
      return "/dashboard"
    case "performance":
      return "/dashboard"
    case "significance":
    case "winner":
      return "/dashboard/experiments"
    case "traffic":
      return "/dashboard/analytics"
    default:
      return "/dashboard"
  }
}
