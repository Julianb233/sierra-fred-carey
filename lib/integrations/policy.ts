import type { IntegrationEventEnvelope } from './event-envelope';

export type PolicyOutcome = 'allow' | 'deny' | 'quarantine' | 'human_approval';

export interface IntegrationPolicyRequest {
  actorTenantId: string;
  purpose: 'product' | 'transactional_message' | 'marketing_message' | 'support';
  action:
    | 'read'
    | 'write'
    | 'send'
    | 'activate_workflow'
    | 'production_change'
    | 'financial_change';
  capabilities: string[];
}

export interface IntegrationPolicyDecision {
  outcome: PolicyOutcome;
  reason: string;
}

export function evaluateIntegrationPolicy(
  event: IntegrationEventEnvelope,
  request: IntegrationPolicyRequest,
): IntegrationPolicyDecision {
  if (event.tenantId !== request.actorTenantId) {
    return { outcome: 'deny', reason: 'cross_tenant_access' };
  }

  if (event.classification === 'restricted') {
    return { outcome: 'human_approval', reason: 'restricted_data' };
  }

  if (
    request.action === 'production_change' ||
    request.action === 'financial_change' ||
    request.action === 'activate_workflow'
  ) {
    return { outcome: 'human_approval', reason: 'high_risk_action' };
  }

  if (
    request.purpose === 'marketing_message' &&
    event.consentState !== 'marketing_opted_in'
  ) {
    return { outcome: 'deny', reason: 'marketing_consent_missing' };
  }

  if (
    request.action === 'send' &&
    !request.capabilities.includes(`send:${event.provider}`)
  ) {
    return { outcome: 'quarantine', reason: 'capability_missing' };
  }

  return { outcome: 'allow', reason: 'policy_satisfied' };
}
