/**
 * Pitch Deck Review API
 * Phase 03: Pro Tier Features
 *
 * POST /api/fred/pitch-review - Run AI pitch deck review
 * GET /api/fred/pitch-review - Get stored pitch reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import { getDocumentById, getDocumentChunks } from '@/lib/db/documents';
import {
  reviewPitchDeck,
  savePitchReview,
  getPitchReviews,
  getPitchReviewByDocument,
} from '@/lib/fred/pitch';

export async function POST(request: NextRequest) {
  try {
    // Check tier requirement (Pro or Studio)
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required for Pitch Deck Review' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Parse request body
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to user
    const document = await getDocumentById(userId, documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document is still being processed
    if (document.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Document is still being processed. Please wait a moment and try again.',
          code: 'DOCUMENT_PROCESSING',
          documentId,
          status: 'processing',
        },
        { status: 202 }
      );
    }

    if (document.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Document processing failed. Please re-upload the PDF.',
          code: 'DOCUMENT_FAILED',
          documentId,
        },
        { status: 400 }
      );
    }

    // Get page-level chunks from PDF pipeline
    const chunks = await getDocumentChunks(documentId);

    if (!chunks || chunks.length === 0) {
      // Re-check the document status in case it changed during chunk retrieval
      // (race condition: status updated to 'ready' but chunks not yet committed)
      const freshDoc = await getDocumentById(userId, documentId);
      if (freshDoc && freshDoc.status === 'processing') {
        return NextResponse.json(
          {
            error: 'Document is still being processed. Please wait a moment and try again.',
            code: 'DOCUMENT_PROCESSING',
            documentId,
            status: 'processing',
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          error: 'No content found in document. The PDF may still be processing, or it may contain no extractable text. Please wait a moment and retry, or re-upload the PDF.',
          code: 'NO_CHUNKS',
          documentId,
        },
        { status: 400 }
      );
    }

    // Build pages array from chunks, sorted by page number
    const pages = chunks
      .map((c) => ({
        pageNumber: c.pageNumber || c.chunkIndex + 1,
        content: c.content,
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber);

    // Run AI-powered pitch review
    const review = await reviewPitchDeck({ documentId, pages });

    // Save to database
    const savedReview = await savePitchReview(userId, review);

    return NextResponse.json({
      success: true,
      review: savedReview,
    });
  } catch (error) {
    console.error('[PitchReview API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to review pitch deck' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check tier requirement
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
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
    const documentId = searchParams.get('documentId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (documentId) {
      // Get review for a specific document
      const review = await getPitchReviewByDocument(userId, documentId);
      return NextResponse.json({
        success: true,
        review,
      });
    }

    // Get all reviews
    const reviews = await getPitchReviews(userId, limit);

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error('[PitchReview API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get pitch reviews' },
      { status: 500 }
    );
  }
}
