# Testing the PDF Parser

## Quick Test Commands

### Using cURL

```bash
# Test the parse endpoint
curl -X POST http://localhost:3000/api/pitch-deck/parse \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-123" \
  -d '{
    "fileUrl": "https://example.com/sample-deck.pdf"
  }'
```

### Using JavaScript Fetch

```javascript
// Test in browser console or Node.js
const testParse = async () => {
  const response = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileUrl: 'https://example.com/sample-deck.pdf'
    })
  });

  const data = await response.json();
  console.log('Parse result:', data);

  if (data.success) {
    console.log(`Total pages: ${data.parsed.totalPages}`);
    console.log(`Total words: ${data.parsed.slides.reduce((sum, s) => sum + s.wordCount, 0)}`);
    console.log('Slides:', data.parsed.slides);
  }
};

testParse();
```

## Full Workflow Test

```typescript
// Complete upload + parse workflow
async function testFullWorkflow() {
  // 1. Create a test file (in browser)
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) {
    console.error('No file selected');
    return;
  }

  // 2. Upload
  console.log('Uploading...');
  const formData = new FormData();
  formData.append('file', file);

  const uploadRes = await fetch('/api/pitch-deck/upload', {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadRes.json();
  console.log('Upload result:', uploadData);

  if (!uploadData.success) {
    console.error('Upload failed:', uploadData.error);
    return;
  }

  // 3. Parse
  console.log('Parsing...');
  const parseRes = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileUrl: uploadData.file.url
    })
  });

  const parseData = await parseRes.json();
  console.log('Parse result:', parseData);

  if (!parseData.success) {
    console.error('Parse failed:', parseData.error);
    return;
  }

  // 4. Display results
  console.log('SUCCESS!');
  console.log('Pages:', parseData.parsed.totalPages);
  console.log('Metadata:', parseData.parsed.metadata);
  console.log('Slides preview:');
  parseData.parsed.slides.slice(0, 3).forEach(slide => {
    console.log(`  Page ${slide.pageNumber}: ${slide.wordCount} words`);
    console.log(`    ${slide.text.substring(0, 100)}...`);
  });
}
```

## Error Case Tests

```typescript
// Test 1: Missing fileUrl
const testMissingUrl = async () => {
  const res = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  console.log('Expected 400:', res.status, data);
};

// Test 2: Invalid URL
const testInvalidUrl = async () => {
  const res = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl: 'not-a-url' })
  });
  const data = await res.json();
  console.log('Expected 400:', res.status, data);
};

// Test 3: Non-existent PDF
const testNonExistent = async () => {
  const res = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileUrl: 'https://example.com/does-not-exist.pdf'
    })
  });
  const data = await res.json();
  console.log('Expected 400/500:', res.status, data);
};

// Test 4: Invalid JSON
const testInvalidJson = async () => {
  const res = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json'
  });
  const data = await res.json();
  console.log('Expected 400:', res.status, data);
};
```

## React Component Test

```tsx
'use client';

import { useState } from 'react';

export function PitchDeckParser() {
  const [fileUrl, setFileUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/pitch-deck/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.parsed);
      } else {
        setError(data.details || data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>
          PDF URL:
          <input
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://example.com/deck.pdf"
            className="w-full border rounded px-3 py-2"
          />
        </label>
      </div>

      <button
        onClick={handleParse}
        disabled={!fileUrl || loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Parsing...' : 'Parse PDF'}
      </button>

      {error && (
        <div className="text-red-500 p-3 border border-red-300 rounded">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <h3 className="font-bold">Parse Result</h3>
          <p>Pages: {result.totalPages}</p>
          <p>Total Words: {result.slides.reduce((s: number, sl: any) => s + sl.wordCount, 0)}</p>
          {result.metadata.title && <p>Title: {result.metadata.title}</p>}

          <div className="space-y-2">
            <h4 className="font-semibold">Slides:</h4>
            {result.slides.map((slide: any) => (
              <div key={slide.pageNumber} className="border p-2 rounded">
                <p className="font-medium">Page {slide.pageNumber} ({slide.wordCount} words)</p>
                <p className="text-sm text-gray-600">
                  {slide.text.substring(0, 150)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Sample Test Data

Use these public PDF samples for testing:

```typescript
const testUrls = [
  // Small PDF (few pages)
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',

  // Y Combinator pitch deck template (if publicly available)
  // Replace with actual test URLs from your Vercel Blob storage

  // Your uploaded deck
  // Get from upload endpoint response
];

// Test with real deck
async function testWithRealDeck() {
  const url = testUrls[0];
  console.log('Testing with:', url);

  const response = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl: url })
  });

  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}
```

## Expected Response Format

### Success Case
```json
{
  "success": true,
  "parsed": {
    "totalPages": 12,
    "slides": [
      {
        "pageNumber": 1,
        "text": "YourCo\nRevolutionizing the Industry",
        "wordCount": 4
      },
      {
        "pageNumber": 2,
        "text": "Problem\nMost companies struggle with...",
        "wordCount": 25
      }
    ],
    "fullText": "Full concatenated text from all pages...",
    "metadata": {
      "title": "Pitch Deck 2024",
      "author": "YourCo Inc",
      "createdAt": "D:20240115120000Z"
    }
  }
}
```

### Error Cases
```json
// Missing URL
{
  "success": false,
  "error": "Missing fileUrl",
  "details": "Request body must include a \"fileUrl\" field"
}

// Invalid URL format
{
  "success": false,
  "error": "Invalid URL",
  "details": "The provided fileUrl is not a valid URL"
}

// Password-protected PDF
{
  "success": false,
  "error": "PDF parsing failed",
  "details": "PDF is password-protected and cannot be parsed"
}

// Corrupted PDF
{
  "success": false,
  "error": "PDF parsing failed",
  "details": "Invalid or corrupted PDF file"
}

// Network error
{
  "success": false,
  "error": "PDF parsing failed",
  "details": "Failed to fetch PDF: 404 Not Found"
}
```

## Performance Testing

```typescript
// Measure parsing performance
async function benchmarkParsing(url: string) {
  const start = performance.now();

  const response = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl: url })
  });

  const data = await response.json();
  const end = performance.now();

  console.log('Performance:', {
    totalTime: `${(end - start).toFixed(2)}ms`,
    pages: data.parsed?.totalPages,
    avgTimePerPage: data.parsed ?
      `${((end - start) / data.parsed.totalPages).toFixed(2)}ms` : 'N/A'
  });

  return data;
}
```

## Integration Test Checklist

- [ ] Test with 5-page PDF
- [ ] Test with 20-page PDF
- [ ] Test with 50+ page PDF
- [ ] Test with password-protected PDF (should fail gracefully)
- [ ] Test with corrupted PDF (should fail gracefully)
- [ ] Test with non-PDF file (should fail gracefully)
- [ ] Test with invalid URL
- [ ] Test with missing fileUrl
- [ ] Test with malformed JSON
- [ ] Test authentication headers
- [ ] Test CORS headers
- [ ] Verify word counts are accurate
- [ ] Verify metadata extraction
- [ ] Verify per-page text extraction
- [ ] Test timeout on slow connection
- [ ] Test concurrent requests
