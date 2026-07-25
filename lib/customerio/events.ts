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
  /** Member created an account. Triggers the welcome/onboarding journey. */
  SIGNUP: 'signup',
  /** Member began the onboarding flow. */
  ONBOARDING_STARTED: 'onboarding_started',
  /** Member finished onboarding. Exits the onboarding nudge journey. */
  ONBOARDING_COMPLETED: 'onboarding_completed',
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
  /** A payment attempt for the member failed. */
  PAYMENT_FAILED: 'payment_failed',
  /** Member is eligible for the daily motivational-message cohort. */
  MOTIVATIONAL_ELIGIBLE: 'motivational_eligible',
} as const;

export type CustomerIoEventName =
  (typeof CUSTOMERIO_EVENTS)[keyof typeof CUSTOMERIO_EVENTS];

/** Every lifecycle event name, for validation/iteration. */
export const CUSTOMERIO_EVENT_NAMES: readonly CustomerIoEventName[] =
  Object.values(CUSTOMERIO_EVENTS);

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
