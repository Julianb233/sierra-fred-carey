import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOMERIO_EVENTS } from './events';
import { buildMemberAttributes, syncMemberLifecycle } from './member-lifecycle';
import { identifyMember, trackMemberEvent } from './track';

vi.mock('./track', () => ({
  identifyMember: vi.fn(async () => ({ success: true, status: 200 })),
  trackMemberEvent: vi.fn(async () => ({ success: true, status: 200 })),
}));

describe('member lifecycle sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds Customer.io attributes from onboarding profile data', () => {
    expect(
      buildMemberAttributes({
        userId: 'user-1',
        email: 'FOUNDER@EXAMPLE.COM',
        name: 'Ada Lovelace',
        phone: '+15555550123',
        stage: 'seed',
        companyName: 'Analytical Engines',
        industry: 'software',
        source: 'onboard',
        createdAt: 1234567890,
        onboardingCompleted: true,
      })
    ).toMatchObject({
      email: 'founder@example.com',
      first_name: 'Ada',
      last_name: 'Lovelace',
      name: 'Ada Lovelace',
      phone: '+15555550123',
      stage: 'seed',
      company_name: 'Analytical Engines',
      industry: 'software',
      source: 'onboard',
      created_at: 1234567890,
      onboarding_completed: true,
    });
  });

  it('identifies a new member and emits stable deduped lifecycle events', async () => {
    await syncMemberLifecycle({
      userId: 'user-42',
      email: 'founder@sahara.app',
      name: 'Founder One',
      stage: 'mvp',
      source: 'quick_onboard',
      isNewMember: true,
      onboardingCompleted: true,
    });

    expect(identifyMember).toHaveBeenCalledWith(
      'user-42',
      expect.objectContaining({
        email: 'founder@sahara.app',
        stage: 'mvp',
        source: 'quick_onboard',
        onboarding_completed: true,
      })
    );
    expect(trackMemberEvent).toHaveBeenCalledTimes(2);
    expect(trackMemberEvent).toHaveBeenNthCalledWith(
      1,
      'user-42',
      CUSTOMERIO_EVENTS.SIGNUP,
      expect.objectContaining({ source: 'quick_onboard', stage: 'mvp' }),
      'signup:user-42'
    );
    expect(trackMemberEvent).toHaveBeenNthCalledWith(
      2,
      'user-42',
      CUSTOMERIO_EVENTS.ONBOARDING_COMPLETED,
      expect.objectContaining({ source: 'quick_onboard', stage: 'mvp' }),
      'onboarding_completed:user-42'
    );
  });

  it('does not emit signup for an existing member profile update', async () => {
    await syncMemberLifecycle({
      userId: 'user-42',
      email: 'founder@sahara.app',
      isNewMember: false,
      onboardingCompleted: true,
    });

    expect(identifyMember).toHaveBeenCalledTimes(1);
    expect(trackMemberEvent).toHaveBeenCalledTimes(1);
    expect(trackMemberEvent).toHaveBeenCalledWith(
      'user-42',
      CUSTOMERIO_EVENTS.ONBOARDING_COMPLETED,
      expect.objectContaining({ source: 'onboard' }),
      'onboarding_completed:user-42'
    );
  });
});
