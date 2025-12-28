/**
 * Example usage of the PDF Parser library
 *
 * This file demonstrates various ways to use the PDF parsing functionality
 * in the Sierra Fred Carey platform.
 */

import { parsePDF, parsePDFFromUrl, isValidPDF, getPDFInfo, PDFParseError } from './pdf-parser';

// ============================================================================
// Example 1: Parse PDF from uploaded file (using Vercel Blob URL)
// ============================================================================

async function parseUploadedDeck(blobUrl: string) {
  try {
    console.log('Parsing PDF from Vercel Blob...');
    const result = await parsePDFFromUrl(blobUrl);

    console.log(`✓ Successfully parsed ${result.totalPages} pages`);
    console.log(`✓ Total text length: ${result.fullText.length} characters`);

    // Display slide-by-slide breakdown
    result.slides.forEach((slide) => {
      console.log(`  Page ${slide.pageNumber}: ${slide.wordCount} words`);
    });

    return result;
  } catch (error) {
    if (error instanceof PDFParseError) {
      console.error('PDF parsing failed:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// ============================================================================
// Example 2: Using the API endpoint (client-side)
// ============================================================================

async function parseViaAPI(fileUrl: string, userId?: string) {
  const response = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'X-User-ID': userId }),
    },
    body: JSON.stringify({ fileUrl }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.details || data.error);
  }

  return data.parsed;
}

// ============================================================================
// Example 3: Validate before parsing
// ============================================================================

async function safeParseWithValidation(buffer: Buffer) {
  // Quick validation first (1ms)
  if (!isValidPDF(buffer)) {
    throw new Error('File is not a valid PDF');
  }

  // Get basic info (100-200ms)
  const info = await getPDFInfo(buffer);
  console.log(`PDF has ${info.pages} pages`);

  if (info.pages > 50) {
    throw new Error('PDF is too large (max 50 pages)');
  }

  // Full parse (1-2s for typical deck)
  const result = await parsePDF(buffer);
  return result;
}

// ============================================================================
// Example 4: Full workflow - Upload + Parse + Analyze
// ============================================================================

async function fullPitchDeckWorkflow(file: File, userId: string) {
  console.log('Starting pitch deck workflow...');

  // Step 1: Upload to Vercel Blob
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);

  const uploadResponse = await fetch('/api/pitch-deck/upload', {
    method: 'POST',
    headers: { 'X-User-ID': userId },
    body: uploadFormData,
  });

  const uploadData = await uploadResponse.json();

  if (!uploadData.success) {
    throw new Error(`Upload failed: ${uploadData.details}`);
  }

  console.log('✓ File uploaded:', uploadData.file.url);

  // Step 2: Parse the PDF
  const parseResponse = await fetch('/api/pitch-deck/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId,
    },
    body: JSON.stringify({ fileUrl: uploadData.file.url }),
  });

  const parseData = await parseResponse.json();

  if (!parseData.success) {
    throw new Error(`Parse failed: ${parseData.details}`);
  }

  console.log('✓ PDF parsed:', parseData.parsed.totalPages, 'pages');

  // Step 3: Analyze the content
  const analysis = {
    totalPages: parseData.parsed.totalPages,
    totalWords: parseData.parsed.slides.reduce((sum: number, slide: { wordCount: number }) => sum + slide.wordCount, 0),
    averageWordsPerSlide:
      parseData.parsed.slides.reduce((sum: number, slide: { wordCount: number }) => sum + slide.wordCount, 0) /
      parseData.parsed.totalPages,
    metadata: parseData.parsed.metadata,
  };

  console.log('✓ Analysis complete:', analysis);

  return {
    upload: uploadData.file,
    parsed: parseData.parsed,
    analysis,
  };
}

// ============================================================================
// Example 5: Error handling with specific recovery
// ============================================================================

async function robustParse(url: string, maxRetries = 3) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Parse attempt ${attempt}/${maxRetries}...`);
      const result = await parsePDFFromUrl(url);
      console.log('✓ Parse successful');
      return result;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof PDFParseError) {
        // Don't retry for client errors
        if (
          error.message.includes('password-protected') ||
          error.message.includes('Invalid or corrupted') ||
          error.message.includes('Invalid URL')
        ) {
          console.error('✗ Unrecoverable error:', error.message);
          throw error;
        }

        // Retry for network/server errors
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`  Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

// ============================================================================
// Example 6: Batch processing multiple decks
// ============================================================================

async function processBatchDecks(urls: string[]) {
  console.log(`Processing ${urls.length} pitch decks...`);

  const results = await Promise.allSettled(urls.map((url) => parsePDFFromUrl(url)));

  const successful = results.filter((r) => r.status === 'fulfilled');
  const failed = results.filter((r) => r.status === 'rejected');

  console.log(`✓ Successful: ${successful.length}`);
  console.log(`✗ Failed: ${failed.length}`);

  return {
    successful: successful.map((r) => (r.status === 'fulfilled' ? r.value : null)),
    failed: failed.map((r, i) => ({
      url: urls[i],
      error: r.status === 'rejected' ? r.reason.message : 'Unknown error',
    })),
  };
}

// ============================================================================
// Export examples for use in other files
// ============================================================================

export {
  parseUploadedDeck,
  parseViaAPI,
  safeParseWithValidation,
  fullPitchDeckWorkflow,
  robustParse,
  processBatchDecks,
};
