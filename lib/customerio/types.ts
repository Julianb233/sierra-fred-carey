/**
 * Customer.io Track API — Types
 *
 * AI-13316: Sahara member lifecycle email on saharamembers.com.
 *
 * Customer.io is the member lifecycle / behavioral messaging system. It is
 * intentionally separate from the GoHighLevel lead-generation lane (AI-12563).
 * Do not mix contact consent, lists, or automations between the two.
 */

/** Customer.io data-center region. Determines the Track API base URL. */
export type CustomerIoRegion = 'us' | 'eu';

/**
 * A member identifier. Customer.io upserts by this id, so it MUST be stable
 * for the lifetime of the member (use the Supabase user id, never the email —
 * emails change). Passing the same id twice updates in place (idempotent).
 */
export type MemberId = string;

/**
 * Attributes stored on a Customer.io member profile.
 *
 * `email` is required by Customer.io before it will send to a profile.
 * `created_at` (unix seconds) is used for domain warm-up cohorting.
 * `unsubscribed` is Customer.io's built-in reserved suppression attribute.
 */
export interface MemberAttributes {
  email: string;
  created_at?: number;
  first_name?: string;
  last_name?: string;
  plan?: string;
  onboarding_completed?: boolean;
  /** Reserved Customer.io attribute — true removes the member from all sends. */
  unsubscribed?: boolean;
  [key: string]: unknown;
}

/** Result of a Track API call. Never throws — errors are captured here. */
export interface CustomerIoResult {
  success: boolean;
  /** HTTP status, when a request was actually made. */
  status?: number;
  /** Reason a call did not succeed (or was skipped). */
  error?: string;
  /** True when the call was a no-op because Customer.io is not configured. */
  skipped?: boolean;
}
