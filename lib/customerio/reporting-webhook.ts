/**
 * Customer.io reporting webhook verification and redacted evidence storage.
 *
 * Customer.io signs: `v0:<X-CIO-Timestamp>:<raw body>` with HMAC-SHA256.
 * The event id is the replay/deduplication key. We intentionally do not reject
 * old timestamps because Customer.io legitimately retries failures for seven
 * days; a valid retry receives a successful duplicate acknowledgement.
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export interface CustomerIoReportingPayload {
  event_id: string;
  object_type: string;
  metric: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface CustomerIoReportingRecord {
  event_id: string;
  object_type: string;
  metric: string;
  occurred_at: string;
  delivery_id_hash: string | null;
  subject_id_hash: string | null;
  campaign_id: string | null;
  action_id: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface CustomerIoReportingResult {
  accepted: boolean;
  duplicate: boolean;
  eventId: string;
}

const ACTIONABLE_METRICS = new Set([
  'bounced',
  'bounce',
  'complained',
  'complaint',
  'failed',
  'failure',
  'undeliverable',
  'dropped',
]);

/**
 * Metrics that require operator review in the existing Sentry -> Linear lane.
 * Unsubscribes are retained as consent evidence but are not operational errors.
 */
export function isActionableCustomerIoMetric(metric: string): boolean {
  return ACTIONABLE_METRICS.has(metric.trim().toLowerCase());
}

function constantTimeHexEqual(expected: string, provided: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(provided, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyCustomerIoReportingSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret = process.env.CUSTOMERIO_WEBHOOK_SIGNING_KEY,
): boolean {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const signed = `v0:${timestamp}:${rawBody}`;
  const expected = createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  return constantTimeHexEqual(expected, signature.trim());
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function hashReference(value: unknown, secret: string): string | null {
  const normalized = stringValue(value);
  if (!normalized) return null;
  return createHash('sha256')
    .update(`${secret}:${normalized}`, 'utf8')
    .digest('hex');
}

export function parseCustomerIoReportingPayload(
  value: unknown,
): CustomerIoReportingPayload | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const eventId = stringValue(payload.event_id);
  const objectType = stringValue(payload.object_type);
  const metric = stringValue(payload.metric);
  const timestamp =
    typeof payload.timestamp === 'number'
      ? payload.timestamp
      : Number(payload.timestamp);

  if (
    !eventId ||
    !objectType ||
    !metric ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return null;
  }

  return {
    event_id: eventId,
    object_type: objectType,
    metric,
    timestamp,
    data:
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : undefined,
  };
}

export function buildCustomerIoReportingRecord(
  payload: CustomerIoReportingPayload,
  hashingSecret = process.env.CUSTOMERIO_WEBHOOK_SIGNING_KEY,
): CustomerIoReportingRecord {
  if (!hashingSecret) {
    throw new Error('CUSTOMERIO_WEBHOOK_SIGNING_KEY is required');
  }

  const data = payload.data ?? {};
  const identifiers =
    data.identifiers && typeof data.identifiers === 'object'
      ? (data.identifiers as Record<string, unknown>)
      : {};
  const subject =
    identifiers.id ?? identifiers.cio_id ?? data.customer_id ?? null;

  return {
    event_id: payload.event_id,
    object_type: payload.object_type.slice(0, 64),
    metric: payload.metric.slice(0, 64),
    occurred_at: new Date(payload.timestamp * 1000).toISOString(),
    delivery_id_hash: hashReference(data.delivery_id, hashingSecret),
    subject_id_hash: hashReference(subject, hashingSecret),
    campaign_id: stringValue(data.campaign_id)?.slice(0, 128) ?? null,
    action_id: stringValue(data.action_id)?.slice(0, 128) ?? null,
    metadata: {
      has_failure: Boolean(stringValue(data.failure_message)),
      has_trigger_event: Boolean(stringValue(data.trigger_event_id)),
      has_journey: Boolean(stringValue(data.journey_id)),
    },
  };
}

export async function recordCustomerIoReportingEvent(
  record: CustomerIoReportingRecord,
): Promise<CustomerIoReportingResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('customerio_reporting_events')
    .upsert(record, { onConflict: 'event_id', ignoreDuplicates: true })
    .select('event_id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to record Customer.io reporting event: ${error.message}`);
  }

  return {
    accepted: true,
    duplicate: !data,
    eventId: record.event_id,
  };
}
