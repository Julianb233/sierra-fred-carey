# Pitch Deck Upload API - Implementation Summary

## Overview

RESTful API endpoint for uploading pitch deck files (PDF and PPTX) to Vercel Blob storage with comprehensive validation, error handling, and cookie-based authentication.

## Files Created

### 1. `/lib/storage/upload.ts`
Storage helper functions with file validation:

**Functions:**
- `uploadToBlob(file: File, userId: string)` - Upload file to Vercel Blob storage
- `deleteFromBlob(url: string)` - Delete file from storage
- `validateFileType(file: File)` - Validate PDF/PPTX file type
- `validateFileSize(file: File, maxMB: number)` - Validate file size
- `formatFileSize(bytes: number)` - Format bytes for display
- `getFileExtension(filename: string)` - Extract file extension

**Features:**
- Type-safe with TypeScript interfaces
- Custom `FileValidationError` class for validation errors
- Dual validation (MIME type + file extension)
- Sanitized filenames (special chars → underscores)
- User-organized storage structure: `pitch-decks/{userId}/{timestamp}-{filename}`

### 2. `/app/api/pitch-deck/upload/route.ts`
Next.js App Router API endpoint:

**Methods:**
- `POST` - Upload pitch deck file
- `OPTIONS` - CORS preflight support

**Authentication:**
```typescript
const userId = request.headers.get("x-user-id") ||
               request.cookies.get("userId")?.value ||
               "anonymous";
```

**Validation:**
- Maximum file size: 20MB
- Allowed types: PDF, PPTX only
- File type and extension matching
- Empty file rejection

**Response Format:**
```typescript
// Success (200)
{
  "success": true,
  "file": {
    "url": "https://blob.vercel-storage.com/...",
    "name": "pitch-deck.pdf",
    "size": 1234567,
    "type": "application/pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}

// Error (400/500)
{
  "success": false,
  "error": "File validation failed",
  "details": "File size (25.50MB) exceeds maximum allowed size (20MB)"
}
```

### 3. `/app/api/pitch-deck/upload/README.md`
Comprehensive API documentation including:
- Endpoint specifications
- Request/response formats
- Usage examples (JavaScript, React, cURL)
- Error handling guide
- Security considerations
- Testing instructions

### 4. `/app/api/pitch-deck/upload/__tests__/route.test.ts`
Unit test suite covering:
- File validation (type, size, extension)
- User ID handling (header, cookie, anonymous)
- Response format validation
- Error scenarios
- Helper function tests

## File Storage Structure

```
vercel-blob://pitch-decks/
  ├── user-123/
  │   ├── 1704067200000-pitch-deck.pdf
  │   └── 1704067300000-presentation.pptx
  ├── user-456/
  │   └── 1704067400000-investor-deck.pdf
  └── anonymous/
      └── 1704067500000-demo.pptx
```

## API Endpoint

```
POST /api/pitch-deck/upload
Content-Type: multipart/form-data
X-User-ID: user-123 (optional)

FormData:
  file: [File object]
```

## Allowed File Types

| Type | MIME Type | Extension | Max Size |
|------|-----------|-----------|----------|
| PDF | `application/pdf` | `.pdf` | 20MB |
| PowerPoint | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `.pptx` | 20MB |

## Error Handling

### HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| 200 | Success | File uploaded successfully |
| 400 | Validation Error | Invalid file type, file too large, no file provided |
| 500 | Upload Error | Blob storage failure, network error |

### Error Response Format

All errors follow consistent structure:
```json
{
  "success": false,
  "error": "Brief error type",
  "details": "Detailed error message for debugging"
}
```

## Security Features

1. **Type Validation**: Dual check (MIME type + file extension)
2. **Size Limits**: Enforced 20MB maximum
3. **Filename Sanitization**: Special characters replaced
4. **User Isolation**: Files organized by user ID
5. **Public Access**: Files are publicly accessible via URL
6. **CORS Support**: Configured for cross-origin requests

## Environment Configuration

Add to `.env.local`:

```env
# Vercel Blob Storage
# Automatically configured in Vercel deployments
# For local development, get from: Vercel Dashboard → Storage → Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

**Note:** In Vercel deployments, this is automatically set when Blob storage is enabled in the project settings.

## Usage Examples

### Client-Side Upload (React)

```typescript
'use client';

import { useState } from 'react';

export function PitchDeckUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pitch-deck/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details || data.error);
      }

      setUploadedUrl(data.file.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.pptx"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {uploadedUrl && (
        <div>
          <p>Upload successful!</p>
          <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
            View File
          </a>
        </div>
      )}
    </div>
  );
}
```

### Server-Side Usage

```typescript
import { uploadToBlob, deleteFromBlob } from '@/lib/storage/upload';

// Upload file
async function handleFileUpload(file: File, userId: string) {
  try {
    const result = await uploadToBlob(file, userId);

    // Save to database
    await db.pitchDecks.create({
      userId,
      fileUrl: result.url,
      fileName: result.name,
      fileSize: result.size,
      uploadedAt: new Date(result.uploadedAt),
    });

    return result;
  } catch (error) {
    if (error instanceof FileValidationError) {
      // Handle validation error
      console.error('Validation failed:', error.message);
    }
    throw error;
  }
}

// Delete file
async function deleteFile(fileUrl: string) {
  await deleteFromBlob(fileUrl);
}
```

## Testing

Run unit tests:
```bash
npm test -- upload
```

Manual testing with cURL:
```bash
# Upload PDF
curl -X POST http://localhost:3000/api/pitch-deck/upload \
  -H "X-User-ID: test-user" \
  -F "file=@path/to/pitch-deck.pdf"

# Test invalid file type
curl -X POST http://localhost:3000/api/pitch-deck/upload \
  -F "file=@document.docx"

# Test without user ID (anonymous)
curl -X POST http://localhost:3000/api/pitch-deck/upload \
  -F "file=@pitch-deck.pdf"
```

## Integration with Existing Features

### With Document Storage System
```typescript
// After upload, save metadata to database
const { file } = await uploadPitchDeck(fileObject, userId);

await db.documents.create({
  userId,
  type: 'pitch_deck',
  url: file.url,
  metadata: {
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
    uploadedAt: file.uploadedAt,
  },
});
```

### With Investor Score Analysis
```typescript
// Upload deck, then analyze
const { file } = await uploadPitchDeck(deckFile, userId);

// Trigger analysis on uploaded file
await fetch('/api/investor-score/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileUrl: file.url }),
});
```

## Deployment Checklist

- [ ] Enable Vercel Blob storage in project settings
- [ ] Verify `BLOB_READ_WRITE_TOKEN` is set (auto-configured by Vercel)
- [ ] Test file upload in production
- [ ] Configure CORS if needed for external clients
- [ ] Set up monitoring for upload failures
- [ ] Review storage costs and limits

## Dependencies

Already installed in `package.json`:
- `@vercel/blob@^2.0.0` - Vercel Blob storage SDK
- `next@^16.1.1` - Next.js framework

## Known Limitations

1. **File Size**: Maximum 20MB per file (configurable in code)
2. **File Types**: Only PDF and PPTX (extensible via ALLOWED_TYPES)
3. **Storage**: Uses Vercel Blob (subject to Vercel pricing)
4. **Processing**: No automatic file parsing (add separately if needed)

## Future Enhancements

- [ ] Add file parsing (PDF text extraction, PPTX slide extraction)
- [ ] Implement file preview generation
- [ ] Add virus scanning integration
- [ ] Support batch uploads
- [ ] Add upload progress tracking
- [ ] Implement file versioning
- [ ] Add automatic backup to secondary storage

## Related Documentation

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

## Support

For issues or questions:
1. Check `/app/api/pitch-deck/upload/README.md` for detailed API docs
2. Review error messages in response `details` field
3. Check server logs for detailed error traces
4. Verify Vercel Blob is enabled and configured
