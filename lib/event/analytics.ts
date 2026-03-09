/**
 * Event Analytics Constants
 * Phase 88: Event Launch Kit
 *
 * PostHog event names for tracking event landing page interactions.
 */

export const EVENT_ANALYTICS = {
  LANDING_VIEW: "event_landing_view",
  SIGNUP_START: "event_signup_started",
  SIGNUP_COMPLETE: "event_signup_completed",
  SIGNUP_ERROR: "event_signup_error",
  TRIAL_ACTIVATED: "event_trial_activated",
} as const
