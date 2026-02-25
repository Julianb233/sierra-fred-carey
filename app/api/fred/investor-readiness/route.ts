/**
 * Investor Readiness Score API
 * Phase 03: Pro Tier Features
 *
 * POST /api/fred/investor-readiness - Calculate new IRS
 * GET /api/fred/investor-readiness - Get IRS history
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import {
  calculateIRS,
  saveIRSResult,
  getIRSHistory,
  getLatestIRS,
  type IRSInput,
} from '@/lib/fred/irs';

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
        { error: 'Pro tier required for Investor Readiness Score' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Parse request body
    const body = await request.json();
    const input: IRSInput = {
      startupInfo: body.startupInfo || {},
      teamInfo: body.teamInfo,
      marketInfo: body.marketInfo,
      productInfo: body.productInfo,
      tractionInfo: body.tractionInfo,
      financialInfo: body.financialInfo,
      pitchInfo: body.pitchInfo,
      documents: body.documents,
    };

    // Validate minimum required info
    if (!input.startupInfo.name && !input.startupInfo.description) {
      return NextResponse.json(
        { error: 'At least startup name or description is required' },
        { status: 400 }
      );
    }

    // Calculate IRS
    const result = await calculateIRS(input);

    // Save to database
    const supabase = await createClient();
    const savedResult = await saveIRSResult(supabase, userId, result);

    // Record journey event for dashboard "Investor Readiness" card
    // Fire-and-forget: don't block the response on this write
    supabase
      .from('journey_events')
      .insert({
        user_id: userId,
        event_type: 'score_improved',
        event_data: {
          source: 'investor_readiness',
          categories: Object.fromEntries(
            Object.entries(savedResult.categories).map(([k, v]) => [k, (v as { score: number }).score])
          ),
        },
        score_after: Math.round(savedResult.overall),
      })
      .then(({ error }) => {
        if (error) console.error('[IRS API] Failed to record journey event:', error.message);
      });

    return NextResponse.json({
      success: true,
      result: savedResult,
    });
  } catch (error) {
    console.error('[IRS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Investor Readiness Score' },
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
    const latest = searchParams.get('latest') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = await createClient();

    if (latest) {
      // Get just the latest score
      const result = await getLatestIRS(supabase, userId);
      return NextResponse.json({
        success: true,
        result,
      });
    }

    // Get history
    const history = await getIRSHistory(supabase, userId, limit);

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('[IRS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get IRS history' },
      { status: 500 }
    );
  }
}
