/**
 * Customer.io Track API — Member identify / event / suppression
 *
 * AI-13316: emits the member lifecycle signals Customer.io journeys key off.
 *
 * Idempotency (acceptance test): Customer.io upserts a member by its
 * identifier. Calling `identifyMember` with the same `id` twice updates the
 * profile in place — it never creates a duplicate. Events are appended, but a
 * caller-supplied `id` on an event dedupes retries. All functions no-op (and
 * return `{ skipped: true }`) when Customer.io is not configured, so app code
 * can call them unconditionally.
 */

import { logger } from '@/lib/logger';
import { getCustomerIoConfig } from './client';
import type { CustomerIoEventName } from './events';
import { SUPPRESSION_STATE, type SuppressionState } from './events';
import type { CustomerIoResult, MemberAttributes, MemberId } from './types';

const SKIP: CustomerIoResult = {
  success: false,
  skipped: true,
  error: 'Customer.io not configured',
};

/** Low-level Track API request. Never throws. */
async function request(
  method: 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<CustomerIoResult> {
  const config = getCustomerIoConfig();
  if (!config) return SKIP;

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: config.authHeader,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('[Customer.io] Track API non-2xx', {
        method,
        path,
        status: res.status,
        body: text.slice(0, 500),
      });
      return { success: false, status: res.status, error: text || res.statusText };
    }

    return { success: true, status: res.status };
  } catch (error) {
    logger.error('[Customer.io] Track API request failed', { method, path, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** URL-encode a member identifier for safe use in the request path. */
function encodeId(id: MemberId): string {
  return encodeURIComponent(id);
}

/**
 * Create or update a member (idempotent upsert by `id`).
 *
 * Call this on signup and whenever member attributes change. Passing the same
 * `id` a second time updates in place — no duplicate profile is created.
 */
export async function identifyMember(
  id: MemberId,
  attributes: MemberAttributes
): Promise<CustomerIoResult> {
  if (!id) return { success: false, error: 'identifyMember requires an id' };
  return request('PUT', `/api/v1/customers/${encodeId(id)}`, attributes);
}

/**
 * Emit a lifecycle event for a member.
 *
 * Provide a stable `dedupeId` on retries so the same logical event is not
 * counted twice (Customer.io honors the event `id` for dedup).
 */
export async function trackMemberEvent(
  id: MemberId,
  name: CustomerIoEventName,
  data?: Record<string, unknown>,
  dedupeId?: string
): Promise<CustomerIoResult> {
  if (!id) return { success: false, error: 'trackMemberEvent requires an id' };
  const payload: Record<string, unknown> = { name };
  if (data) payload.data = data;
  if (dedupeId) payload.id = dedupeId;
  return request('POST', `/api/v1/customers/${encodeId(id)}/events`, payload);
}

/**
 * Suppress a member — stops ALL sends and removes them from journeys.
 * Use for hard unsubscribes / consent withdrawal.
 */
export async function suppressMember(id: MemberId): Promise<CustomerIoResult> {
  if (!id) return { success: false, error: 'suppressMember requires an id' };
  return request('POST', `/api/v1/customers/${encodeId(id)}/suppress`);
}

/** Reverse a prior suppression (re-consent). */
export async function unsuppressMember(id: MemberId): Promise<CustomerIoResult> {
  if (!id) return { success: false, error: 'unsuppressMember requires an id' };
  return request('POST', `/api/v1/customers/${encodeId(id)}/unsuppress`);
}

/**
 * Set the member's subscription/suppression state.
 *
 * - `subscribed`   → clears the reserved `unsubscribed` attribute
 * - `unsubscribed` → sets the reserved `unsubscribed` attribute (soft opt-out)
 * - `suppressed`   → hard suppress via the suppress endpoint
 */
export async function setMemberSuppression(
  id: MemberId,
  state: SuppressionState,
  email?: string
): Promise<CustomerIoResult> {
  if (!id) return { success: false, error: 'setMemberSuppression requires an id' };

  if (state === SUPPRESSION_STATE.SUPPRESSED) {
    return suppressMember(id);
  }

  const attrs: MemberAttributes = {
    email: email ?? '',
    unsubscribed: state === SUPPRESSION_STATE.UNSUBSCRIBED,
  };
  // Don't overwrite email with empty string when caller didn't supply one.
  if (!email) delete (attrs as Partial<MemberAttributes>).email;
  return identifyMember(id, attrs as MemberAttributes);
}
