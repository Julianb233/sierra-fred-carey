# PDF Parser Library

Utilities for parsing PDF pitch decks into structured data.

## Overview

This library provides a robust PDF parsing solution for extracting text content from pitch deck files. It's designed to handle various PDF formats while providing structured, slide-by-slide content extraction.

## Features

- Parse PDF files from Buffer or URL
- Extract text content per slide/page
- Calculate word counts for each slide
- Extract PDF metadata (title, author, creation date)
- Comprehensive error handling
- Support for validation and quick info retrieval

## Installation

The required dependency is already installed:

```bash
npm install pdf-parse
```

## Usage

### Basic PDF Parsing

```typescript
import { parsePDF, parsePDFFromUrl } from "@/lib/parsers/pdf-parser";

// Parse from Buffer
const buffer = fs.readFileSync("pitch-deck.pdf");
const result = await parsePDF(buffer);

// Parse from URL
const result = await parsePDFFromUrl("https://example.com/deck.pdf");

console.log(result);
// {
//   totalPages: 12,
//   slides: [
//     { pageNumber: 1, text: "...", wordCount: 45 },
//     { pageNumber: 2, text: "...", wordCount: 120 }
//   ],
//   fullText: "...",
//   metadata: {
//     title: "Company Pitch Deck",
//     author: "John Doe",
//     createdAt: "2024-01-15"
//   }
// }
```

### API Endpoint Usage

```typescript
// POST /api/pitch-deck/parse
const response = await fetch("/api/pitch-deck/parse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-User-ID": userId, // Optional
  },
  body: JSON.stringify({
    fileUrl: "https://storage.example.com/pitch-deck.pdf",
  }),
});

const data = await response.json();

if (data.success) {
  console.log(`Parsed ${data.parsed.totalPages} slides`);
  data.parsed.slides.forEach((slide) => {
    console.log(`Page ${slide.pageNumber}: ${slide.wordCount} words`);
  });
}
```

### Error Handling

```typescript
import { parsePDFFromUrl, PDFParseError } from "@/lib/parsers/pdf-parser";

try {
  const result = await parsePDFFromUrl(url);
  // Process result
} catch (error) {
  if (error instanceof PDFParseError) {
    // Handle specific PDF parsing errors
    console.error("PDF Error:", error.message);

    // Check for specific error types
    if (error.message.includes("password-protected")) {
      // Handle password-protected PDFs
    } else if (error.message.includes("Invalid or corrupted")) {
      // Handle corrupted PDFs
    }
  } else {
    // Handle other errors
    console.error("Unexpected error:", error);
  }
}
```

### Validation

```typescript
import { isValidPDF, getPDFInfo } from "@/lib/parsers/pdf-parser";

// Quick validation
const buffer = await file.arrayBuffer();
const isValid = isValidPDF(Buffer.from(buffer));

if (!isValid) {
  throw new Error("Not a valid PDF file");
}

// Get metadata without full parsing (faster)
const info = await getPDFInfo(buffer);
console.log(`PDF has ${info.pages} pages`);
console.log(`Title: ${info.metadata.title}`);
```

## API Reference

### Types

#### `SlideContent`

```typescript
interface SlideContent {
  pageNumber: number; // 1-based page number
  text: string; // Extracted text content
  wordCount: number; // Number of words on the slide
}
```

#### `ParsedDeck`

```typescript
interface ParsedDeck {
  totalPages: number; // Total number of pages in PDF
  slides: SlideContent[]; // Array of slide content
  fullText: string; // Complete text from all pages
  metadata: {
    title?: string; // PDF title metadata
    author?: string; // PDF author metadata
    createdAt?: string; // PDF creation date
  };
}
```

#### `PDFParseError`

Custom error class for PDF parsing errors with optional cause.

### Functions

#### `parsePDF(buffer: Buffer): Promise<ParsedDeck>`

Parse a PDF from a Buffer.

**Parameters:**

- `buffer` - PDF file as Buffer

**Returns:** Promise resolving to ParsedDeck

**Throws:** PDFParseError on parsing failures

#### `parsePDFFromUrl(url: string): Promise<ParsedDeck>`

Fetch and parse a PDF from a URL.

**Parameters:**

- `url` - HTTPS URL to PDF file

**Returns:** Promise resolving to ParsedDeck

**Throws:**

- PDFParseError on fetch or parsing failures
- Includes 30-second timeout

#### `isValidPDF(buffer: Buffer): boolean`

Quick validation of PDF format by checking file header.

**Parameters:**

- `buffer` - File buffer to validate

**Returns:** true if buffer starts with PDF header (%PDF)

#### `getPDFInfo(buffer: Buffer): Promise<{pages: number, metadata: ParsedDeck['metadata']}>`

Extract basic info without full text parsing (faster).

**Parameters:**

- `buffer` - PDF file as Buffer

**Returns:** Page count and metadata

**Throws:** PDFParseError on failures

## API Endpoint

### POST `/api/pitch-deck/parse`

Parse a PDF from a URL.

**Request:**

```json
{
  "fileUrl": "https://storage.example.com/pitch-deck.pdf"
}
```

**Headers:**

- `Content-Type: application/json`
- `X-User-ID: string` (optional, for logging)

**Success Response (200):**

```json
{
  "success": true,
  "parsed": {
    "totalPages": 12,
    "slides": [
      {
        "pageNumber": 1,
        "text": "Company Name\nTagline",
        "wordCount": 4
      }
    ],
    "fullText": "...",
    "metadata": {
      "title": "Pitch Deck",
      "author": "Company Inc"
    }
  }
}
```

**Error Response (400/500):**

```json
{
  "success": false,
  "error": "PDF parsing failed",
  "details": "PDF is password-protected and cannot be parsed"
}
```

## Error Types

The parser handles various error scenarios:

- **Password-protected PDFs**: Returns specific error message
- **Corrupted PDFs**: Detects invalid PDF structure
- **Invalid URLs**: Validates URL format before fetching
- **Network timeouts**: 30-second timeout on URL fetching
- **Invalid content type**: Warns if Content-Type is not PDF
- **Missing PDF header**: Validates %PDF header
- **Fetch failures**: HTTP error status codes

## Performance Considerations

- **Full parsing**: ~1-2s for typical 10-15 slide deck
- **Info only**: ~100-200ms (metadata + page count)
- **Validation**: ~1ms (header check only)
- **Timeout**: 30s for URL fetching

## Limitations

### Current Implementation

1. **Per-page text extraction**: The current implementation uses a fallback approach that estimates page boundaries. For production use with critical per-page accuracy, consider:
   - Using `pdfjs-dist` for true page-by-page extraction
   - Using `pdf-lib` for more granular control
   - The current approach works well for overall content extraction and word counts

2. **Image text**: Does not extract text from images (no OCR)

3. **Formatting**: Text is extracted but formatting/layout is not preserved

4. **Complex layouts**: Multi-column layouts may have unpredictable text order

### Future Enhancements

- Add OCR support for image-based PDFs
- Preserve layout/formatting information
- Extract embedded images
- Support for annotations and comments
- Page thumbnail generation

## Security

- URL validation before fetching
- Content-Type verification
- PDF header validation
- 30-second timeout on external requests
- No execution of embedded scripts
- Memory-safe parsing with pdf-parse library

## Testing

```typescript
import { parsePDF, isValidPDF } from "@/lib/parsers/pdf-parser";
import fs from "fs";

describe("PDF Parser", () => {
  it("should parse a valid PDF", async () => {
    const buffer = fs.readFileSync("test-deck.pdf");
    const result = await parsePDF(buffer);

    expect(result.totalPages).toBeGreaterThan(0);
    expect(result.slides).toHaveLength(result.totalPages);
    expect(result.fullText).toBeTruthy();
  });

  it("should validate PDF format", () => {
    const validPDF = Buffer.from("%PDF-1.4...");
    const invalidPDF = Buffer.from("Not a PDF");

    expect(isValidPDF(validPDF)).toBe(true);
    expect(isValidPDF(invalidPDF)).toBe(false);
  });
});
```

## Troubleshooting

### "Module has no default export"

If you see TypeScript errors about default exports, the import is handled with:

```typescript
import * as pdfParse from "pdf-parse";
const pdf = (pdfParse as any).default || pdfParse;
```

### "Invalid PDF" errors

Ensure the file:

- Starts with %PDF header
- Is not corrupted
- Is not password-protected
- Is a valid PDF format (not renamed image/document)

### Timeout errors

For large PDFs or slow connections:

- Increase timeout in `parsePDFFromUrl`
- Consider chunked downloading
- Use streaming parser for very large files

### Memory issues

For very large PDFs:

- Process in batches
- Use `getPDFInfo` first to check size
- Consider server-side processing limits

## License

Part of Sierra Fred Carey platform.
