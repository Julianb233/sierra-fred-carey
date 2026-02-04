# Pitch Deck Upload API

## Overview

RESTful API endpoint for uploading pitch deck files (PDF and PPTX) to Vercel Blob storage with validation, authentication, and error handling.

## Endpoint

```
POST /api/pitch-deck/upload
```

## Authentication

Uses cookie-based authentication with fallback options:

1. `x-user-id` header (highest priority)
2. `userId` cookie (fallback)
3. `"anonymous"` (default when no auth available)

## Request

### Headers

```
Content-Type: multipart/form-data
X-User-ID: user-123 (optional)
```

### Body

Multipart form data with a single field:

- `file`: PDF or PPTX file (max 20MB)

### Allowed File Types

| Type | MIME Type | Extension |
|------|-----------|-----------|
| PDF | `application/pdf` | `.pdf` |
| PowerPoint | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `.pptx` |

## Response

### Success (200 OK)

```json
{
  "success": true,
  "file": {
    "url": "https://blob.vercel-storage.com/pitch-decks/user-123/1704067200000-pitch-deck.pdf",
    "name": "pitch-deck.pdf",
    "size": 1234567,
    "type": "application/pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### File Validation Error (400 Bad Request)

```json
{
  "success": false,
  "error": "File validation failed",
  "details": "Invalid file type: application/msword. Only PDF and PPTX files are allowed."
}
```

```json
{
  "success": false,
  "error": "File validation failed",
  "details": "File size (25.50MB) exceeds maximum allowed size (20MB)"
}
```

```json
{
  "success": false,
  "error": "No file provided",
  "details": "Request must include a file in the \"file\" field"
}
```

### Upload Error (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Upload failed",
  "details": "Failed to upload file: Network error"
}
```

## Usage Examples

### JavaScript/TypeScript (Fetch API)

```typescript
async function uploadPitchDeck(file: File, userId?: string) {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-ID'] = userId;
  }

  const response = await fetch('/api/pitch-deck/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error);
  }

  return await response.json();
}

// Example usage
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

try {
  const result = await uploadPitchDeck(file, 'user-123');
  console.log('Upload successful:', result.file.url);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### React Hook

```typescript
import { useState } from 'react';

function useUploadPitchDeck() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, userId?: string) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (userId) {
        headers['X-User-ID'] = userId;
      }

      const response = await fetch('/api/pitch-deck/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details || data.error);
      }

      return data.file;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}

// Usage in component
function UploadForm() {
  const { upload, uploading, error } = useUploadPitchDeck();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await upload(file, 'user-123');
      console.log('Uploaded:', result.url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf,.pptx" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### cURL

```bash
# Upload PDF
curl -X POST http://localhost:3000/api/pitch-deck/upload \
  -H "X-User-ID: user-123" \
  -F "file=@pitch-deck.pdf"

# Upload PPTX
curl -X POST http://localhost:3000/api/pitch-deck/upload \
  -H "X-User-ID: user-123" \
  -F "file=@presentation.pptx"
```

## File Storage

Files are stored in Vercel Blob with the following structure:

```
pitch-decks/
  └── {userId}/
      └── {timestamp}-{filename}
```

Example:
```
pitch-decks/user-123/1704067200000-pitch-deck.pdf
```

## Validation Rules

1. **File Type**: Only PDF (`.pdf`) and PowerPoint (`.pptx`) files allowed
2. **File Size**: Maximum 20MB per file
3. **File Extension**: Must match declared MIME type
4. **Empty Files**: Files with 0 bytes are rejected

## Error Handling

The API provides detailed error messages for debugging:

| Error Type | Status | Example Message |
|------------|--------|-----------------|
| No file | 400 | "Request must include a file in the 'file' field" |
| Invalid type | 400 | "Invalid file type: application/msword. Only PDF and PPTX files are allowed." |
| File too large | 400 | "File size (25.50MB) exceeds maximum allowed size (20MB)" |
| Extension mismatch | 400 | "File extension does not match type. Expected .pdf or .pptx" |
| Empty file | 400 | "File is empty" |
| Upload failure | 500 | "Failed to upload file: {error details}" |

## Helper Functions

### `lib/storage/upload.ts`

```typescript
import { uploadToBlob, deleteFromBlob, validateFileType, validateFileSize } from '@/lib/storage/upload';

// Upload file
const result = await uploadToBlob(file, 'user-123');

// Delete file
await deleteFromBlob(result.url);

// Manual validation
validateFileType(file); // Throws FileValidationError if invalid
validateFileSize(file, 20); // Throws FileValidationError if > 20MB
```

## Environment Variables

Ensure Vercel Blob is configured:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

This is automatically set in Vercel deployments when Blob storage is enabled.

## Security Considerations

1. **File Type Validation**: Both MIME type and file extension are checked
2. **Size Limits**: Enforced at 20MB to prevent abuse
3. **Public Access**: Files are stored with public access for easy sharing
4. **User Isolation**: Files are organized by user ID
5. **Sanitized Filenames**: Special characters are replaced with underscores

## CORS

The API supports CORS preflight requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-User-ID
```

## Testing

Run unit tests:

```bash
npm test -- upload
```

## Related Files

- `/app/api/pitch-deck/upload/route.ts` - API endpoint
- `/lib/storage/upload.ts` - Storage helper functions
- `/app/api/pitch-deck/upload/__tests__/route.test.ts` - Unit tests
