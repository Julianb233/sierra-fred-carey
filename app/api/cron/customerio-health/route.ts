import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  evaluateCustomerIoHealth,
  readCustomerIoHealthRecords,
} from '@/lib/customerio/health';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

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
    const health = evaluateCustomerIoHealth(
      await readCustomerIoHealthRecords(),
    );
    if (!health.healthy) {
      Sentry.captureMessage('Customer.io lifecycle integration is unhealthy', {
        level: 'warning',
        fingerprint: ['customerio', 'lifecycle-health'],
        tags: { integration: 'customerio', source: 'firebase' },
        contexts: {
          customerio_health: {
            healthy: health.healthy,
            checked_at: health.checkedAt,
            checks: health.checks,
          },
        },
      });
    }
    return NextResponse.json(health, { status: health.healthy ? 200 : 503 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { integration: 'customerio', operation: 'health-read' },
    });
    return NextResponse.json(
      { healthy: false, error: 'Unable to read lifecycle health' },
      { status: 500 },
    );
  }
}
