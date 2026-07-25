import { describe, expect, it } from 'vitest';
import {
  integrationEventEnvelopeSchema,
  type IntegrationEventEnvelope,
} from './event-envelope';
import { evaluateIntegrationPolicy } from './policy';

const validEvent: IntegrationEventEnvelope = {
  version: 1,
  eventId: 'evt_12345678',
  correlationId: 'corr_123',
  tenantId: 'tenant_sahara',
  provider: 'customerio',
  eventType: 'member.lifecycle',
  subject: { type: 'member', ref: 'member_hash_123' },
  consentState: 'marketing_opted_in',
  provenance: {
    source: 'onboard',
    observedAt: '2026-07-24T20:00:00.000Z',
    evidenceRefs: ['linear:AI-13316'],
  },
  classification: 'internal',
  occurredAt: '2026-07-24T20:00:00.000Z',
  payload: { lifecycle_stage: 'onboarding' },
};

describe('integration event envelope', () => {
  it('accepts a versioned, attributable, tenant-scoped event', () => {
    expect(integrationEventEnvelopeSchema.parse(validEvent)).toEqual(validEvent);
  });

  it.each(['tenantId', 'correlationId', 'provenance'])(
    'rejects missing %s',
    (field) => {
      const invalid = { ...validEvent } as Record<string, unknown>;
      delete invalid[field];
      expect(() => integrationEventEnvelopeSchema.parse(invalid)).toThrow();
    },
  );

  it.each(['api_key', 'access_token', 'email', 'phone', 'recipient'])(
    'rejects sensitive payload field %s',
    (field) => {
      expect(() =>
        integrationEventEnvelopeSchema.parse({
          ...validEvent,
          payload: { nested: { [field]: 'forbidden' } },
        }),
      ).toThrow(/Sensitive fields/);
    },
  );
});

describe('integration policy', () => {
  it('denies cross-tenant access', () => {
    expect(
      evaluateIntegrationPolicy(validEvent, {
        actorTenantId: 'other_tenant',
        purpose: 'product',
        action: 'read',
        capabilities: [],
      }),
    ).toEqual({ outcome: 'deny', reason: 'cross_tenant_access' });
  });

  it('denies marketing without explicit opt-in', () => {
    expect(
      evaluateIntegrationPolicy(
        { ...validEvent, consentState: 'unknown' },
        {
          actorTenantId: validEvent.tenantId,
          purpose: 'marketing_message',
          action: 'send',
          capabilities: ['send:customerio'],
        },
      ),
    ).toEqual({ outcome: 'deny', reason: 'marketing_consent_missing' });
  });

  it('requires human approval for production, activation, and restricted data', () => {
    expect(
      evaluateIntegrationPolicy(validEvent, {
        actorTenantId: validEvent.tenantId,
        purpose: 'product',
        action: 'activate_workflow',
        capabilities: [],
      }).outcome,
    ).toBe('human_approval');
    expect(
      evaluateIntegrationPolicy(
        { ...validEvent, classification: 'restricted' },
        {
          actorTenantId: validEvent.tenantId,
          purpose: 'support',
          action: 'read',
          capabilities: [],
        },
      ).outcome,
    ).toBe('human_approval');
  });

  it('quarantines unowned sends and allows safe owned actions', () => {
    expect(
      evaluateIntegrationPolicy(validEvent, {
        actorTenantId: validEvent.tenantId,
        purpose: 'marketing_message',
        action: 'send',
        capabilities: [],
      }).outcome,
    ).toBe('quarantine');
    expect(
      evaluateIntegrationPolicy(validEvent, {
        actorTenantId: validEvent.tenantId,
        purpose: 'marketing_message',
        action: 'send',
        capabilities: ['send:customerio'],
      }).outcome,
    ).toBe('allow');
  });
});
