import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { uploadToBlob, FileValidationError } from '@/lib/storage/upload';
import { requireAuth } from '@/lib/auth';
import { UserTier } from '@/lib/constants';
import { getUserTier, createTierErrorResponse } from '@/lib/api/tier-middleware';
import { checkRateLimit, createRateLimitResponse } from '@/lib/api/rate-limit';
import {
  CUSTOMERIO_EVENTS,
  LIFECYCLE_CONSENT,
  trackCanonicalLifecycleEvent,
} from '@/lib/customerio';

// Upload rate limits per tier (per day)
const UPLOAD_RATE_LIMITS: Record<number, { limit: number; windowSeconds: number }> = {
  [UserTier.FREE]: { limit: 20, windowSeconds: 86400 },
  [UserTier.PRO]: { limit: 100, windowSeconds: 86400 },
  [UserTier.STUDIO]: { limit: 500, windowSeconds: 86400 },
};

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

    // Rate limit uploads by user tier
    const userTier = await getUserTier(userId);
    const tierConfig = UPLOAD_RATE_LIMITS[userTier] ?? UPLOAD_RATE_LIMITS[UserTier.FREE];
    const rateLimitResult = await checkRateLimit(`upload:${userId}`, tierConfig);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult) as NextResponse<UploadResponse>;
    }

    // SECURITY: Require Pro tier for pitch deck uploads
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
    const uploadRef = createHash('sha256').update(result.url).digest('hex').slice(0, 24);

    // Product event only; Customer.io journeys remain paused while the
    // existing product/email channels stay authoritative.
    await trackCanonicalLifecycleEvent(
      userId,
      CUSTOMERIO_EVENTS.DECK_SUBMITTED,
      {
        source: 'pitch_deck_upload',
        correlationId: uploadRef,
        consent: LIFECYCLE_CONSENT.UNKNOWN,
      },
      {
        file_type: result.type,
        file_size: result.size,
      },
      `deck_submitted:${userId}:${uploadRef}`,
    );

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
    console.error('[PitchDeckUpload] Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during upload',
      },
      { status: 500 }
    );
  }
}
