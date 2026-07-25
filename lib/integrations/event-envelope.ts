import { z } from 'zod';

const SENSITIVE_KEY =
  /(?:^|_)(?:api_?key|authorization|cookie|credential|password|private_?key|secret|token|email|phone|recipient|card|bank|ssn)(?:$|_)/i;

export const INTEGRATION_PROVIDERS = [
  'sahara',
  'customerio',
  'gohighlevel',
  'stripe',
  'sentry',
  'linear',
  'agent',
] as const;

export const DATA_CLASSIFICATIONS = [
  'public',
  'internal',
  'confidential',
  'restricted',
] as const;

export const CONSENT_STATES = [
  'transactional',
  'marketing_opted_in',
  'marketing_opted_out',
  'unknown',
] as const;

function findSensitivePath(value: unknown, path = 'payload'): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSensitivePath(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (SENSITIVE_KEY.test(key)) return childPath;
    const found = findSensitivePath(child, childPath);
    if (found) return found;
  }
  return null;
}

export const integrationEventEnvelopeSchema = z
  .object({
    version: z.literal(1),
    eventId: z.string().min(8).max(200),
    correlationId: z.string().min(1).max(200),
    tenantId: z.string().min(1).max(200),
    provider: z.enum(INTEGRATION_PROVIDERS),
    eventType: z.string().regex(/^[a-z][a-z0-9_.-]{2,127}$/),
    subject: z
      .object({
        type: z.enum(['member', 'lead', 'account', 'task', 'delivery', 'system']),
        ref: z.string().min(1).max(200),
      })
      .strict(),
    consentState: z.enum(CONSENT_STATES),
    provenance: z
      .object({
        source: z.string().min(1).max(200),
        observedAt: z.iso.datetime(),
        evidenceRefs: z.array(z.string().min(1).max(500)).max(20).default([]),
      })
      .strict(),
    classification: z.enum(DATA_CLASSIFICATIONS),
    occurredAt: z.iso.datetime(),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()
  .superRefine((value, ctx) => {
    const sensitivePath = findSensitivePath(value.payload);
    if (sensitivePath) {
      ctx.addIssue({
        code: 'custom',
        path: ['payload'],
        message: `Sensitive fields are not allowed in integration events (${sensitivePath})`,
      });
    }
  });

export type IntegrationEventEnvelope = z.infer<
  typeof integrationEventEnvelopeSchema
>;

export function parseIntegrationEventEnvelope(
  value: unknown,
): IntegrationEventEnvelope {
  return integrationEventEnvelopeSchema.parse(value);
}
