import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: dbMocks.from }),
}));

import {
  buildCustomerIoReportingRecord,
  isActionableCustomerIoMetric,
  parseCustomerIoReportingPayload,
  recordCustomerIoReportingEvent,
  verifyCustomerIoReportingSignature,
} from './reporting-webhook';

const secret = 'test-signing-secret';
const rawBody = JSON.stringify({
  event_id: 'evt_01',
  object_type: 'email',
  metric: 'bounced',
  timestamp: 1720000000,
  data: {
    identifiers: {
      id: 'canonical-user-id',
      email: 'member@example.com',
    },
    delivery_id: 'delivery_01',
    recipient: 'member@example.com',
    content: 'must not be retained',
    failure_message: 'mailbox unavailable',
    campaign_id: 123,
    action_id: 456,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.from.mockReturnValue({ upsert: dbMocks.upsert });
  dbMocks.upsert.mockReturnValue({ select: dbMocks.select });
  dbMocks.select.mockReturnValue({ maybeSingle: dbMocks.maybeSingle });
});

describe('Customer.io reporting signature', () => {
  it('verifies the official v0 timestamp raw-body HMAC contract', () => {
    const timestamp = '1720000001';
    const signature = createHmac('sha256', secret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest('hex');
    expect(
      verifyCustomerIoReportingSignature(rawBody, timestamp, signature, secret)
    ).toBe(true);
  });

  it('fails closed for invalid, malformed, or missing signatures', () => {
    expect(
      verifyCustomerIoReportingSignature(rawBody, '1720000001', '0'.repeat(64), secret)
    ).toBe(false);
    expect(
      verifyCustomerIoReportingSignature(rawBody, 'not-a-time', 'x', secret)
    ).toBe(false);
    expect(verifyCustomerIoReportingSignature(rawBody, null, null, secret)).toBe(
      false
    );
  });
});

describe('Customer.io reporting payload', () => {
  it('rejects malformed reporting events', () => {
    expect(parseCustomerIoReportingPayload({ metric: 'sent' })).toBeNull();
    expect(parseCustomerIoReportingPayload('invalid')).toBeNull();
  });

  it('stores only correlation-safe metadata and hashes identifiers', () => {
    const payload = parseCustomerIoReportingPayload(JSON.parse(rawBody));
    expect(payload).not.toBeNull();
    const record = buildCustomerIoReportingRecord(payload!, secret);

    expect(record).toMatchObject({
      event_id: 'evt_01',
      object_type: 'email',
      metric: 'bounced',
      campaign_id: '123',
      action_id: '456',
      metadata: {
        has_failure: true,
        has_trigger_event: false,
        has_journey: false,
      },
    });
    expect(record.subject_id_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.delivery_id_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(record)).not.toContain('member@example.com');
    expect(JSON.stringify(record)).not.toContain('must not be retained');
    expect(JSON.stringify(record)).not.toContain('mailbox unavailable');
    expect(JSON.stringify(record)).not.toContain('canonical-user-id');
    expect(JSON.stringify(record)).not.toContain('delivery_01');
  });

  it.each([
    ['delivered', false],
    ['bounced', true],
    ['complained', true],
    ['failed', true],
    ['undeliverable', true],
    ['unsubscribed', false],
  ])('classifies %s for the Sentry review lane', (metric, actionable) => {
    expect(isActionableCustomerIoMetric(metric)).toBe(actionable);
  });

  it.each(['delivered', 'bounced', 'complained', 'unsubscribed', 'failed'])(
    'redacts the %s reporting fixture',
    (metric) => {
      const fixture = {
        event_id: `evt_${metric}`,
        object_type: 'email',
        metric,
        timestamp: 1720000000,
        data: {
          identifiers: {
            id: 'canonical-user-id',
            email: 'member@example.com',
          },
          recipient: 'member@example.com',
          content: 'must not be retained',
          failure_message: metric === 'failed' ? 'provider detail' : undefined,
          campaign_id: 123,
          action_id: 456,
        },
      };
      const parsed = parseCustomerIoReportingPayload(fixture);
      expect(parsed).not.toBeNull();
      const record = buildCustomerIoReportingRecord(parsed!, secret);
      const serialized = JSON.stringify(record);
      expect(record.metric).toBe(metric);
      expect(serialized).not.toContain('member@example.com');
      expect(serialized).not.toContain('must not be retained');
      expect(serialized).not.toContain('provider detail');
      expect(serialized).not.toContain('canonical-user-id');
    }
  );

  it('acknowledges provider retries as duplicates by event_id', async () => {
    const record = buildCustomerIoReportingRecord(
      parseCustomerIoReportingPayload(JSON.parse(rawBody))!,
      secret
    );
    dbMocks.maybeSingle
      .mockResolvedValueOnce({ data: { event_id: 'evt_01' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(recordCustomerIoReportingEvent(record)).resolves.toEqual({
      accepted: true,
      duplicate: false,
      eventId: 'evt_01',
    });
    await expect(recordCustomerIoReportingEvent(record)).resolves.toEqual({
      accepted: true,
      duplicate: true,
      eventId: 'evt_01',
    });
    expect(dbMocks.upsert).toHaveBeenCalledWith(record, {
      onConflict: 'event_id',
      ignoreDuplicates: true,
    });
  });
});
