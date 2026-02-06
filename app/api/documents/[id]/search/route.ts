/**
 * Document Search API
 * Phase 03: Pro Tier Features
 *
 * POST /api/documents/[id]/search - Search within a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, searchSimilarChunks, searchChunksByText } from '@/lib/db/documents';
import { generateEmbedding } from '@/lib/documents/embeddings';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check tier requirement
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user!.id;

    // Verify document exists and belongs to user
    const document = await getDocumentById(userId, id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.status !== 'ready') {
      return NextResponse.json(
        { error: 'Document is still processing' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, limit = 5, useVector = true } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    let results;

    if (useVector) {
      // Vector similarity search
      const embedding = await generateEmbedding(query);
      results = await searchSimilarChunks(userId, embedding, {
        limit,
        documentId: id,
      });
    } else {
      // Full-text search fallback
      results = await searchChunksByText(userId, query, {
        limit,
        documentId: id,
      });
    }

    return NextResponse.json({
      success: true,
      query,
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        pageNumber: r.pageNumber,
        section: r.section,
        similarity: 'similarity' in r ? r.similarity : undefined,
      })),
    });
  } catch (error) {
    console.error('[DocumentSearch] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search document' },
      { status: 500 }
    );
  }
}
