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
  /** Member has been inactive past the threshold. Triggers re-engagement. */
  INACTIVITY: 'inactivity',
  /** Member hit a founder milestone (e.g. first strategy, first agent run). */
  FOUNDER_MILESTONE: 'founder_milestone',
  /** Member submitted / uploaded a pitch deck. */
  DECK_SUBMITTED: 'deck_submitted',
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
