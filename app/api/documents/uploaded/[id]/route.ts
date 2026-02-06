/**
 * Uploaded Document Detail API
 * Phase 03: Pro Tier Features
 *
 * GET /api/documents/uploaded/[id] - Get uploaded document details
 * DELETE /api/documents/uploaded/[id] - Delete uploaded document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, deleteDocument, getDocumentChunks } from '@/lib/db/documents';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check tier requirement (Pro or Studio)
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Get document
    const document = await getDocumentById(userId, id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if chunks requested
    const { searchParams } = new URL(request.url);
    const includeChunks = searchParams.get('chunks') === 'true';

    let chunks = undefined;
    if (includeChunks && document.status === 'ready') {
      chunks = await getDocumentChunks(id);
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize,
        pageCount: document.pageCount,
        status: document.status,
        errorMessage: document.errorMessage,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      chunks: chunks?.map(c => ({
        id: c.id,
        index: c.chunkIndex,
        content: c.content,
        pageNumber: c.pageNumber,
        section: c.section,
      })),
    });
  } catch (error) {
    console.error('[UploadedDocument] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check tier requirement (Pro or Studio)
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Delete document
    await deleteDocument(userId, id);

    return NextResponse.json({
      success: true,
      message: 'Document deleted',
    });
  } catch (error) {
    console.error('[UploadedDocument] Delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Document not found') {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
