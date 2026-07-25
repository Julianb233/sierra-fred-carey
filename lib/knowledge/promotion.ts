import { createHash } from 'crypto';
import type { PolicyOutcome } from '@/lib/integrations/policy';

export interface KnowledgePromotionCandidate {
  tenantId: string;
  actorTenantId: string;
  content: Record<string, unknown>;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  confidence: number;
  evidenceRefs: string[];
  risk: 'low' | 'medium' | 'high';
}

export interface KnowledgePromotionDecision {
  outcome: PolicyOutcome;
  reason: string;
  contentHash: string;
}

const SENSITIVE_KEY =
  /(?:^|_)(?:api_?key|authorization|cookie|credential|password|private_?key|secret|token|email|phone|recipient|card|bank|ssn)(?:$|_)/i;

function hasSensitiveValue(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveValue);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) => SENSITIVE_KEY.test(key) || hasSensitiveValue(child),
  );
}

export function hashKnowledgeContent(content: Record<string, unknown>): string {
  const sorted = Object.keys(content)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = content[key];
      return result;
    }, {});
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function evaluateKnowledgePromotion(
  candidate: KnowledgePromotionCandidate,
  existingHashes: ReadonlySet<string> = new Set(),
): KnowledgePromotionDecision {
  const contentHash = hashKnowledgeContent(candidate.content);

  if (candidate.actorTenantId !== candidate.tenantId) {
    return { outcome: 'deny', reason: 'cross_tenant_access', contentHash };
  }
  if (hasSensitiveValue(candidate.content)) {
    return { outcome: 'deny', reason: 'sensitive_content', contentHash };
  }
  if (existingHashes.has(contentHash)) {
    return { outcome: 'deny', reason: 'duplicate', contentHash };
  }
  if (candidate.evidenceRefs.length === 0 || candidate.confidence < 0.75) {
    return { outcome: 'quarantine', reason: 'insufficient_evidence', contentHash };
  }
  if (candidate.classification === 'restricted' || candidate.risk === 'high') {
    return { outcome: 'human_approval', reason: 'high_risk_knowledge', contentHash };
  }
  return { outcome: 'allow', reason: 'promotion_requirements_met', contentHash };
}
