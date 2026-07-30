/**
 * Customer.io growth and retention event helpers.
 *
 * These helpers accept the canonical Firebase UID and emit append-only event
 * contracts. They do not decide who should receive a message: Customer.io
 * campaigns must still apply consent, suppression, and frequency rules.
 */

import {
  CUSTOMERIO_EVENTS,
  type LifecycleEventContext,
} from './events';
import { trackLifecycleEvent } from './track';
import type { CustomerIoResult, MemberId } from './types';

type SafeValue = string | number | boolean | null;
type SafeData = Record<string, SafeValue>;

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function eventId(name: string, memberId: string, occurrenceId: string): string {
  return `${name}:${memberId}:${occurrenceId}`;
}

export function trackWeeklyProgressReady(
  memberId: MemberId,
  context: LifecycleEventContext,
  weekId: string,
  data: SafeData = {},
): Promise<CustomerIoResult> {
  const occurrenceId = required(weekId, 'weekId');
  return trackLifecycleEvent(
    memberId,
    CUSTOMERIO_EVENTS.WEEKLY_PROGRESS_READY,
    context,
    { ...data, week_id: occurrenceId },
    eventId(CUSTOMERIO_EVENTS.WEEKLY_PROGRESS_READY, memberId, occurrenceId),
  );
}

export function trackHumanRescueRequested(
  memberId: MemberId,
  context: LifecycleEventContext,
  requestId: string,
  data: SafeData = {},
): Promise<CustomerIoResult> {
  const occurrenceId = required(requestId, 'requestId');
  return trackLifecycleEvent(
    memberId,
    CUSTOMERIO_EVENTS.HUMAN_RESCUE_REQUESTED,
    context,
    data,
    eventId(CUSTOMERIO_EVENTS.HUMAN_RESCUE_REQUESTED, memberId, occurrenceId),
  );
}

export function trackMemberFeedbackSubmitted(
  memberId: MemberId,
  context: LifecycleEventContext,
  feedbackId: string,
  data: SafeData = {},
): Promise<CustomerIoResult> {
  const occurrenceId = required(feedbackId, 'feedbackId');
  return trackLifecycleEvent(
    memberId,
    CUSTOMERIO_EVENTS.MEMBER_FEEDBACK_SUBMITTED,
    context,
    data,
    eventId(CUSTOMERIO_EVENTS.MEMBER_FEEDBACK_SUBMITTED, memberId, occurrenceId),
  );
}

export function trackAdvocacyEligible(
  memberId: MemberId,
  context: LifecycleEventContext,
  eligibilityId: string,
  data: SafeData = {},
): Promise<CustomerIoResult> {
  const occurrenceId = required(eligibilityId, 'eligibilityId');
  return trackLifecycleEvent(
    memberId,
    CUSTOMERIO_EVENTS.ADVOCACY_ELIGIBLE,
    context,
    data,
    eventId(CUSTOMERIO_EVENTS.ADVOCACY_ELIGIBLE, memberId, occurrenceId),
  );
}

export type FeatureAdoptionStage = 'viewed' | 'started' | 'completed';

const FEATURE_EVENTS = {
  viewed: CUSTOMERIO_EVENTS.FEATURE_VIEWED,
  started: CUSTOMERIO_EVENTS.FEATURE_STARTED,
  completed: CUSTOMERIO_EVENTS.FEATURE_COMPLETED,
} as const;

export function trackFeatureAdoptionEvent(
  memberId: MemberId,
  context: LifecycleEventContext,
  featureKey: string,
  stage: FeatureAdoptionStage,
  occurrenceId: string,
  data: SafeData = {},
): Promise<CustomerIoResult> {
  const feature = required(featureKey, 'featureKey');
  const occurrence = required(occurrenceId, 'occurrenceId');
  const name = FEATURE_EVENTS[stage];
  return trackLifecycleEvent(
    memberId,
    name,
    context,
    { ...data, feature_key: feature, adoption_stage: stage },
    eventId(name, memberId, `${feature}:${occurrence}`),
  );
}
