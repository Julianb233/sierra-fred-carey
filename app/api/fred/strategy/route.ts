/**
 * Strategy Document API
 * Phase 03: Pro Tier Features
 *
 * POST /api/fred/strategy - Generate a new strategy document
 * GET /api/fred/strategy - List user's strategy documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import {
  generateDocument,
  saveStrategyDocument,
  getStrategyDocuments,
  STRATEGY_DOC_TYPES,
  type StrategyInput,
  type StrategyDocType,
} from '@/lib/fred/strategy';

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
        { error: 'Pro tier required for Strategy Documents' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Parse request body
    const body = await request.json();
    const { type, startupName, industry, stage, description, additionalContext } = body;

    // Validate required fields
    if (!type || !STRATEGY_DOC_TYPES.includes(type as StrategyDocType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${STRATEGY_DOC_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!startupName || typeof startupName !== 'string' || startupName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Startup name is required' },
        { status: 400 }
      );
    }

    // Build strategy input
    const input: StrategyInput = {
      type: type as StrategyDocType,
      startupName: startupName.trim(),
      industry: industry || undefined,
      stage: stage || undefined,
      description: description || undefined,
      additionalContext: additionalContext || undefined,
    };

    // Generate the document
    const document = await generateDocument(input);

    // Save to database
    const supabase = await createClient();
    const savedDoc = await saveStrategyDocument(supabase, userId, document);

    return NextResponse.json({
      success: true,
      document: savedDoc,
    });
  } catch (error) {
    console.error('[Strategy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate strategy document' },
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
    const type = searchParams.get('type') as StrategyDocType | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch documents
    const supabase = await createClient();
    const documents = await getStrategyDocuments(supabase, userId, {
      type: type && STRATEGY_DOC_TYPES.includes(type) ? type : undefined,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('[Strategy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get strategy documents' },
      { status: 500 }
    );
  }
}
