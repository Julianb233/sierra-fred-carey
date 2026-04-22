/**
 * Paywall Notification Service
 *
 * Sends email and SMS notifications triggered by paywall events:
 * - Free limit hit (email + SMS)
 * - Abandoned checkout (email, 24h delay via cron)
 * - Trial ending (email, 7-day warning via cron)
 *
 * All sends are recorded in email_sends / sms_checkins for idempotency.
 */

import { createElement } from 'react'
import { sendEmail } from '@/lib/email/send'
import { shouldSendEmail } from '@/lib/email/preferences'
import { sendSMS } from '@/lib/sms/client'
import { getFreeLimitSmsTemplate } from '@/lib/sms/templates'
import { FreeLimitHitEmail } from '@/lib/email/templates/free-limit-hit'
import { AbandonedCheckoutEmail } from '@/lib/email/templates/abandoned-checkout'
import { TrialEndingEmail } from '@/lib/email/templates/trial-ending'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserSMSPreferences } from '@/lib/db/sms'
import { logger } from '@/lib/logger'
import type { EmailCategory } from '@/lib/email/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com'

interface UserInfo {
  id: string
  email: string
  name: string
}

/**
 * Get user info (name + email) from profiles table.
 */
async function getUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return {
      id: data.id as string,
      email: (data.email as string) || '',
      name: (data.name as string) || 'there',
    }
  } catch {
    return null
  }
}

/**
 * Check if a paywall notification has already been sent for this user + type
 * within the dedup window (default 24h).
 */
async function alreadySent(
  userId: string,
  emailType: EmailCategory,
  hoursWindow = 24
): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const cutoff = new Date(Date.now() - hoursWindow * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('email_sends')
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', emailType)
      .eq('status', 'sent')
      .gte('created_at', cutoff)
      .limit(1)

    if (error) return false
    return (data?.length ?? 0) > 0
  } catch {
    return false
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Notify a free-tier user that they've hit their usage limit.
 * Sends email and optionally SMS (if phone is verified + opted in).
 */
export async function notifyFreeLimitHit(
  userId: string,
  limitDescription = "You've used all your free conversations for today."
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const result = { emailSent: false, smsSent: false }
  const category: EmailCategory = 'paywall_free_limit'

  const user = await getUserInfo(userId)
  if (!user || !user.email) {
    logger.warn('[Paywall] No user info for free limit notification', { userId })
    return result
  }

  // Dedup: don't send more than once per 24h
  if (await alreadySent(userId, category)) {
    logger.info('[Paywall] Free limit email already sent in last 24h', { userId })
    return result
  }

  // Check email preferences
  if (!(await shouldSendEmail(userId, category))) {
    logger.info('[Paywall] User opted out of paywall emails', { userId })
    return result
  }

  // Send email
  const emailResult = await sendEmail({
    to: user.email,
    subject: "You've hit your free plan limit",
    react: createElement(FreeLimitHitEmail, {
      founderName: user.name,
      limitDescription,
      appUrl: APP_URL,
    }),
    tags: [
      { name: 'category', value: 'paywall' },
      { name: 'type', value: 'free_limit_hit' },
    ],
    tracking: {
      userId,
      emailType: category,
    },
  })
  result.emailSent = emailResult.success

  // SMS: only if user has opted in with verified phone
  try {
    const supabase = createServiceClient()
    const prefs = await getUserSMSPreferences(supabase, userId)
    if (prefs?.phoneNumber && prefs.phoneVerified && prefs.checkinEnabled) {
      const body = getFreeLimitSmsTemplate(user.name)
      await sendSMS(prefs.phoneNumber, body)
      result.smsSent = true
      logger.info('[Paywall] Free limit SMS sent', { userId })
    }
  } catch (err) {
    logger.error('[Paywall] Failed to send free limit SMS', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return result
}

/**
 * Notify a user who abandoned checkout 24h ago.
 * Called by the cron endpoint, not by the webhook directly.
 */
export async function notifyAbandonedCheckout(
  userId: string,
  planName: string
): Promise<{ emailSent: boolean }> {
  const result = { emailSent: false }
  const category: EmailCategory = 'paywall_abandoned_checkout'

  const user = await getUserInfo(userId)
  if (!user || !user.email) return result

  // Dedup: don't send more than once per 7 days for abandoned checkout
  if (await alreadySent(userId, category, 7 * 24)) return result

  if (!(await shouldSendEmail(userId, category))) return result

  const emailResult = await sendEmail({
    to: user.email,
    subject: `Still thinking about the ${planName} plan?`,
    react: createElement(AbandonedCheckoutEmail, {
      founderName: user.name,
      planName,
      appUrl: APP_URL,
    }),
    tags: [
      { name: 'category', value: 'paywall' },
      { name: 'type', value: 'abandoned_checkout' },
    ],
    tracking: {
      userId,
      emailType: category,
    },
  })
  result.emailSent = emailResult.success

  return result
}

/**
 * Notify a user whose trial is ending in N days.
 * Called by the cron endpoint.
 */
export async function notifyTrialEnding(
  userId: string,
  planName: string,
  daysRemaining: number,
  trialEndDate: string
): Promise<{ emailSent: boolean }> {
  const result = { emailSent: false }
  const category: EmailCategory = 'paywall_trial_ending'

  const user = await getUserInfo(userId)
  if (!user || !user.email) return result

  // Dedup: one trial-ending email per 7 days
  if (await alreadySent(userId, category, 7 * 24)) return result

  if (!(await shouldSendEmail(userId, category))) return result

  const emailResult = await sendEmail({
    to: user.email,
    subject: `Your ${planName} trial ends in ${daysRemaining} days`,
    react: createElement(TrialEndingEmail, {
      founderName: user.name,
      planName,
      daysRemaining,
      trialEndDate,
      appUrl: APP_URL,
    }),
    tags: [
      { name: 'category', value: 'paywall' },
      { name: 'type', value: 'trial_ending' },
    ],
    tracking: {
      userId,
      emailType: category,
    },
  })
  result.emailSent = emailResult.success

  return result
}
