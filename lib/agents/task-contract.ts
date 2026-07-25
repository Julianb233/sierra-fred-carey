import { z } from 'zod';

const SENSITIVE_FIELD =
  /(?:^|_)(?:api_?key|authorization|cookie|credential|password|private_?key|secret|token|email|phone|recipient|card|bank|ssn)(?:$|_)/i;

function containsSensitiveField(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsSensitiveField);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) => SENSITIVE_FIELD.test(key) || containsSensitiveField(child),
  );
}

const safeRecord = z
  .record(z.string(), z.unknown())
  .superRefine((value, ctx) => {
    if (containsSensitiveField(value)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Credentials and direct contact/payment identifiers are not allowed',
      });
    }
  });

export const agentBlockerSchema = z
  .object({
    code: z.string().min(1).max(100),
    kind: z.enum([
      'permission',
      'credential',
      'external_service',
      'missing_source',
      'human_decision',
      'validation',
    ]),
    message: z.string().min(1).max(2000),
    retryable: z.boolean(),
    evidenceRefs: z.array(z.string().min(1).max(500)).max(20).default([]),
  })
  .strict();

export const agentHandoffSchema = z
  .object({
    fromAgent: z.enum(['founder_ops', 'fundraising', 'growth']),
    toAgent: z.enum(['founder_ops', 'fundraising', 'growth']),
    reason: z.string().min(1).max(1000),
    capabilityRequired: z.string().min(1).max(200),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const verifierOutcomeSchema = z
  .object({
    status: z.enum(['pending', 'passed', 'failed', 'blocked']),
    verifier: z.string().min(1).max(200),
    checkedAt: z.iso.datetime().nullable(),
    summary: z.string().max(2000),
    evidenceRefs: z.array(z.string().min(1).max(500)).max(50).default([]),
  })
  .strict();

export const agentTaskCreateSchema = z
  .object({
    agentType: z.enum(['founder_ops', 'fundraising', 'growth']),
    taskType: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    input: safeRecord.default({}),
    correlationId: z.string().min(1).max(200),
    runId: z.string().min(1).max(200),
    capabilitiesRequired: z.array(z.string().min(1).max(200)).max(50).default([]),
  })
  .strict();

export type AgentBlocker = z.infer<typeof agentBlockerSchema>;
export type AgentHandoff = z.infer<typeof agentHandoffSchema>;
export type VerifierOutcome = z.infer<typeof verifierOutcomeSchema>;
export type AgentTaskCreate = z.infer<typeof agentTaskCreateSchema>;

export function assertSafeAgentEvidence(value: unknown): void {
  safeRecord.parse(value);
}
