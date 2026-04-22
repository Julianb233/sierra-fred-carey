/**
 * Abandoned Checkout Cron Endpoint
 *
 * Triggered daily. Finds users who created a checkout session 24-48h ago
 * but never completed it, and sends them a nudge email.
 *
 * GET /api/cron/paywall-abandoned-checkout
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyAbandonedCheckout } from '@/lib/notifications/paywall'
import { getPlanByPriceId } from '@/lib/stripe/config'
import { logger } from '@/lib/logger'
import { timingSafeEqual, createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  logger.log('[Cron: Abandoned Checkout] Starting')

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

    // Find checkout sessions that were created 24-48h ago
    // and the user still has no active subscription
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

    // Query stripe_events for checkout.session.completed events in the 24-48h window
    // that DON'T have a corresponding completed subscription
    const { data: recentCheckouts, error: checkoutError } = await supabase
      .from('stripe_events')
      .select('payload, stripe_customer_id')
      .eq('type', 'checkout.session.completed')
      .gte('created_at', fortyEightHoursAgo)
      .lte('created_at', twentyFourHoursAgo)

    // Also look for expired sessions if they exist
    const { data: expiredSessions } = await supabase
      .from('stripe_events')
      .select('payload, stripe_customer_id')
      .eq('type', 'checkout.session.expired')
      .gte('created_at', fortyEightHoursAgo)
      .lte('created_at', twentyFourHoursAgo)

    // Build set of customers who completed checkout (to exclude them)
    const completedCustomerIds = new Set(
      (recentCheckouts || []).map((e) => e.stripe_customer_id).filter(Boolean)
    )

    // Find users with subscriptions who are NOT active (abandoned)
    // Look at user_subscriptions for users whose status is not active/trialing
    const { data: abandonedUsers, error: subError } = await supabase
      .from('user_subscriptions')
      .select('user_id, stripe_price_id, stripe_customer_id, status')
      .not('status', 'in', '("active","trialing")')

    if (subError) {
      logger.error('[Cron: Abandoned Checkout] Failed to query subscriptions', { error: subError })
    }

    // Also use expired sessions
    const expiredUserIds = new Set<string>()
    for (const evt of expiredSessions || []) {
      const payload = evt.payload as Record<string, unknown>
      const userId = payload.client_reference_id as string
      if (userId && !completedCustomerIds.has(evt.stripe_customer_id)) {
        expiredUserIds.add(userId)
      }
    }

    let sent = 0
    let skipped = 0
    let failed = 0

    // Process abandoned subscription users
    for (const sub of abandonedUsers || []) {
      if (completedCustomerIds.has(sub.stripe_customer_id)) continue
      try {
        const plan = getPlanByPriceId(sub.stripe_price_id)
        const planName = plan?.name || 'Builder'
        const result = await notifyAbandonedCheckout(sub.user_id, planName)
        if (result.emailSent) sent++
        else skipped++
      } catch {
        failed++
      }
    }

    // Process expired session users
    for (const userId of expiredUserIds) {
      try {
        const result = await notifyAbandonedCheckout(userId, 'Builder')
        if (result.emailSent) sent++
        else skipped++
      } catch {
        failed++
      }
    }

    const duration = Date.now() - startTime
    logger.log('[Cron: Abandoned Checkout] Complete', { sent, skipped, failed, duration })

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      failed,
      duration: `${duration}ms`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[Cron: Abandoned Checkout] Error', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
