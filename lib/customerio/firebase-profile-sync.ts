import type { UserRecord } from 'firebase-admin/auth';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getSaharaFirebaseAuth, getSaharaFirestore } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import { CUSTOMERIO_EVENTS, LIFECYCLE_CONSENT } from './events';
import { identifyMember, trackLifecycleEvent } from './track';
import type { CustomerIoResult, MemberAttributes } from './types';

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_CONCURRENCY = 10;

type ConsentRecord = {
  email?: boolean;
  sms?: boolean;
  dailyMotivation?: boolean;
};

export interface FirebaseMemberProfile {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  location?: unknown;
  createdAt?: unknown;
  firstSeenAt?: unknown;
  lastActiveAt?: unknown;
  stage?: unknown;
  stageCategory?: unknown;
  weakSpot?: unknown;
  ideaName?: unknown;
  ideaPitch?: unknown;
  targetMarket?: unknown;
  totalSessions?: unknown;
  totalChatMessages?: unknown;
  totalVoiceMinutes?: unknown;
  subscriptionTier?: unknown;
  subscriptionUpdatedAt?: unknown;
  foundingMemberNumber?: unknown;
  consentAt?: unknown;
  consents?: unknown;
  onboardingCompleted?: unknown;
  onboardingPercentage?: unknown;
  timezone?: unknown;
  country?: unknown;
  [key: string]: unknown;
}

export interface FirebaseCustomerIoSyncSummary {
  projectId: 'sahara-6800a';
  authUsers: number;
  firestoreProfiles: number;
  attempted: number;
  identified: number;
  accountEvents: number;
  skippedNoEmail: number;
  failed: number;
  errors: Array<{ uid: string; step: string; status?: number }>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function dateSeconds(value: unknown): number | undefined {
  const text = stringValue(value);
  const date =
    value instanceof Date
      ? value
      : typeof value === 'number'
        ? new Date(value > 10_000_000_000 ? value : value * 1000)
        : text
          ? new Date(text)
          : null;
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

function splitName(name: string | undefined) {
  const parts = name?.split(/\s+/).filter(Boolean) ?? [];
  return {
    ...(parts[0] ? { first_name: parts[0] } : {}),
    ...(parts.length > 1 ? { last_name: parts.slice(1).join(' ') } : {}),
  };
}

function readConsents(value: unknown): ConsentRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    email: typeof record.email === 'boolean' ? record.email : undefined,
    sms: typeof record.sms === 'boolean' ? record.sms : undefined,
    dailyMotivation:
      typeof record.dailyMotivation === 'boolean'
        ? record.dailyMotivation
        : undefined,
  };
}

export function buildFirebaseCustomerIoAttributes(
  user: Pick<
    UserRecord,
    'uid' | 'email' | 'phoneNumber' | 'displayName' | 'disabled' | 'metadata'
  >,
  profile: FirebaseMemberProfile = {}
): MemberAttributes | null {
  const email = stringValue(profile.email) ?? user.email?.trim().toLowerCase();
  if (!email) return null;

  const name = stringValue(profile.name) ?? stringValue(user.displayName);
  const phone = stringValue(profile.phone) ?? stringValue(user.phoneNumber);
  const consents = readConsents(profile.consents);
  const emailConsent = consents.email === true;
  const smsConsent = consents.sms === true;
  const dailyMotivationConsent = consents.dailyMotivation === true;
  const createdAt =
    dateSeconds(profile.createdAt) ??
    dateSeconds(user.metadata.creationTime);

  return {
    email: email.toLowerCase(),
    sahara_user_id: user.uid,
    ...(name ? { name, ...splitName(name) } : {}),
    ...(phone ? { phone } : {}),
    ...(createdAt ? { created_at: createdAt, signup_at: createdAt } : {}),
    ...(dateSeconds(profile.lastActiveAt)
      ? { last_active_at: dateSeconds(profile.lastActiveAt) }
      : {}),
    ...(dateSeconds(profile.consentAt)
      ? { consent_at: dateSeconds(profile.consentAt) }
      : {}),
    ...(stringValue(profile.location) ? { location: stringValue(profile.location) } : {}),
    ...(stringValue(profile.country) ? { country: stringValue(profile.country) } : {}),
    ...(stringValue(profile.timezone) ? { timezone: stringValue(profile.timezone) } : {}),
    ...(stringValue(profile.stage) ? { founder_stage: stringValue(profile.stage) } : {}),
    ...(stringValue(profile.stageCategory)
      ? { company_stage: stringValue(profile.stageCategory) }
      : {}),
    ...(stringValue(profile.weakSpot)
      ? { current_challenge: stringValue(profile.weakSpot) }
      : {}),
    ...(stringValue(profile.ideaName) ? { company_name: stringValue(profile.ideaName) } : {}),
    ...(stringValue(profile.ideaPitch) ? { company_pitch: stringValue(profile.ideaPitch) } : {}),
    ...(stringValue(profile.targetMarket)
      ? { target_market: stringValue(profile.targetMarket) }
      : {}),
    ...(numberValue(profile.totalSessions) !== undefined
      ? { total_sessions: numberValue(profile.totalSessions) }
      : {}),
    ...(numberValue(profile.totalChatMessages) !== undefined
      ? { total_chat_messages: numberValue(profile.totalChatMessages) }
      : {}),
    ...(numberValue(profile.totalVoiceMinutes) !== undefined
      ? { total_voice_minutes: numberValue(profile.totalVoiceMinutes) }
      : {}),
    ...(stringValue(profile.subscriptionTier)
      ? { membership_level: stringValue(profile.subscriptionTier) }
      : {}),
    ...(numberValue(profile.foundingMemberNumber) !== undefined
      ? { founding_member_number: numberValue(profile.foundingMemberNumber) }
      : {}),
    ...(numberValue(profile.onboardingPercentage) !== undefined
      ? { onboarding_percentage: numberValue(profile.onboardingPercentage) }
      : {}),
    onboarding_completed: profile.onboardingCompleted === true,
    email_consent: emailConsent,
    sms_consent: smsConsent,
    daily_motivation_consent: dailyMotivationConsent,
    email_consent_state:
      consents.email === undefined ? 'unknown' : emailConsent ? 'opted_in' : 'opted_out',
    sms_consent_state:
      consents.sms === undefined ? 'unknown' : smsConsent ? 'opted_in' : 'opted_out',
    daily_motivation_consent_state:
      consents.dailyMotivation === undefined
        ? 'unknown'
        : dailyMotivationConsent
          ? 'opted_in'
          : 'opted_out',
    unsubscribed: user.disabled || !emailConsent,
    firebase_account_disabled: user.disabled,
    profile_source: 'firebase',
  };
}

function createdRecently(user: UserRecord, now: number): boolean {
  const created = new Date(user.metadata.creationTime).getTime();
  return Number.isFinite(created) && created >= now - NEW_ACCOUNT_WINDOW_MS;
}

async function inBatches<T>(
  values: T[],
  worker: (value: T) => Promise<void>,
  concurrency = DEFAULT_CONCURRENCY
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor++;
        await worker(values[index]);
      }
    })
  );
}

async function listAllAuthUsers(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getSaharaFirebaseAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function recordFailure(
  summary: FirebaseCustomerIoSyncSummary,
  uid: string,
  step: string,
  result: CustomerIoResult
) {
  if (result.success) return;
  summary.failed += 1;
  summary.errors.push({ uid, step, ...(result.status ? { status: result.status } : {}) });
}

export async function syncFirebaseMembersToCustomerIo(
  options: { emitRecentAccountEvents?: boolean; now?: number } = {}
): Promise<FirebaseCustomerIoSyncSummary> {
  const [users, profileSnapshot] = await Promise.all([
    listAllAuthUsers(),
    getSaharaFirestore().collection('users').get(),
  ]);
  const profiles = new Map<string, FirebaseMemberProfile>(
    profileSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => [
      doc.id,
      doc.data() as FirebaseMemberProfile,
    ])
  );
  const now = options.now ?? Date.now();
  const summary: FirebaseCustomerIoSyncSummary = {
    projectId: 'sahara-6800a',
    authUsers: users.length,
    firestoreProfiles: profileSnapshot.size,
    attempted: 0,
    identified: 0,
    accountEvents: 0,
    skippedNoEmail: 0,
    failed: 0,
    errors: [],
  };

  await inBatches(users, async (user) => {
    const attributes = buildFirebaseCustomerIoAttributes(
      user,
      profiles.get(user.uid)
    );
    if (!attributes) {
      summary.skippedNoEmail += 1;
      return;
    }

    summary.attempted += 1;
    const identify = await identifyMember(user.uid, attributes);
    if (identify.success) summary.identified += 1;
    else recordFailure(summary, user.uid, 'identify', identify);

    if (
      identify.success &&
      options.emitRecentAccountEvents &&
      createdRecently(user, now)
    ) {
      const event = await trackLifecycleEvent(
        user.uid,
        CUSTOMERIO_EVENTS.ACCOUNT_CREATED,
        {
          source: 'firebase',
          correlationId: `firebase-account:${user.uid}`,
          consent:
            attributes.email_consent === true
              ? LIFECYCLE_CONSENT.MARKETING_OPTED_IN
              : LIFECYCLE_CONSENT.UNKNOWN,
        },
        { created_at: attributes.created_at, profile_source: 'firebase' },
        `firebase-account-created:${user.uid}`
      );
      if (event.success) summary.accountEvents += 1;
      else recordFailure(summary, user.uid, 'account_created', event);
    }
  });

  if (summary.errors.length > 0) {
    logger.warn('[Customer.io] Firebase profile sync had failures', {
      ...summary,
      errors: summary.errors.slice(0, 20),
    });
  }
  return summary;
}
