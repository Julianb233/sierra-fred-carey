/**
 * Canonical Customer.io profile hydration.
 *
 * Lifecycle events must never be the first write for a member: Customer.io
 * creates an ID-only profile when it receives an event for an unknown ID.
 * Resolve the member from Supabase and identify them before appending events.
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';
import { isCustomerIoConfigured } from './client';
import type {
  CustomerIoEventName,
  LifecycleEventContext,
} from './events';
import { buildMemberAttributes } from './member-lifecycle';
import { identifyMember, trackLifecycleEvent } from './track';
import type {
  CustomerIoResult,
} from './types';
import type { MemberLifecycleInput } from './member-lifecycle';

const NOT_CONFIGURED: CustomerIoResult = {
  success: false,
  skipped: true,
  error: 'Customer.io not configured',
};

type CanonicalProfile = {
  id: string;
  name: string | null;
  email: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
};

export type CanonicalMemberOverrides = Pick<
  MemberLifecycleInput,
  'email' | 'name' | 'phone' | 'stage' | 'companyName' | 'industry'
>;

/**
 * Upsert a Customer.io profile from Sahara's canonical Supabase identity.
 *
 * The auth record is an email fallback for older profiles whose public profile
 * row predates the email column. No event is emitted when a canonical email
 * cannot be resolved.
 */
export async function identifyCanonicalMember(
  userId: string,
  overrides: Partial<CanonicalMemberOverrides> = {},
): Promise<CustomerIoResult> {
  if (!userId) {
    return { success: false, error: 'identifyCanonicalMember requires a user id' };
  }
  if (!isCustomerIoConfigured()) return NOT_CONFIGURED;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, onboarding_completed, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('[Customer.io] Canonical profile lookup failed', {
        userId,
        error: error.message,
      });
      return { success: false, error: 'Canonical profile lookup failed' };
    }

    const profile = data as CanonicalProfile | null;
    const { data: authData, error: authError } =
      await supabase.auth.admin.getUserById(userId);
    if (authError) {
      logger.warn('[Customer.io] Auth identity lookup failed', {
        userId,
        error: authError.message,
      });
    }

    if (authData.user?.user_metadata?.is_test_account === true) {
      return {
        success: false,
        skipped: true,
        error: 'Production Customer.io excludes Sahara test accounts',
      };
    }

    const email = overrides.email ?? profile?.email ?? authData.user?.email ?? null;

    if (!email) {
      logger.warn('[Customer.io] Lifecycle event skipped: canonical email missing', {
        userId,
      });
      return {
        success: false,
        error: 'Canonical member email is required before lifecycle events',
      };
    }

    return identifyMember(
      userId,
      buildMemberAttributes({
        userId,
        email,
        name: overrides.name ?? profile?.name,
        phone: overrides.phone,
        stage: overrides.stage,
        companyName: overrides.companyName,
        industry: overrides.industry,
        createdAt: profile?.created_at,
        onboardingCompleted: Boolean(profile?.onboarding_completed),
        source: 'supabase',
      }),
    );
  } catch (error) {
    logger.error('[Customer.io] Canonical profile hydration failed', {
      userId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Identify from Supabase first, then append the lifecycle event.
 *
 * This ordering prevents Customer.io from creating ID-only profiles when a
 * cron or webhook encounters an older Sahara member.
 */
export async function trackCanonicalLifecycleEvent(
  userId: string,
  name: CustomerIoEventName,
  context: LifecycleEventContext,
  data?: Record<string, unknown>,
  dedupeId?: string,
  overrides?: Partial<CanonicalMemberOverrides>,
): Promise<CustomerIoResult> {
  const identify = await identifyCanonicalMember(userId, overrides);
  if (!identify.success) return identify;
  return trackLifecycleEvent(userId, name, context, data, dedupeId);
}
