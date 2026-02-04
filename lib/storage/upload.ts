import { put, del } from '@vercel/blob';

/**
 * Allowed file types for pitch deck uploads
 */
const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
} as const;

type AllowedMimeType = keyof typeof ALLOWED_TYPES;

/**
 * File upload result
 */
export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

/**
 * File validation error
 */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validate file type (PDF or PPTX only)
 */
export function validateFileType(file: File): void {
  const fileType = file.type as AllowedMimeType;

  if (!ALLOWED_TYPES[fileType]) {
    throw new FileValidationError(
      `Invalid file type: ${file.type}. Only PDF and PPTX files are allowed.`
    );
  }

  // Double-check file extension
  const fileName = file.name.toLowerCase();
  const allowedExtensions = ALLOWED_TYPES[fileType];
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    throw new FileValidationError(
      `File extension does not match type. Expected ${allowedExtensions.join(' or ')}`
    );
  }
}

/**
 * Validate file size
 * @param file - File to validate
 * @param maxMB - Maximum size in megabytes
 */
export function validateFileSize(file: File, maxMB: number): void {
  const maxBytes = maxMB * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new FileValidationError(
      `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxMB}MB)`
    );
  }

  if (file.size === 0) {
    throw new FileValidationError('File is empty');
  }
}

/**
 * Upload file to Vercel Blob storage
 * @param file - File to upload
 * @param userId - User ID for file organization
 * @returns Upload result with blob URL and metadata
 */
export async function uploadToBlob(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    // Validate file before upload
    validateFileType(file);
    validateFileSize(file, 20); // 20MB max

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `pitch-decks/${userId}/${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw error;
    }

    // Wrap any other errors
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete file from Vercel Blob storage
 * @param url - Blob URL to delete
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
