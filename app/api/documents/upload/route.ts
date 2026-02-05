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
import { checkTierForRequest } from '@/lib/api/tier-middleware';
import { UserTier } from '@/lib/constants';
import type { DocumentType } from '@/lib/documents/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export async function POST(request: NextRequest) {
  try {
    // Check tier requirement (Pro or Studio tier required)
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: 'Pro tier required for document uploads' },
        { status: 403 }
      );
    }

    const userId = tierCheck.user!.id;

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
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: urlData } = supabase.storage
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
    console.error('[DocumentUpload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
