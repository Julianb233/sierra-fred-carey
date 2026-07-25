import { describe, expect, it } from 'vitest';
import {
  agentBlockerSchema,
  agentHandoffSchema,
  agentTaskCreateSchema,
  assertSafeAgentEvidence,
  verifierOutcomeSchema,
} from './task-contract';

describe('agent task contract', () => {
  const task = {
    agentType: 'growth' as const,
    taskType: 'customerio.audit',
    description: 'Audit paused lifecycle journeys',
    input: { workspace_ref: 'workspace_226236' },
    correlationId: 'corr_123',
    runId: 'run_123',
    capabilitiesRequired: ['customerio:read'],
  };

  it('accepts a typed, attributable task and remains backward-friendly', () => {
    expect(agentTaskCreateSchema.parse(task)).toMatchObject(task);
    expect(
      agentTaskCreateSchema.parse({
        ...task,
        input: undefined,
        capabilitiesRequired: undefined,
      }),
    ).toMatchObject({ input: {}, capabilitiesRequired: [] });
  });

  it.each(['api_key', 'token', 'password', 'email', 'phone', 'card'])(
    'rejects secret or direct identifier field %s',
    (field) => {
      expect(() =>
        agentTaskCreateSchema.parse({
          ...task,
          input: { nested: { [field]: 'forbidden' } },
        }),
      ).toThrow();
    },
  );

  it('validates blockers, handoffs, verifier outcomes, and redacted evidence', () => {
    expect(
      agentBlockerSchema.parse({
        code: 'ROLE_REQUIRED',
        kind: 'permission',
        message: 'Location admin role is required',
        retryable: true,
        evidenceRefs: ['linear:AI-13548'],
      }).kind,
    ).toBe('permission');
    expect(
      agentHandoffSchema.parse({
        fromAgent: 'growth',
        toAgent: 'founder_ops',
        reason: 'Owner decision required',
        capabilityRequired: 'approval:workflow_activation',
        createdAt: '2026-07-24T20:00:00.000Z',
      }).toAgent,
    ).toBe('founder_ops');
    expect(
      verifierOutcomeSchema.parse({
        status: 'passed',
        verifier: 'customerio-canary',
        checkedAt: '2026-07-24T20:05:00.000Z',
        summary: 'One event, one redacted evidence row',
        evidenceRefs: ['event:evt_01'],
      }).status,
    ).toBe('passed');
    expect(() => assertSafeAgentEvidence({ token: 'secret' })).toThrow();
    expect(() =>
      assertSafeAgentEvidence({ artifact: 'linear:AI-13316', status: 200 }),
    ).not.toThrow();
  });
});
