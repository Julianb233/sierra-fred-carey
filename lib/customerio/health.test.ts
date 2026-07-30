import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getSaharaFirestore: () => ({ collection: firestoreMocks.collection }),
}));

import {
  CUSTOMERIO_HEALTH_CHECKPOINTS,
  evaluateCustomerIoHealth,
  recordCustomerIoHealthCheckpoint,
} from './health';

beforeEach(() => {
  vi.clearAllMocks();
  firestoreMocks.collection.mockReturnValue({ doc: firestoreMocks.doc });
  firestoreMocks.doc.mockReturnValue({ set: firestoreMocks.set });
  firestoreMocks.set.mockResolvedValue(undefined);
});

describe('Customer.io health checkpoints', () => {
  it('stores aggregate allowlisted data only', async () => {
    await recordCustomerIoHealthCheckpoint(
      CUSTOMERIO_HEALTH_CHECKPOINTS.FIREBASE_SYNC,
      'success',
      {
        identified: 14,
        failed: 0,
        email: 'must-not-be-stored@example.com',
        credential: 'must-not-be-stored',
      },
      new Date('2026-07-30T12:00:00.000Z'),
    );

    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      'customerio_health_checkpoints',
    );
    expect(firestoreMocks.doc).toHaveBeenCalledWith('firebase_sync');
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      {
        checkpoint: 'firebase_sync',
        last_status: 'success',
        last_attempt_at: '2026-07-30T12:00:00.000Z',
        last_success_at: '2026-07-30T12:00:00.000Z',
        details: { identified: 14, failed: 0 },
      },
      { merge: true },
    );
  });

  it('marks a current successful sync healthy without requiring delivery traffic', () => {
    const result = evaluateCustomerIoHealth(
      {
        firebase_sync: {
          checkpoint: 'firebase_sync',
          last_status: 'success',
          last_attempt_at: '2026-07-30T12:00:00.000Z',
          last_success_at: '2026-07-30T12:00:00.000Z',
          last_failure_at: null,
          details: {},
        },
      },
      new Date('2026-07-30T12:10:00.000Z'),
    );
    expect(result.healthy).toBe(true);
    expect(result.checks[1].state).toBe('unknown');
  });

  it('marks failed and stale Firebase syncs unhealthy', () => {
    const failed = evaluateCustomerIoHealth(
      {
        firebase_sync: {
          checkpoint: 'firebase_sync',
          last_status: 'failure',
          last_attempt_at: '2026-07-30T12:00:00.000Z',
          last_success_at: null,
          last_failure_at: '2026-07-30T12:00:00.000Z',
          details: {},
        },
      },
      new Date('2026-07-30T12:01:00.000Z'),
    );
    expect(failed.healthy).toBe(false);
    expect(failed.checks[0].reason).toContain('failed');

    const stale = evaluateCustomerIoHealth(
      {
        firebase_sync: {
          checkpoint: 'firebase_sync',
          last_status: 'success',
          last_attempt_at: '2026-07-30T11:00:00.000Z',
          last_success_at: '2026-07-30T11:00:00.000Z',
          last_failure_at: null,
          details: {},
        },
      },
      new Date('2026-07-30T12:00:00.000Z'),
    );
    expect(stale.healthy).toBe(false);
    expect(stale.checks[0].reason).toContain('stale');
  });
});
