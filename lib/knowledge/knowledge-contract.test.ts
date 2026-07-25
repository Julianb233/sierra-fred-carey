import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
  searchEpisodesByEmbedding: vi.fn(),
}));

vi.mock('@/lib/ai/fred-client', () => ({
  generateEmbedding: mocks.generateEmbedding,
}));
vi.mock('@/lib/db/fred-memory', () => ({
  searchEpisodesByEmbedding: mocks.searchEpisodesByEmbedding,
}));

import { redactKnowledgeText, retrieveScopedKnowledge } from './broker';
import {
  evaluateKnowledgePromotion,
  hashKnowledgeContent,
} from './promotion';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generateEmbedding.mockResolvedValue({ embedding: [0.1, 0.2] });
  mocks.searchEpisodesByEmbedding.mockResolvedValue([
    {
      id: 'memory_1',
      content: {
        content: 'Contact founder@example.com or +1 (555) 555-0123. token_abcdefghijkl',
      },
      createdAt: new Date('2026-07-23T20:00:00.000Z'),
      similarity: 0.91,
    },
  ]);
});

describe('scoped knowledge broker', () => {
  it('denies cross-tenant retrieval before embedding or database access', async () => {
    await expect(
      retrieveScopedKnowledge({
        tenantId: 'tenant_a',
        actorTenantId: 'tenant_b',
        purpose: 'agent_context',
        query: 'fundraising',
      }),
    ).rejects.toThrow(/Cross-tenant/);
    expect(mocks.generateEmbedding).not.toHaveBeenCalled();
  });

  it('returns attributable, fresh, redacted evidence for the owning tenant', async () => {
    const results = await retrieveScopedKnowledge({
      tenantId: 'tenant_a',
      actorTenantId: 'tenant_a',
      purpose: 'verification',
      query: 'fundraising',
    });
    expect(results[0]).toMatchObject({
      memoryId: 'memory_1',
      confidence: 0.91,
      provenance: 'fred_episodic_memory:memory_1',
      classification: 'confidential',
    });
    expect(results[0].summary).toContain('[redacted-email]');
    expect(results[0].summary).toContain('[redacted-phone]');
    expect(results[0].summary).toContain('[redacted-secret]');
    expect(results[0].summary).not.toContain('founder@example.com');
  });

  it('redacts direct identifiers without mutating unrelated content', () => {
    expect(redactKnowledgeText('Stage is seed.')).toBe('Stage is seed.');
  });
});

describe('knowledge promotion policy', () => {
  const candidate = {
    tenantId: 'tenant_a',
    actorTenantId: 'tenant_a',
    content: { stage: 'seed', market: 'B2B SaaS' },
    classification: 'confidential' as const,
    confidence: 0.92,
    evidenceRefs: ['memory:memory_1'],
    risk: 'low' as const,
  };

  it('allows evidence-backed, deduplicated, tenant-owned knowledge', () => {
    expect(evaluateKnowledgePromotion(candidate).outcome).toBe('allow');
  });

  it('denies duplicates, cross-tenant writes, and sensitive content', () => {
    const hash = hashKnowledgeContent(candidate.content);
    expect(
      evaluateKnowledgePromotion(candidate, new Set([hash])).reason,
    ).toBe('duplicate');
    expect(
      evaluateKnowledgePromotion({
        ...candidate,
        actorTenantId: 'tenant_b',
      }).reason,
    ).toBe('cross_tenant_access');
    expect(
      evaluateKnowledgePromotion({
        ...candidate,
        content: { api_key: 'forbidden' },
      }).reason,
    ).toBe('sensitive_content');
  });

  it('quarantines weak evidence and routes high-risk knowledge for approval', () => {
    expect(
      evaluateKnowledgePromotion({
        ...candidate,
        confidence: 0.5,
        evidenceRefs: [],
      }).outcome,
    ).toBe('quarantine');
    expect(
      evaluateKnowledgePromotion({
        ...candidate,
        risk: 'high',
      }).outcome,
    ).toBe('human_approval');
  });
});
