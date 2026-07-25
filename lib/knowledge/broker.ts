import { generateEmbedding } from '@/lib/ai/fred-client';
import { searchEpisodesByEmbedding } from '@/lib/db/fred-memory';

export interface KnowledgeRequest {
  tenantId: string;
  actorTenantId: string;
  purpose: 'agent_context' | 'support' | 'verification';
  query: string;
  limit?: number;
}

export interface KnowledgeEvidence {
  memoryId: string;
  summary: string;
  occurredAt: string;
  provenance: string;
  freshnessDays: number;
  confidence: number;
  classification: 'confidential';
}

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:\+?\d[\d().\s-]{8,}\d)/g;
const SECRET =
  /\b(?:sk|pk|rk|key|token|secret)[-_][A-Za-z0-9_-]{12,}\b/gi;

export function redactKnowledgeText(text: string): string {
  return text
    .replace(EMAIL, '[redacted-email]')
    .replace(PHONE, '[redacted-phone]')
    .replace(SECRET, '[redacted-secret]');
}

export async function retrieveScopedKnowledge(
  request: KnowledgeRequest,
): Promise<KnowledgeEvidence[]> {
  if (request.actorTenantId !== request.tenantId) {
    throw new Error('Cross-tenant knowledge access denied');
  }
  if (!request.query.trim()) return [];

  const embedding = await generateEmbedding(request.query);
  const episodes = await searchEpisodesByEmbedding(
    request.tenantId,
    embedding.embedding,
    {
      limit: Math.min(Math.max(request.limit ?? 5, 1), 10),
      similarityThreshold: 0.65,
    },
  );

  const now = Date.now();
  return episodes.map((episode) => {
    const raw =
      typeof episode.content.content === 'string'
        ? episode.content.content
        : JSON.stringify(episode.content);
    return {
      memoryId: episode.id,
      summary: redactKnowledgeText(raw),
      occurredAt: episode.createdAt.toISOString(),
      provenance: `fred_episodic_memory:${episode.id}`,
      freshnessDays: Math.max(
        0,
        Math.floor((now - episode.createdAt.getTime()) / 86_400_000),
      ),
      confidence: Math.max(0, Math.min(1, episode.similarity)),
      classification: 'confidential' as const,
    };
  });
}
