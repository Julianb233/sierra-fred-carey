/**
 * Strategy Document CRUD API
 * Phase 03: Pro Tier Features
 *
 * GET /api/fred/strategy/[id] - Get a specific document
 * PUT /api/fred/strategy/[id] - Update a document
 * DELETE /api/fred/strategy/[id] - Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import {
  getStrategyDocumentById,
  updateStrategyDocument,
  deleteStrategyDocument,
} from '@/lib/fred/strategy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;

    const document = await getStrategyDocumentById(userId, id);
    if (!document) {
      return NextResponse.json(
        { error: 'Strategy document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('[Strategy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get strategy document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;

    const body = await request.json();
    const { content, title, sections } = body;

    const updated = await updateStrategyDocument(userId, id, {
      content,
      title,
      sections,
    });

    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: 'Strategy document not found' },
        { status: 404 }
      );
    }

    console.error('[Strategy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update strategy document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;

    await deleteStrategyDocument(userId, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Strategy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy document' },
      { status: 500 }
    );
  }
}
