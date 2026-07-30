/**
 * Durable, redacted health checkpoints for the Firebase <-> Customer.io lane.
 *
 * Each checkpoint stores timestamps and aggregate counters only. Member
 * identifiers, addresses, message bodies, and provider credentials are never
 * accepted by this API.
 */

import { getSaharaFirestore } from '@/lib/firebase/admin';

export const CUSTOMERIO_HEALTH_CHECKPOINTS = {
  FIREBASE_SYNC: 'firebase_sync',
  REPORTING_WEBHOOK: 'reporting_webhook',
} as const;

export type CustomerIoHealthCheckpoint =
  (typeof CUSTOMERIO_HEALTH_CHECKPOINTS)[keyof typeof CUSTOMERIO_HEALTH_CHECKPOINTS];

export type CustomerIoCheckpointStatus = 'success' | 'failure';
type SafeDetail = string | number | boolean | null;

export interface CustomerIoHealthRecord {
  checkpoint: CustomerIoHealthCheckpoint;
  last_status: CustomerIoCheckpointStatus;
  last_attempt_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  details: Record<string, SafeDetail>;
}

export interface CustomerIoHealthEvaluation {
  healthy: boolean;
  checkedAt: string;
  checks: Array<{
    checkpoint: CustomerIoHealthCheckpoint;
    state: 'healthy' | 'unhealthy' | 'unknown';
    lastAttemptAt: string | null;
    reason: string;
  }>;
}

const ALLOWED_DETAIL_KEYS = new Set([
  'auth_users',
  'firestore_profiles',
  'attempted',
  'identified',
  'account_events',
  'skipped_no_email',
  'failed',
  'metric',
  'object_type',
  'duplicate',
]);

function sanitizeDetails(
  details: Record<string, unknown>,
): Record<string, SafeDetail> {
  return Object.fromEntries(
    Object.entries(details).flatMap(([key, value]) => {
      if (!ALLOWED_DETAIL_KEYS.has(key)) return [];
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return [[key, typeof value === 'string' ? value.slice(0, 64) : value]];
      }
      return [];
    }),
  );
}

export async function recordCustomerIoHealthCheckpoint(
  checkpoint: CustomerIoHealthCheckpoint,
  status: CustomerIoCheckpointStatus,
  details: Record<string, unknown> = {},
  now = new Date(),
): Promise<void> {
  const timestamp = now.toISOString();
  const record: Record<string, unknown> = {
    checkpoint,
    last_status: status,
    last_attempt_at: timestamp,
    details: sanitizeDetails(details),
  };
  if (status === 'success') record.last_success_at = timestamp;
  if (status === 'failure') record.last_failure_at = timestamp;

  await getSaharaFirestore()
    .collection('customerio_health_checkpoints')
    .doc(checkpoint)
    .set(record, { merge: true });
}

export async function readCustomerIoHealthRecords(): Promise<
  Partial<Record<CustomerIoHealthCheckpoint, CustomerIoHealthRecord>>
> {
  const firestore = getSaharaFirestore();
  const checkpoints = Object.values(CUSTOMERIO_HEALTH_CHECKPOINTS);
  const snapshots = await Promise.all(
    checkpoints.map((checkpoint) =>
      firestore.collection('customerio_health_checkpoints').doc(checkpoint).get(),
    ),
  );
  return Object.fromEntries(
    snapshots.flatMap((snapshot, index) =>
      snapshot.exists
        ? [[checkpoints[index], snapshot.data() as CustomerIoHealthRecord]]
        : [],
    ),
  );
}

export function evaluateCustomerIoHealth(
  records: Partial<Record<CustomerIoHealthCheckpoint, CustomerIoHealthRecord>>,
  now = new Date(),
  firebaseSyncMaxAgeMs = 15 * 60 * 1000,
): CustomerIoHealthEvaluation {
  const sync = records.firebase_sync;
  const reporting = records.reporting_webhook;
  const syncAge = sync
    ? now.getTime() - new Date(sync.last_attempt_at).getTime()
    : Number.POSITIVE_INFINITY;
  const syncHealthy =
    Boolean(sync) &&
    sync?.last_status === 'success' &&
    Number.isFinite(syncAge) &&
    syncAge <= firebaseSyncMaxAgeMs;

  const checks: CustomerIoHealthEvaluation['checks'] = [
    {
      checkpoint: CUSTOMERIO_HEALTH_CHECKPOINTS.FIREBASE_SYNC,
      state: syncHealthy ? 'healthy' : 'unhealthy',
      lastAttemptAt: sync?.last_attempt_at ?? null,
      reason: !sync
        ? 'No Firebase sync checkpoint has been recorded'
        : sync.last_status === 'failure'
          ? 'The most recent Firebase sync failed'
          : syncAge > firebaseSyncMaxAgeMs
            ? 'The Firebase sync checkpoint is stale'
            : 'The Firebase sync is current',
    },
    {
      checkpoint: CUSTOMERIO_HEALTH_CHECKPOINTS.REPORTING_WEBHOOK,
      state: !reporting
        ? 'unknown'
        : reporting.last_status === 'success'
          ? 'healthy'
          : 'unhealthy',
      lastAttemptAt: reporting?.last_attempt_at ?? null,
      reason: !reporting
        ? 'No delivery event has arrived yet; this does not prove a failure'
        : reporting.last_status === 'success'
          ? 'The latest delivery event was accepted'
          : 'The latest delivery event could not be stored',
    },
  ];

  return {
    healthy: syncHealthy && checks.every((check) => check.state !== 'unhealthy'),
    checkedAt: now.toISOString(),
    checks,
  };
}
