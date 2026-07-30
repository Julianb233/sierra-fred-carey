import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetCustomerIoConfig } from './client';
import {
  trackFeatureAdoptionEvent,
  trackHumanRescueRequested,
  trackWeeklyProgressReady,
} from './growth-lifecycle';

const context = {
  source: 'firebase',
  correlationId: 'corr-1',
  consent: 'marketing_opted_in' as const,
};

function configure() {
  process.env.CUSTOMERIO_SITE_ID = 'site';
  process.env.CUSTOMERIO_TRACK_API_KEY = 'key';
  __resetCustomerIoConfig();
}

afterEach(() => {
  delete process.env.CUSTOMERIO_SITE_ID;
  delete process.env.CUSTOMERIO_TRACK_API_KEY;
  __resetCustomerIoConfig();
  vi.unstubAllGlobals();
});

describe('Customer.io growth lifecycle helpers', () => {
  it('uses a stable weekly dedupe id and carries consent provenance', async () => {
    configure();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await trackWeeklyProgressReady('firebase-uid', context, '2026-W31', {
      completed_steps: 4,
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'weekly_progress_ready',
      data: {
        completed_steps: 4,
        week_id: '2026-W31',
        source: 'firebase',
        correlation_id: 'corr-1',
        consent_state: 'marketing_opted_in',
      },
      id: 'weekly_progress_ready:firebase-uid:2026-W31',
    });
  });

  it('separates feature stage and occurrence in the event id', async () => {
    configure();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await trackFeatureAdoptionEvent(
      'firebase-uid',
      context,
      'reality_lens',
      'completed',
      'analysis-42',
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: 'feature_completed',
      id: 'feature_completed:firebase-uid:reality_lens:analysis-42',
      data: {
        feature_key: 'reality_lens',
        adoption_stage: 'completed',
      },
    });
  });

  it('fails closed when an occurrence id is missing', () => {
    expect(() =>
      trackHumanRescueRequested('firebase-uid', context, '   '),
    ).toThrow('requestId is required');
  });
});
