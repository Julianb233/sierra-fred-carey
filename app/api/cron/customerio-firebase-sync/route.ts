import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { syncFirebaseMembersToCustomerIo } from '@/lib/customerio/firebase-profile-sync';
import {
  CUSTOMERIO_HEALTH_CHECKPOINTS,
  recordCustomerIoHealthCheckpoint,
} from '@/lib/customerio/health';

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
    await recordCustomerIoHealthCheckpoint(
      CUSTOMERIO_HEALTH_CHECKPOINTS.FIREBASE_SYNC,
      summary.failed > 0 ? 'failure' : 'success',
      {
        auth_users: summary.authUsers,
        firestore_profiles: summary.firestoreProfiles,
        attempted: summary.attempted,
        identified: summary.identified,
        account_events: summary.accountEvents,
        skipped_no_email: summary.skippedNoEmail,
        failed: summary.failed,
      },
    );
    if (summary.failed > 0) {
      Sentry.captureMessage('Firebase to Customer.io profile sync had failures', {
        level: 'warning',
        tags: { integration: 'customerio', source: 'firebase' },
        contexts: {
          sync: {
            project_id: summary.projectId,
            auth_users: summary.authUsers,
            firestore_profiles: summary.firestoreProfiles,
            attempted: summary.attempted,
            identified: summary.identified,
            account_events: summary.accountEvents,
            skipped_no_email: summary.skippedNoEmail,
            failed: summary.failed,
          },
        },
      });
      return NextResponse.json({ ok: false, ...summary }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    try {
      await recordCustomerIoHealthCheckpoint(
        CUSTOMERIO_HEALTH_CHECKPOINTS.FIREBASE_SYNC,
        'failure',
      );
    } catch {
      // The original exception remains the actionable failure.
    }
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
