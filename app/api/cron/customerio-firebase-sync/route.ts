import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { syncFirebaseMembersToCustomerIo } from '@/lib/customerio/firebase-profile-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || !authorization) return false;
  const expected = createHmac('sha256', 'cron-auth')
    .update(`Bearer ${secret}`)
    .digest();
  const actual = createHmac('sha256', 'cron-auth').update(authorization).digest();
  return timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await syncFirebaseMembersToCustomerIo({
      emitRecentAccountEvents: true,
    });
    if (summary.failed > 0) {
      Sentry.captureMessage('Firebase to Customer.io profile sync had failures', {
        level: 'warning',
        tags: { integration: 'customerio', source: 'firebase' },
        contexts: { sync: summary },
      });
      return NextResponse.json({ ok: false, ...summary }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { integration: 'customerio', source: 'firebase' },
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown sync failure',
      },
      { status: 500 }
    );
  }
}
