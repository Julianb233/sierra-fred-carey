import { describe, expect, it } from 'vitest';
import { buildFirebaseCustomerIoAttributes } from './firebase-profile-sync';

const baseUser = {
  uid: 'firebase-uid-1',
  email: 'AUTH@EXAMPLE.COM',
  phoneNumber: undefined,
  displayName: 'Auth Name',
  disabled: false,
  metadata: {
    creationTime: '2026-07-23T10:00:00.000Z',
    lastSignInTime: '2026-07-24T10:00:00.000Z',
    lastRefreshTime: null,
    toJSON: () => ({}),
  },
};

describe('Firebase to Customer.io profile mapping', () => {
  it('uses Firebase UID and explicit, separate consent fields', () => {
    const attributes = buildFirebaseCustomerIoAttributes(baseUser, {
      name: 'Ada Founder',
      email: 'ADA@EXAMPLE.COM',
      phone: '+15555550123',
      createdAt: '2026-07-23T09:00:00.000Z',
      lastActiveAt: '2026-07-24T09:00:00.000Z',
      stage: 'Validation',
      ideaName: 'Engine Co',
      totalSessions: 4,
      consents: { email: true, sms: false },
      consentAt: '2026-07-23T09:05:00.000Z',
    });

    expect(attributes).toMatchObject({
      email: 'ada@example.com',
      sahara_user_id: 'firebase-uid-1',
      first_name: 'Ada',
      last_name: 'Founder',
      founder_stage: 'Validation',
      company_name: 'Engine Co',
      total_sessions: 4,
      email_consent: true,
      email_consent_state: 'opted_in',
      sms_consent: false,
      sms_consent_state: 'opted_out',
      daily_motivation_consent: false,
      daily_motivation_consent_state: 'unknown',
      unsubscribed: false,
      profile_source: 'firebase',
    });
  });

  it('fails closed when consent is missing', () => {
    expect(buildFirebaseCustomerIoAttributes(baseUser, {})).toMatchObject({
      email: 'auth@example.com',
      email_consent: false,
      sms_consent: false,
      daily_motivation_consent: false,
      email_consent_state: 'unknown',
      sms_consent_state: 'unknown',
      daily_motivation_consent_state: 'unknown',
      unsubscribed: true,
    });
  });

  it('skips records that have no email in Auth or Firestore', () => {
    expect(
      buildFirebaseCustomerIoAttributes(
        { ...baseUser, email: undefined },
        { name: 'No Email' }
      )
    ).toBeNull();
  });
});
