/**
 * Customer.io — Member Lifecycle Event Schema
 *
 * AI-13316: the minimum member data/event schema Customer.io journeys key off.
 * These names are the contract between the Sahara app (which emits them) and
 * the Customer.io campaigns (which trigger on them). Renaming one silently
 * breaks any campaign trigger that references it — treat as append-only.
 */

/**
 * Canonical lifecycle event names. Values are the exact strings sent to
 * Customer.io as the event `name`.
 */
export const CUSTOMERIO_EVENTS = {
  /** Fred v1 acquisition event; emitted alongside the legacy signup alias. */
  ACCOUNT_CREATED: 'account_created',
  EMAIL_VERIFIED: 'email_verified',
  PHONE_VERIFIED: 'phone_verified',
  /** Member created an account. Triggers the welcome/onboarding journey. */
  SIGNUP: 'signup',
  /** Member began the onboarding flow. */
  ONBOARDING_STARTED: 'onboarding_started',
  /** Member finished onboarding. Exits the onboarding nudge journey. */
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FOUNDER_PROFILE_COMPLETED: 'founder_profile_completed',
  COMPANY_PROFILE_COMPLETED: 'company_profile_completed',
  IDEA_SUBMITTED: 'idea_submitted',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  RECOMMENDATION_CREATED: 'recommendation_created',
  RECOMMENDATION_VIEWED: 'recommendation_viewed',
  RECOMMENDED_ACTION_STARTED: 'recommended_action_started',
  RECOMMENDED_ACTION_COMPLETED: 'recommended_action_completed',
  RECOMMENDED_ACTION_OVERDUE: 'recommended_action_overdue',
  MILESTONE_REACHED: 'milestone_reached',
  SAHARA_SESSION_STARTED: 'sahara_session_started',
  SAHARA_SESSION_COMPLETED: 'sahara_session_completed',
  RESOURCE_VIEWED: 'resource_viewed',
  RESOURCE_DOWNLOADED: 'resource_downloaded',
  MEMBER_RETURNED: 'member_returned',
  PRICING_VIEWED: 'pricing_viewed',
  UPGRADE_STARTED: 'upgrade_started',
  UPGRADE_COMPLETED: 'upgrade_completed',
  /** Member reached the first product outcome that demonstrates value. */
  FIRST_VALUE_REACHED: 'first_value_reached',
  /** A recommended action remains unviewed past its due date. */
  RECOMMENDED_ACTION_NOT_VIEWED: 'recommended_action_not_viewed',
  /** Member has been inactive past the threshold. Triggers re-engagement. */
  INACTIVITY: 'inactivity',
  /** Member hit a founder milestone (e.g. first strategy, first agent run). */
  FOUNDER_MILESTONE: 'founder_milestone',
  /** Member submitted / uploaded a pitch deck. */
  DECK_SUBMITTED: 'deck_submitted',
  /** Member started a paid subscription. */
  SUBSCRIPTION_STARTED: 'subscription_started',
  /** Member entered the paid-member onboarding sequence. */
  PAID_ONBOARDING_STARTED: 'paid_onboarding_started',
  /** A subscription checkout expired before completion. */
  UPGRADE_ABANDONED: 'upgrade_abandoned',
  /** Member's paid subscription status, plan, or renewal state changed. */
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  /** Member canceled a paid subscription. */
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  /** Fred v1 spelling; emitted alongside the legacy US-English alias. */
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  /** A payment attempt for the member failed. */
  PAYMENT_FAILED: 'payment_failed',
  MEMBER_BECAME_INACTIVE: 'member_became_inactive',
  SMS_OPT_IN: 'sms_opt_in',
  SMS_OPT_OUT: 'sms_opt_out',
  DAILY_MOTIVATION_OPT_IN: 'daily_motivation_opt_in',
  DAILY_MOTIVATION_OPT_OUT: 'daily_motivation_opt_out',
  /** Member is eligible for the daily motivational-message cohort. */
  MOTIVATIONAL_ELIGIBLE: 'motivational_eligible',
} as const;

export type CustomerIoEventName =
  (typeof CUSTOMERIO_EVENTS)[keyof typeof CUSTOMERIO_EVENTS];

/** Every lifecycle event name, for validation/iteration. */
export const CUSTOMERIO_EVENT_NAMES: readonly CustomerIoEventName[] =
  Object.values(CUSTOMERIO_EVENTS);

/** Exact normalized vocabulary in Fred Cary's July 2026 communication plan. */
export const FRED_V1_CUSTOMERIO_EVENT_NAMES = [
  CUSTOMERIO_EVENTS.ACCOUNT_CREATED,
  CUSTOMERIO_EVENTS.EMAIL_VERIFIED,
  CUSTOMERIO_EVENTS.PHONE_VERIFIED,
  CUSTOMERIO_EVENTS.ONBOARDING_STARTED,
  CUSTOMERIO_EVENTS.ONBOARDING_COMPLETED,
  CUSTOMERIO_EVENTS.FOUNDER_PROFILE_COMPLETED,
  CUSTOMERIO_EVENTS.COMPANY_PROFILE_COMPLETED,
  CUSTOMERIO_EVENTS.IDEA_SUBMITTED,
  CUSTOMERIO_EVENTS.ANALYSIS_STARTED,
  CUSTOMERIO_EVENTS.ANALYSIS_COMPLETED,
  CUSTOMERIO_EVENTS.RECOMMENDATION_CREATED,
  CUSTOMERIO_EVENTS.RECOMMENDATION_VIEWED,
  CUSTOMERIO_EVENTS.RECOMMENDED_ACTION_STARTED,
  CUSTOMERIO_EVENTS.RECOMMENDED_ACTION_COMPLETED,
  CUSTOMERIO_EVENTS.RECOMMENDED_ACTION_OVERDUE,
  CUSTOMERIO_EVENTS.MILESTONE_REACHED,
  CUSTOMERIO_EVENTS.SAHARA_SESSION_STARTED,
  CUSTOMERIO_EVENTS.SAHARA_SESSION_COMPLETED,
  CUSTOMERIO_EVENTS.RESOURCE_VIEWED,
  CUSTOMERIO_EVENTS.RESOURCE_DOWNLOADED,
  CUSTOMERIO_EVENTS.MEMBER_RETURNED,
  CUSTOMERIO_EVENTS.PRICING_VIEWED,
  CUSTOMERIO_EVENTS.UPGRADE_STARTED,
  CUSTOMERIO_EVENTS.UPGRADE_COMPLETED,
  CUSTOMERIO_EVENTS.PAYMENT_FAILED,
  CUSTOMERIO_EVENTS.SUBSCRIPTION_CANCELLED,
  CUSTOMERIO_EVENTS.MEMBER_BECAME_INACTIVE,
  CUSTOMERIO_EVENTS.SMS_OPT_IN,
  CUSTOMERIO_EVENTS.SMS_OPT_OUT,
  CUSTOMERIO_EVENTS.DAILY_MOTIVATION_OPT_IN,
  CUSTOMERIO_EVENTS.DAILY_MOTIVATION_OPT_OUT,
] as const satisfies readonly CustomerIoEventName[];

/** Type guard — is `name` a known lifecycle event? */
export function isCustomerIoEvent(name: string): name is CustomerIoEventName {
  return (CUSTOMERIO_EVENT_NAMES as readonly string[]).includes(name);
}

/**
 * Suppression / consent state. Mirrors Customer.io's reserved `unsubscribed`
 * attribute plus the explicit suppress/unsuppress API. Kept as a small enum so
 * callers never hand-roll the reserved attribute name.
 */
export const SUPPRESSION_STATE = {
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  SUPPRESSED: 'suppressed',
} as const;

export type SuppressionState =
  (typeof SUPPRESSION_STATE)[keyof typeof SUPPRESSION_STATE];

/**
 * Consent at the moment a lifecycle event occurred.
 *
 * Journeys must explicitly branch on this value. `unknown` is deliberately
 * ineligible for marketing sends; transactional events may only power
 * transactional messages.
 */
export const LIFECYCLE_CONSENT = {
  TRANSACTIONAL: 'transactional',
  MARKETING_OPTED_IN: 'marketing_opted_in',
  MARKETING_OPTED_OUT: 'marketing_opted_out',
  UNKNOWN: 'unknown',
} as const;

export type LifecycleConsent =
  (typeof LIFECYCLE_CONSENT)[keyof typeof LIFECYCLE_CONSENT];

export interface LifecycleEventContext {
  source: string;
  correlationId: string;
  consent: LifecycleConsent;
}
