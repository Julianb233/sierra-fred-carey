/**
 * Customer.io member lifecycle orchestration.
 *
 * Keeps route handlers small while preserving the Customer.io boundary:
 * member lifecycle events only, not GoHighLevel lead/outbound events.
 */

import { logger } from '@/lib/logger';
import { CUSTOMERIO_EVENTS } from './events';
import { identifyMember, trackMemberEvent } from './track';
import type { CustomerIoResult, MemberAttributes } from './types';

export interface MemberLifecycleInput {
  userId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  stage?: string | null;
  companyName?: string | null;
  industry?: string | null;
  source?: string;
  createdAt?: Date | string | number | null;
  isNewMember?: boolean;
  onboardingCompleted?: boolean;
}

export interface MemberLifecycleSyncResult {
  identify: CustomerIoResult;
  signup?: CustomerIoResult;
  onboardingCompleted?: CustomerIoResult;
}

function unixSeconds(value: MemberLifecycleInput['createdAt']): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return Math.floor(value / (value > 10_000_000_000 ? 1000 : 1));
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

function splitName(name: string | null | undefined): Pick<MemberAttributes, 'first_name' | 'last_name'> {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};
  return {
    first_name: parts[0],
    ...(parts.length > 1 ? { last_name: parts.slice(1).join(' ') } : {}),
  };
}

export function buildMemberAttributes(input: MemberLifecycleInput): MemberAttributes {
  const createdAt = unixSeconds(input.createdAt);

  return {
    email: input.email.toLowerCase(),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...splitName(input.name),
    ...(input.name ? { name: input.name } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.companyName ? { company_name: input.companyName } : {}),
    ...(input.industry ? { industry: input.industry } : {}),
    ...(input.source ? { source: input.source } : {}),
    onboarding_completed: Boolean(input.onboardingCompleted),
  };
}

function eventData(input: MemberLifecycleInput): Record<string, unknown> {
  return {
    source: input.source ?? 'onboard',
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.companyName ? { company_name: input.companyName } : {}),
    ...(input.industry ? { industry: input.industry } : {}),
  };
}

function logFailures(result: MemberLifecycleSyncResult): void {
  const failures = Object.entries(result)
    .filter(([, value]) => value && !value.success && !value.skipped)
    .map(([step, value]) => ({ step, status: value.status, error: value.error }));

  if (failures.length > 0) {
    logger.warn('[Customer.io] Member lifecycle sync returned failures', { failures });
  }
}

export async function syncMemberLifecycle(
  input: MemberLifecycleInput
): Promise<MemberLifecycleSyncResult> {
  const identify = await identifyMember(input.userId, buildMemberAttributes(input));
  const result: MemberLifecycleSyncResult = { identify };
  const data = eventData(input);

  if (input.isNewMember) {
    result.signup = await trackMemberEvent(
      input.userId,
      CUSTOMERIO_EVENTS.SIGNUP,
      data,
      `signup:${input.userId}`
    );
  }

  if (input.onboardingCompleted) {
    result.onboardingCompleted = await trackMemberEvent(
      input.userId,
      CUSTOMERIO_EVENTS.ONBOARDING_COMPLETED,
      data,
      `onboarding_completed:${input.userId}`
    );
  }

  logFailures(result);
  return result;
}
