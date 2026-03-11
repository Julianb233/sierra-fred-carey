/**
 * Daily Guidance SMS Delivery
 * Phase 84: Daily Mentor Guidance
 *
 * Formats and sends proactive daily guidance via SMS.
 * Handles missing Twilio credentials gracefully.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { DailyAgenda } from "@/lib/guidance/types"

const LOG_PREFIX = "[Daily Guidance SMS]"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com"
const MAX_SMS_LENGTH = 480

// ============================================================================
// SMS Formatting
// ============================================================================

/**
 * Format a daily agenda into SMS-friendly text (max 480 chars / 3 segments).
 */
function formatAgendaForSMS(name: string, agenda: DailyAgenda): string {
  const parts: string[] = []
  parts.push(`Good morning ${name}! Your FRED mentor tasks for today:`)

  for (let i = 0; i < agenda.tasks.length; i++) {
    const task = agenda.tasks[i]
    // Truncate title if needed to stay under limit
    const title = task.title.length > 80 ? task.title.slice(0, 77) + "..." : task.title
    parts.push(`${i + 1}. ${title}`)
  }

  parts.push(`Open Sahara to see details: ${APP_URL}/dashboard`)

  let message = parts.join("\n")

  // Ensure we stay under SMS limit
  if (message.length > MAX_SMS_LENGTH) {
    // Truncate task titles more aggressively
    const shortParts: string[] = []
    shortParts.push(`Good morning ${name}! Today's focus:`)
    for (let i = 0; i < agenda.tasks.length; i++) {
      const task = agenda.tasks[i]
      const title = task.title.length > 50 ? task.title.slice(0, 47) + "..." : task.title
      shortParts.push(`${i + 1}. ${title}`)
    }
    shortParts.push(`Details: ${APP_URL}/dashboard`)
    message = shortParts.join("\n")
  }

  return message
}

// ============================================================================
// SMS Delivery
// ============================================================================

/**
 * Send daily guidance SMS to a founder.
 * Handles missing Twilio credentials gracefully -- logs warning and skips.
 */
export async function sendDailyGuidanceSMS(
  userId: string,
  phone: string,
  agenda: DailyAgenda
): Promise<void> {
  // Check for Twilio configuration before attempting
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_MESSAGING_SERVICE_SID
  ) {
    console.warn(
      `${LOG_PREFIX} Twilio credentials not configured. Skipping SMS for user ${userId}.`
    )
    return
  }

  try {
    // Dynamically import to avoid build-time errors when Twilio env is missing
    const { sendSMS } = await import("@/lib/sms/client")

    // Load founder name for personalization
    const supabase = createServiceClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single()

    const name = profile?.name || "Founder"
    const message = formatAgendaForSMS(name, agenda)

    await sendSMS(phone, message)
    console.log(`${LOG_PREFIX} SMS sent to user ${userId}`)
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send SMS to user ${userId}:`, error)
    // Don't rethrow -- SMS failure should not crash the cron job
  }
}

// ============================================================================
// Eligible Users Query
// ============================================================================

/**
 * Get users eligible for daily guidance SMS.
 * Requires: checkin_enabled = true, verified phone, Pro+ tier.
 *
 * Fixed: was querying profiles.phone and profiles.sms_notifications_enabled
 * which don't exist. Phone data lives in user_sms_preferences table.
 */
export async function getEligibleUsersForSMS(): Promise<
  Array<{ userId: string; phone: string }>
> {
  try {
    const supabase = createServiceClient()

    // Query user_sms_preferences for opted-in users with verified phones
    // (profiles table does not have phone or sms_notifications_enabled columns)
    const { data, error } = await supabase
      .from("user_sms_preferences")
      .select("user_id, phone_number")
      .eq("checkin_enabled", true)
      .eq("phone_verified", true)
      .not("phone_number", "is", null)

    if (error) {
      console.error(`${LOG_PREFIX} Failed to query eligible users:`, error)
      return []
    }

    if (!data || data.length === 0) return []

    // Filter to Pro+ tier users (SMS guidance is a paid feature)
    const { getUserTier } = await import("@/lib/api/tier-middleware")
    const { UserTier } = await import("@/lib/constants")

    const eligible: Array<{ userId: string; phone: string }> = []

    for (const pref of data) {
      try {
        const tier = await getUserTier(pref.user_id)
        if (tier >= UserTier.PRO) {
          eligible.push({ userId: pref.user_id, phone: pref.phone_number })
        }
      } catch {
        // Skip users where tier check fails
      }
    }

    return eligible
  } catch (error) {
    console.error(`${LOG_PREFIX} Error getting eligible users:`, error)
    return []
  }
}
