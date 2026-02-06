import { NextRequest, NextResponse } from 'next/server';
import { uploadToBlob, FileValidationError } from '@/lib/storage/upload';
import { requireAuth } from '@/lib/auth';
import { UserTier } from '@/lib/constants';
import { getUserTier, createTierErrorResponse } from '@/lib/api/tier-middleware';

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Success response structure
 */
interface SuccessResponse {
  success: true;
  file: {
    url: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
  };
}

type UploadResponse = SuccessResponse | ErrorResponse;

/**
 * POST /api/pitch-deck/upload
 * Upload pitch deck file (PDF or PPTX) to Vercel Blob storage
 *
 * SECURITY: Requires authentication - userId from server-side session
 *
 * @param request - Multipart form data with file
 * @returns Upload result with blob URL and metadata
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    // SECURITY: Require Pro tier for pitch deck uploads
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      }) as NextResponse<UploadResponse>;
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
          details: 'Request must include a file in the "file" field',
        },
        { status: 400 }
      );
    }

    // Upload to Blob storage (includes validation)
    const result = await uploadToBlob(file, userId);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        file: result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle validation errors (400 Bad Request)
    if (error instanceof FileValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Return auth errors directly
    if (error instanceof Response) return error as NextResponse<UploadResponse>;

    // Handle all other errors (500 Internal Server Error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error('File upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/pitch-deck/upload
 * CORS preflight handler
 */
export async function OPTIONS(): Promise<NextResponse> {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
