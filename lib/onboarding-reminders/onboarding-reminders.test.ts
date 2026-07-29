/**
 * Onboarding Reminder unit tests
 * AI-3492: Automated email + text reminders for user engagement
 */

import { describe, it, expect } from 'vitest';
import {
  isEmailChannelConfigured,
  isSmsChannelConfigured,
} from './config';
import { tierForAge } from './detector';
import { ONBOARDING_EMAIL_COPY, getOnboardingSmsBody } from './messages';
import {
  INCOMPLETE_ONBOARDING_PROFILE_FILTER,
  type OnboardingReminderTier,
} from './types';

const TIERS: OnboardingReminderTier[] = ['day1', 'day3', 'day7'];

describe('tierForAge', () => {
  it('returns null for accounts younger than 1 day', () => {
    expect(tierForAge(0)).toBeNull();
  });

  it('maps 1-2 days to day1', () => {
    expect(tierForAge(1)).toBe('day1');
    expect(tierForAge(2)).toBe('day1');
  });

  it('maps 3-6 days to day3', () => {
    expect(tierForAge(3)).toBe('day3');
    expect(tierForAge(6)).toBe('day3');
  });

  it('maps 7+ days to day7 (the terminal tier)', () => {
    expect(tierForAge(7)).toBe('day7');
    expect(tierForAge(30)).toBe('day7');
    expect(tierForAge(365)).toBe('day7');
  });
});

describe('ONBOARDING_EMAIL_COPY', () => {
  it('has complete copy for every tier', () => {
    for (const tier of TIERS) {
      const copy = ONBOARDING_EMAIL_COPY[tier];
      expect(copy).toBeDefined();
      expect(copy.subject.length).toBeGreaterThan(0);
      expect(copy.headline.length).toBeGreaterThan(0);
      expect(copy.fredMessage.length).toBeGreaterThan(0);
      expect(copy.ctaLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('getOnboardingSmsBody', () => {
  it('includes the founder name when it fits in a single segment', () => {
    const body = getOnboardingSmsBody('Sam', 'day1');
    expect(body).toContain('Sam');
    expect(body).toContain('STOP');
  });

  it('keeps the SMS body within one 160-char segment for every tier', () => {
    for (const tier of TIERS) {
      const body = getOnboardingSmsBody('Sam', tier);
      expect(body.length).toBeLessThanOrEqual(160);
    }
  });

  it('falls back to a name-less variant when a long name would overflow', () => {
    const longName = 'A'.repeat(200);
    for (const tier of TIERS) {
      const body = getOnboardingSmsBody(longName, tier);
      expect(body.length).toBeLessThanOrEqual(160);
      expect(body).not.toContain(longName);
    }
  });

  it('always includes the STOP opt-out instruction', () => {
    for (const tier of TIERS) {
      expect(getOnboardingSmsBody('Sam', tier)).toContain('STOP');
    }
  });
});

describe('channel configuration', () => {
  it('requires a Resend API key for email dispatch', () => {
    expect(isEmailChannelConfigured({ RESEND_API_KEY: 're_test' })).toBe(true);
    expect(isEmailChannelConfigured({})).toBe(false);
  });

  it('requires all Twilio credentials before SMS dispatch is considered configured', () => {
    expect(
      isSmsChannelConfigured({
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_MESSAGING_SERVICE_SID: 'MG123',
      }),
    ).toBe(true);

    expect(
      isSmsChannelConfigured({
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_MESSAGING_SERVICE_SID: 'MG123',
      }),
    ).toBe(false);
  });
});

describe('profile eligibility filter', () => {
  it('includes both null and explicit false onboarding completion states', () => {
    expect(INCOMPLETE_ONBOARDING_PROFILE_FILTER).toContain(
      'onboarding_completed.is.null',
    );
    expect(INCOMPLETE_ONBOARDING_PROFILE_FILTER).toContain(
      'onboarding_completed.eq.false',
    );
  });
});
