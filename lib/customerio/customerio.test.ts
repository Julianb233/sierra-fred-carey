/**
 * Customer.io integration — unit tests
 *
 * AI-13316. Covers the acceptance criteria that can be verified in code:
 *  - dummy member created and updated twice → no duplicate profile (idempotent
 *    upsert to the SAME identifier URL)
 *  - lifecycle event schema is stable and complete
 *  - suppression / unsubscribe behavior hits the right endpoints
 *  - graceful no-op when Customer.io is not configured (dev/CI safe)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCustomerIoConfig,
  getCustomerIoConfig,
  isCustomerIoConfigured,
} from './client';
import {
  CUSTOMERIO_EVENTS,
  CUSTOMERIO_EVENT_NAMES,
  isCustomerIoEvent,
  SUPPRESSION_STATE,
} from './events';
import {
  identifyMember,
  setMemberSuppression,
  suppressMember,
  trackMemberEvent,
  unsuppressMember,
} from './track';

const ORIG_ENV = { ...process.env };

function configure(region?: string) {
  process.env.CUSTOMERIO_SITE_ID = 'site_abc';
  process.env.CUSTOMERIO_TRACK_API_KEY = 'track_xyz';
  if (region) process.env.CUSTOMERIO_REGION = region;
  else delete process.env.CUSTOMERIO_REGION;
  __resetCustomerIoConfig();
}

function unconfigure() {
  delete process.env.CUSTOMERIO_SITE_ID;
  delete process.env.CUSTOMERIO_TRACK_API_KEY;
  delete process.env.CUSTOMERIO_REGION;
  __resetCustomerIoConfig();
}

/** Install a fake fetch returning 200; return the mock for assertions. */
function mockFetchOk() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => '',
  }));
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  __resetCustomerIoConfig();
  vi.unstubAllGlobals();
});

describe('config', () => {
  it('is null and callers no-op when credentials are absent', async () => {
    unconfigure();
    expect(isCustomerIoConfigured()).toBe(false);
    expect(getCustomerIoConfig()).toBeNull();

    const fetchMock = mockFetchOk();
    const res = await identifyMember('u1', { email: 'a@b.com' });
    expect(res.skipped).toBe(true);
    expect(res.success).toBe(false);
    // No network call attempted when unconfigured.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds US region + Basic auth by default', () => {
    configure();
    const cfg = getCustomerIoConfig(true)!;
    expect(cfg.baseUrl).toBe('https://track.customer.io');
    expect(cfg.authHeader).toBe(
      `Basic ${Buffer.from('site_abc:track_xyz').toString('base64')}`
    );
  });

  it('honors EU region', () => {
    configure('eu');
    expect(getCustomerIoConfig(true)!.baseUrl).toBe('https://track-eu.customer.io');
  });
});

describe('event schema', () => {
  it('exposes every required lifecycle event', () => {
    expect(CUSTOMERIO_EVENTS.SIGNUP).toBe('signup');
    expect(CUSTOMERIO_EVENTS.ONBOARDING_STARTED).toBe('onboarding_started');
    expect(CUSTOMERIO_EVENTS.ONBOARDING_COMPLETED).toBe('onboarding_completed');
    expect(CUSTOMERIO_EVENTS.INACTIVITY).toBe('inactivity');
    expect(CUSTOMERIO_EVENTS.FOUNDER_MILESTONE).toBe('founder_milestone');
    expect(CUSTOMERIO_EVENTS.DECK_SUBMITTED).toBe('deck_submitted');
    expect(CUSTOMERIO_EVENT_NAMES).toHaveLength(6);
  });

  it('type-guards known vs unknown event names', () => {
    expect(isCustomerIoEvent('signup')).toBe(true);
    expect(isCustomerIoEvent('not_a_real_event')).toBe(false);
  });
});

describe('idempotent member create/update', () => {
  it('updating the same id twice targets the SAME customer URL (no duplicate)', async () => {
    configure();
    const fetchMock = mockFetchOk();

    await identifyMember('user-42', { email: 'founder@sahara.app', plan: 'free' });
    await identifyMember('user-42', { email: 'founder@sahara.app', plan: 'pro' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url1 = fetchMock.mock.calls[0][0];
    const url2 = fetchMock.mock.calls[1][0];
    // Same identifier => same upsert URL => Customer.io updates in place.
    expect(url1).toBe('https://track.customer.io/api/v1/customers/user-42');
    expect(url2).toBe(url1);

    const init1 = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init1.method).toBe('PUT');
    expect(JSON.parse(init1.body as string)).toMatchObject({ plan: 'free' });
    const init2 = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(init2.body as string)).toMatchObject({ plan: 'pro' });
  });

  it('url-encodes odd identifiers', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await identifyMember('a b/c', { email: 'x@y.com' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://track.customer.io/api/v1/customers/a%20b%2Fc'
    );
  });

  it('rejects an empty id without calling the API', async () => {
    configure();
    const fetchMock = mockFetchOk();
    const res = await identifyMember('', { email: 'x@y.com' });
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('event tracking', () => {
  it('posts the event to the customer events endpoint with dedupe id', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await trackMemberEvent(
      'user-7',
      CUSTOMERIO_EVENTS.DECK_SUBMITTED,
      { deckId: 'd1' },
      'evt-unique-1'
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://track.customer.io/api/v1/customers/user-7/events');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'deck_submitted',
      data: { deckId: 'd1' },
      id: 'evt-unique-1',
    });
  });
});

describe('suppression / unsubscribe', () => {
  it('SUPPRESSED hits the suppress endpoint', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await setMemberSuppression('u9', SUPPRESSION_STATE.SUPPRESSED);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://track.customer.io/api/v1/customers/u9/suppress'
    );
  });

  it('UNSUBSCRIBED sets the reserved unsubscribed attribute', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await setMemberSuppression('u9', SUPPRESSION_STATE.UNSUBSCRIBED, 'u9@x.com');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toMatchObject({
      email: 'u9@x.com',
      unsubscribed: true,
    });
  });

  it('SUBSCRIBED clears the unsubscribed attribute', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await setMemberSuppression('u9', SUPPRESSION_STATE.SUBSCRIBED, 'u9@x.com');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({
      unsubscribed: false,
    });
  });

  it('suppress/unsuppress hit their endpoints', async () => {
    configure();
    const fetchMock = mockFetchOk();
    await suppressMember('u1');
    await unsuppressMember('u1');
    expect(fetchMock.mock.calls[0][0]).toContain('/suppress');
    expect(fetchMock.mock.calls[1][0]).toContain('/unsuppress');
  });
});

describe('resilience', () => {
  it('never throws on a network error — returns a failed result', async () => {
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch
    );
    const res = await identifyMember('u1', { email: 'a@b.com' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('network down');
  });

  it('surfaces a non-2xx status without throwing', async () => {
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'bad creds',
      })) as unknown as typeof fetch
    );
    const res = await identifyMember('u1', { email: 'a@b.com' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(401);
  });
});
