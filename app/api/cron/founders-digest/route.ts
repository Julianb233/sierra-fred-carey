/**
 * Founders Weekly Digest Cron Endpoint
 * AI-4117: Weekly summary for Sahara Founders group
 *
 * Triggered by Vercel Cron every Monday at 9 AM Pacific (4 PM UTC).
 * Aggregates feedback trends, top open issues, and avg resolution time.
 * Sends digest via WhatsApp to "Sahara Founders" group + email to Fred.
 *
 * GET /api/cron/founders-digest
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';
import { logger } from '@/lib/logger';
import { getDigestSummary, getTopInsightsThisWeek } from '@/lib/db/feedback-admin';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/feedback/whatsapp-reply';
import { sendEmail } from '@/lib/email/send';
import { FoundersDigest, type FoundersDigestProps } from '@/lib/email/templates/founders-digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const FOUNDERS_GROUP = 'Sahara Founders';
const FRED_EMAIL = process.env.FRED_EMAIL || 'fred@saharacompanies.com';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('[Cron: Founders Digest] Starting scheduled dispatch');

  try {
    // 1. Auth
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      if (!cronSecret) {
        logger.error('[Cron: Founders Digest] CRON_SECRET not configured');
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedToken = `Bearer ${cronSecret}`;
    const hmac1 = createHmac('sha256', 'cron-auth').update(authHeader).digest();
    const hmac2 = createHmac('sha256', 'cron-auth').update(expectedToken).digest();
    if (!timingSafeEqual(hmac1, hmac2)) {
      logger.warn('[Cron: Founders Digest] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Aggregate data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [feedbackSummary, topInsights, resolutionData] = await Promise.all([
      getDigestSummary(7),
      getTopInsightsThisWeek(10),
      getResolutionMetrics(weekAgo, twoWeeksAgo),
    ]);

    const period = {
      from: weekAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };

    // Map open insights to display format
    const openIssues = topInsights
      .filter((i) => i.status !== 'resolved')
      .slice(0, 5)
      .map((i) => ({
        title: i.title,
        severity: i.severity || 'low',
        signalCount: i.signal_count || 0,
        daysSinceCreated: Math.round(
          (now.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
        linearIssueId: i.linear_issue_id || null,
      }));

    const digestProps: FoundersDigestProps = {
      period,
      feedbackTrends: {
        totalSignals: feedbackSummary.stats.totalSignals,
        positiveCount: feedbackSummary.stats.positiveCount,
        negativeCount: feedbackSummary.stats.negativeCount,
        topCategories: feedbackSummary.topCategories,
        weekOverWeekChange: resolutionData.weekOverWeekChange,
      },
      openIssues,
      resolutionMetrics: {
        avgResolutionHours: resolutionData.avgResolutionHours,
        resolvedThisWeek: resolutionData.resolvedThisWeek,
        resolvedIn24hPercent: resolutionData.resolvedIn24hPercent,
        backlogSize: resolutionData.backlogSize,
      },
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://joinsahara.com',
    };

    // 3. Format WhatsApp message (plain text)
    const whatsappMessage = formatWhatsAppDigest(digestProps);

    // 4. Send WhatsApp message to Founders group
    let whatsappSent = false;
    try {
      const waResult = await sendWhatsAppMessage(FOUNDERS_GROUP, whatsappMessage);
      whatsappSent = waResult.success;
      if (!waResult.success) {
        logger.error('[Cron: Founders Digest] WhatsApp send failed', {
          error: waResult.error,
        });
      }
    } catch (err) {
      logger.error('[Cron: Founders Digest] WhatsApp send error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 5. Send email to Fred as backup
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const emailResult = await sendEmail({
          to: FRED_EMAIL,
          subject: `Sahara Weekly Digest: ${period.from} - ${period.to}`,
          react: FoundersDigest(digestProps),
          tags: [{ name: 'category', value: 'founders_digest' }],
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          logger.error('[Cron: Founders Digest] Email send failed', {
            error: emailResult.error,
          });
        }
      } catch (err) {
        logger.error('[Cron: Founders Digest] Email send error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[Cron: Founders Digest] Complete', {
      whatsappSent,
      emailSent,
      signalCount: feedbackSummary.stats.totalSignals,
      openIssueCount: openIssues.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      whatsappSent,
      emailSent,
      signalCount: feedbackSummary.stats.totalSignals,
      openIssueCount: openIssues.length,
      avgResolutionHours: resolutionData.avgResolutionHours,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[Cron: Founders Digest] Fatal error after ${duration}ms`, {
      error: errorMsg,
    });

    return NextResponse.json(
      { error: 'Founders digest dispatch failed', duration: `${duration}ms` },
      { status: 500 },
    );
  }
}

/**
 * Compute resolution metrics directly from feedback_insights table.
 */
async function getResolutionMetrics(
  weekAgo: Date,
  twoWeeksAgo: Date,
) {
  const supabase = createServiceClient();
  const weekAgoStr = weekAgo.toISOString();
  const twoWeeksAgoStr = twoWeeksAgo.toISOString();

  // Fetch insights from last 2 weeks for trend comparison
  const { data: insights } = await supabase
    .from('feedback_insights')
    .select('id, status, signal_count, resolved_at, created_at')
    .gte('created_at', twoWeeksAgoStr)
    .order('created_at', { ascending: true });

  const allInsights = insights || [];

  // Split into this week and last week
  const thisWeekInsights = allInsights.filter(
    (i) => new Date(i.created_at) >= weekAgo
  );
  const lastWeekInsights = allInsights.filter(
    (i) => new Date(i.created_at) >= twoWeeksAgo && new Date(i.created_at) < weekAgo
  );

  // Also fetch signals for WoW comparison
  const [{ count: thisWeekSignals }, { count: lastWeekSignals }] = await Promise.all([
    supabase
      .from('feedback_signals')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgoStr),
    supabase
      .from('feedback_signals')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgoStr)
      .lt('created_at', weekAgoStr),
  ]);

  // Week-over-week signal change
  let weekOverWeekChange: number | null = null;
  if ((lastWeekSignals ?? 0) > 0) {
    weekOverWeekChange = Math.round(
      (((thisWeekSignals ?? 0) - (lastWeekSignals ?? 0)) / (lastWeekSignals ?? 1)) * 100
    );
  }

  // Resolution metrics from this week's resolved insights
  const resolvedThisWeek = thisWeekInsights.filter((i) => i.resolved_at).length;

  // Avg resolution time (hours from created_at to resolved_at)
  const resolutionHours: number[] = [];
  for (const insight of allInsights) {
    if (insight.resolved_at) {
      const hours =
        (new Date(insight.resolved_at).getTime() - new Date(insight.created_at).getTime()) /
        (1000 * 60 * 60);
      resolutionHours.push(hours);
    }
  }

  const avgResolutionHours =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : null;

  const resolvedIn24hPercent =
    resolutionHours.length > 0
      ? Math.round((resolutionHours.filter((h) => h <= 24).length / resolutionHours.length) * 100)
      : 0;

  // Backlog = unresolved insights
  const backlogSize = allInsights.filter(
    (i) => !i.resolved_at && i.status !== 'resolved'
  ).length;

  return {
    avgResolutionHours,
    resolvedThisWeek,
    resolvedIn24hPercent,
    backlogSize,
    weekOverWeekChange,
  };
}

/**
 * Format the digest as a plain-text WhatsApp message.
 */
function formatWhatsAppDigest(props: FoundersDigestProps): string {
  const { period, feedbackTrends, openIssues, resolutionMetrics } = props;

  const avgDisplay =
    resolutionMetrics.avgResolutionHours !== null
      ? resolutionMetrics.avgResolutionHours < 24
        ? `${Math.round(resolutionMetrics.avgResolutionHours)}h`
        : `${Math.round(resolutionMetrics.avgResolutionHours / 24)}d`
      : 'N/A';

  const lines: string[] = [
    `*Sahara Weekly Digest*`,
    `${period.from} to ${period.to}`,
    ``,
    `*Feedback:* ${feedbackTrends.totalSignals} signals (${feedbackTrends.positiveCount} pos / ${feedbackTrends.negativeCount} neg)`,
  ];

  if (feedbackTrends.weekOverWeekChange !== null) {
    const arrow = feedbackTrends.weekOverWeekChange > 0 ? '\u2191' : feedbackTrends.weekOverWeekChange < 0 ? '\u2193' : '\u2192';
    lines.push(`${arrow} ${Math.abs(feedbackTrends.weekOverWeekChange)}% vs last week`);
  }

  if (feedbackTrends.topCategories.length > 0) {
    lines.push(``);
    lines.push(`*Top categories:*`);
    feedbackTrends.topCategories.slice(0, 3).forEach((cat, i) => {
      lines.push(`${i + 1}. ${cat.category.replace(/_/g, ' ')} (${cat.count})`);
    });
  }

  lines.push(``);
  lines.push(`*Resolution:* avg ${avgDisplay} | ${resolutionMetrics.resolvedThisWeek} resolved | ${resolutionMetrics.resolvedIn24hPercent}% within 24h`);

  if (openIssues.length > 0) {
    lines.push(``);
    lines.push(`*Open Issues (${openIssues.length}):*`);
    openIssues.forEach((issue) => {
      const badge = issue.severity === 'critical' || issue.severity === 'high' ? '\u26a0\ufe0f' : '\u2022';
      lines.push(`${badge} ${issue.title} (${issue.daysSinceCreated}d, ${issue.signalCount} signals)`);
    });
  } else {
    lines.push(``);
    lines.push(`No open issues. All clear!`);
  }

  lines.push(``);
  lines.push(`Backlog: ${resolutionMetrics.backlogSize} items`);

  return lines.join('\\n');
}
