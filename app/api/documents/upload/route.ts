/**
 * Document Upload API
 * Phase 03: Pro Tier Features
 *
 * POST /api/documents/upload
 * Handles PDF document uploads for Pro/Studio tier users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createDocument } from '@/lib/db/documents';
import { processDocument } from '@/lib/documents/process-document';
import { isValidPdf } from '@/lib/documents/pdf-processor';
import { checkTierForRequest, getUserTier } from '@/lib/api/tier-middleware';
import { requireAuth } from '@/lib/auth';
import { UserTier } from '@/lib/constants';
import { checkRateLimit, createRateLimitResponse } from '@/lib/api/rate-limit';

// Upload rate limits per tier (per day)
const UPLOAD_RATE_LIMITS: Record<number, { limit: number; windowSeconds: number }> = {
  [UserTier.FREE]: { limit: 20, windowSeconds: 86400 },
  [UserTier.PRO]: { limit: 100, windowSeconds: 86400 },
  [UserTier.STUDIO]: { limit: 500, windowSeconds: 86400 },
};
import type { DocumentType } from '@/lib/documents/types';
import { clientEnv, serverEnv } from '@/lib/env';

// Lazy Supabase client (avoids module-level init during static generation)
function getSupabase() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export async function POST(request: NextRequest) {
  try {
    // Early auth gate - ensures 401 even if tier check throws
    await requireAuth();

    // Check tier requirement (Pro or Studio tier required)
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required for document uploads' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Rate limit uploads by user tier
    const userTier = await getUserTier(userId);
    const tierConfig = UPLOAD_RATE_LIMITS[userTier] ?? UPLOAD_RATE_LIMITS[UserTier.FREE];
    const rateLimitResult = await checkRateLimit(`upload:${userId}`, tierConfig);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('type') as DocumentType) || 'other';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate PDF structure
    if (!isValidPdf(buffer)) {
      return NextResponse.json(
        { error: 'Invalid PDF file' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
    const storagePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabase().storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[DocumentUpload] Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = getSupabase().storage
      .from('documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // Create document record
    const document = await createDocument(userId, {
      name: file.name,
      type: documentType,
      fileUrl,
      fileSize: file.size,
    });

    // Process document asynchronously
    // In production, this would be a background job
    processDocument(document.id, fileUrl, documentType).catch(err => {
      console.error('[DocumentUpload] Processing error:', err);
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        status: document.status,
        fileSize: document.fileSize,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('[DocumentUpload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
