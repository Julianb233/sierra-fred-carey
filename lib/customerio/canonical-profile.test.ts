import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  identify: vi.fn(async () => ({ success: true, status: 200 })),
  track: vi.fn(async () => ({ success: true, status: 200 })),
  build: vi.fn((input) => ({
    email: input.email,
    name: input.name,
    phone: input.phone,
    created_at: 123,
  })),
  maybeSingle: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('./client', () => ({
  isCustomerIoConfigured: mocks.configured,
}));

vi.mock('./track', () => ({
  identifyMember: mocks.identify,
  trackLifecycleEvent: mocks.track,
}));

vi.mock('./member-lifecycle', () => ({
  buildMemberAttributes: mocks.build,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: mocks.getUserById,
      },
    },
  }),
}));

import {
  identifyCanonicalMember,
  trackCanonicalLifecycleEvent,
} from './canonical-profile';
import { CUSTOMERIO_EVENTS, LIFECYCLE_CONSENT } from './events';

describe('canonical Customer.io profile hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'member-1',
        name: 'Sahara Founder',
        email: 'founder@example.com',
        onboarding_completed: true,
        created_at: '2026-07-01T00:00:00.000Z',
      },
      error: null,
    });
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: 'auth@example.com' } },
      error: null,
    });
  });

  it('does not query Supabase when Customer.io is not configured', async () => {
    mocks.configured.mockReturnValue(false);

    await expect(identifyCanonicalMember('member-1')).resolves.toMatchObject({
      skipped: true,
    });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  it('identifies the canonical Supabase profile', async () => {
    await expect(identifyCanonicalMember('member-1')).resolves.toMatchObject({
      success: true,
    });

    expect(mocks.identify).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({
        email: 'founder@example.com',
        name: 'Sahara Founder',
      }),
    );
    expect(mocks.getUserById).toHaveBeenCalledWith('member-1');
  });

  it('falls back to the Supabase Auth email for older profile rows', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'member-1',
        name: 'Legacy Founder',
        email: null,
        onboarding_completed: true,
        created_at: null,
      },
      error: null,
    });

    await identifyCanonicalMember('member-1');

    expect(mocks.getUserById).toHaveBeenCalledWith('member-1');
    expect(mocks.identify).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ email: 'auth@example.com' }),
    );
  });

  it('keeps tagged Sahara test accounts out of the production workspace', async () => {
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          email: 'test@example.com',
          user_metadata: { is_test_account: true },
        },
      },
      error: null,
    });

    await expect(identifyCanonicalMember('member-1')).resolves.toMatchObject({
      skipped: true,
      error: expect.stringContaining('test accounts'),
    });
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  it('does not create an ID-only profile when canonical email is missing', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: null });

    await expect(identifyCanonicalMember('member-1')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('email'),
    });
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  it('identifies before appending a lifecycle event', async () => {
    const order: string[] = [];
    mocks.identify.mockImplementationOnce(async () => {
      order.push('identify');
      return { success: true, status: 200 };
    });
    mocks.track.mockImplementationOnce(async () => {
      order.push('event');
      return { success: true, status: 200 };
    });

    await trackCanonicalLifecycleEvent(
      'member-1',
      CUSTOMERIO_EVENTS.INACTIVITY,
      {
        source: 'test',
        correlationId: 'correlation-1',
        consent: LIFECYCLE_CONSENT.UNKNOWN,
      },
    );

    expect(order).toEqual(['identify', 'event']);
  });

  it('does not append an event when canonical identification fails', async () => {
    mocks.identify.mockResolvedValueOnce({
      success: false,
      status: 401,
      error: 'unauthorized',
    });

    await expect(
      trackCanonicalLifecycleEvent(
        'member-1',
        CUSTOMERIO_EVENTS.INACTIVITY,
        {
          source: 'test',
          correlationId: 'correlation-1',
          consent: LIFECYCLE_CONSENT.UNKNOWN,
        },
      ),
    ).resolves.toMatchObject({ success: false });

    expect(mocks.track).not.toHaveBeenCalled();
  });
});
