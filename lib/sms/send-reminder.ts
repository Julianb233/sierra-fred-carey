/**
 * SMS Reminder Helpers
 * AI-2582: Twilio integration for user reminders and notifications
 *
 * Provides functions for sending ad-hoc reminder SMS to founders.
 * Handles credential checks, user preference lookups, and error isolation.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { getUserSMSPreferences } from "@/lib/db/sms"

const LOG_PREFIX = "[SMS Reminder]"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com"

// ============================================================================
// Types
// ============================================================================

export interface ReminderOptions {
  /** Deep link path appended to APP_URL (e.g., "/dashboard/next-steps") */
  deepLink?: string
  /** Optional sender label for the message (defaults to "Fred") */
  senderLabel?: string
}

export interface ReminderResult {
  success: boolean
  messageSid?: string
  error?: string
  skipped?: boolean
  reason?: string
}

// ============================================================================
// Credential Check
// ============================================================================

/**
 * Returns true if all required Twilio env vars are configured.
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_MESSAGING_SERVICE_SID
  )
}

// ============================================================================
// Send Reminder
// ============================================================================

/**
 * Send a reminder SMS to a user by their user ID.
 *
 * Checks:
 *  1. Twilio credentials are configured
 *  2. User has a verified phone and check-ins enabled
 *  3. Sends the SMS with error isolation (never throws)
 *
 * @param userId - The target user ID
 * @param message - The reminder message body
 * @param options - Optional deep link and sender label
 * @returns Result with success/failure info
 */
export async function sendReminderSMS(
  userId: string,
  message: string,
  options?: ReminderOptions
): Promise<ReminderResult> {
  // 1. Check Twilio credentials
  if (!isTwilioConfigured()) {
    console.warn(`${LOG_PREFIX} Twilio credentials not configured. Skipping SMS for user ${userId}.`)
    return { success: false, skipped: true, reason: "twilio_not_configured" }
  }

  try {
    // 2. Look up user SMS preferences
    const supabase = createServiceClient()
    const prefs = await getUserSMSPreferences(supabase, userId)

    if (!prefs) {
      return { success: false, skipped: true, reason: "no_sms_preferences" }
    }

    if (!prefs.phoneNumber) {
      return { success: false, skipped: true, reason: "no_phone_number" }
    }

    if (!prefs.phoneVerified) {
      return { success: false, skipped: true, reason: "phone_not_verified" }
    }

    if (!prefs.checkinEnabled) {
      return { success: false, skipped: true, reason: "checkins_disabled" }
    }

    // 3. Build the final message with optional deep link
    let finalMessage = message
    if (options?.deepLink) {
      finalMessage += `\n${APP_URL}${options.deepLink}`
    }

    // 4. Send via Twilio (dynamic import to avoid build-time errors)
    const { sendSMS } = await import("@/lib/sms/client")
    const messageSid = await sendSMS(prefs.phoneNumber, finalMessage)

    console.log(`${LOG_PREFIX} Sent reminder to user ${userId} (SID: ${messageSid})`)
    return { success: true, messageSid }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`${LOG_PREFIX} Failed to send reminder to user ${userId}:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Send a reminder SMS directly to a phone number (bypasses preference checks).
 * Use this only for system-level notifications or admin-triggered sends.
 *
 * @param phone - Phone number in E.164 format
 * @param message - The message body
 * @returns Result with success/failure info
 */
export async function sendReminderToPhone(
  phone: string,
  message: string
): Promise<ReminderResult> {
  if (!isTwilioConfigured()) {
    return { success: false, skipped: true, reason: "twilio_not_configured" }
  }

  try {
    const { sendSMS } = await import("@/lib/sms/client")
    const messageSid = await sendSMS(phone, message)
    return { success: true, messageSid }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`${LOG_PREFIX} Failed to send to ${phone}:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

// ============================================================================
// Reminder Templates
// ============================================================================

/**
 * Build an overdue next-steps reminder message.
 *
 * @param founderName - The founder's display name
 * @param overdueCount - Number of overdue items
 * @param topDescription - Description of the most important overdue item
 */
export function buildOverdueReminderMessage(
  founderName: string,
  overdueCount: number,
  topDescription: string
): string {
  const name = founderName || "Founder"
  const truncatedDesc =
    topDescription.length > 80
      ? topDescription.slice(0, 77) + "..."
      : topDescription

  if (overdueCount === 1) {
    return `Hey ${name}, you have an overdue action item: "${truncatedDesc}". Let's knock it out today. --Fred`
  }

  return `Hey ${name}, you have ${overdueCount} overdue action items. Top priority: "${truncatedDesc}". Let's get back on track. --Fred`
}

/**
 * Build a general notification SMS message.
 *
 * @param founderName - The founder's display name
 * @param title - Notification title
 * @param body - Notification body text
 */
export function buildNotificationMessage(
  founderName: string,
  title: string,
  body: string
): string {
  const name = founderName || "Founder"
  const maxBodyLen = 300 - name.length - title.length
  const truncatedBody =
    body.length > maxBodyLen ? body.slice(0, maxBodyLen - 3) + "..." : body

  return `${name}, ${title}: ${truncatedBody} --Fred`
}
