/**
 * Uploaded Documents List API
 * Phase 03: Pro Tier Features
 *
 * GET /api/documents/uploaded - List user's uploaded PDFs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocuments } from '@/lib/db/documents';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import type { DocumentType, DocumentStatus } from '@/lib/documents/types';

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as DocumentType | null;
    const status = searchParams.get('status') as DocumentStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get documents
    const documents = await getDocuments(userId, {
      type: type || undefined,
      status: status || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        fileSize: doc.fileSize,
        pageCount: doc.pageCount,
        status: doc.status,
        errorMessage: doc.errorMessage,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[UploadedDocuments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}
