/**
 * Strategy Document PDF Export API
 * Phase 03: Pro Tier Features
 *
 * GET /api/fred/strategy/[id]/export - Download document as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/server';
import { getStrategyDocumentById } from '@/lib/fred/strategy';
import { exportToPDF } from '@/lib/documents/export';

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

    const supabase = createServiceClient();
    const doc = await getStrategyDocumentById(supabase, userId, id);
    if (!doc) {
      return NextResponse.json(
        { error: 'Strategy document not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await exportToPDF({
      title: doc.title,
      content: doc.content,
      sections: doc.sections,
    });

    // Build safe filename
    const safeTitle = doc.title
      .replace(/[^a-zA-Z0-9\-_ ]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Strategy Export API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export strategy document' },
      { status: 500 }
    );
  }
}
