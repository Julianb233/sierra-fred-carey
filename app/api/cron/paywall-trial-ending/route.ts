/**
 * Trial Ending Cron Endpoint
 *
 * Triggered daily. Finds users whose trial ends within 7 days
 * and sends them a reminder email.
 *
 * GET /api/cron/paywall-trial-ending
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyTrialEnding } from '@/lib/notifications/paywall'
import { getPlanByPriceId } from '@/lib/stripe/config'
import { logger } from '@/lib/logger'
import { timingSafeEqual, createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  logger.log('[Cron: Trial Ending] Starting')

  // Auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const expected = `Bearer ${cronSecret}`
  const hmac1 = createHmac('sha256', 'cron-auth').update(authHeader).digest()
  const hmac2 = createHmac('sha256', 'cron-auth').update(expected).digest()
  if (!timingSafeEqual(hmac1, hmac2)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Find users with trialing subscriptions that end within 7 days
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: trialingUsers, error } = await supabase
      .from('user_subscriptions')
      .select('user_id, stripe_price_id, trial_end')
      .eq('status', 'trialing')
      .not('trial_end', 'is', null)
      .lte('trial_end', sevenDaysFromNow)
      .gte('trial_end', now.toISOString())

    if (error) {
      logger.error('[Cron: Trial Ending] Failed to query trialing users', { error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const sub of trialingUsers || []) {
      try {
        const trialEnd = new Date(sub.trial_end as string)
        const daysRemaining = Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        const trialEndDate = trialEnd.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })

        const plan = getPlanByPriceId(sub.stripe_price_id)
        const planName = plan?.name || 'Builder'

        const result = await notifyTrialEnding(
          sub.user_id,
          planName,
          daysRemaining,
          trialEndDate
        )

        if (result.emailSent) sent++
        else skipped++
      } catch {
        failed++
      }
    }

    const duration = Date.now() - startTime
    logger.log('[Cron: Trial Ending] Complete', { sent, skipped, failed, duration })

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      failed,
      duration: `${duration}ms`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[Cron: Trial Ending] Error', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
