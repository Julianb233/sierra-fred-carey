/**
 * PDF Processor
 * Phase 03: Pro Tier Features
 *
 * Extracts text and metadata from PDF documents.
 */

import type { ExtractedDocument, ExtractedPage, DocumentMetadata } from './types';

// pdf-parse type definition
type PdfParseResult = {
  numpages: number;
  text: string;
  info: Record<string, unknown> | null;
};

type PdfParseOptions = {
  pagerender?: unknown;
  max?: number;
};

type PdfParseFn = (buffer: Buffer, options?: PdfParseOptions) => Promise<PdfParseResult>;

// Dynamic import for pdf-parse (CommonJS module)
let pdfParse: PdfParseFn | null = null;

async function getPdfParser(): Promise<PdfParseFn> {
  if (!pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = await import('pdf-parse') as any;
    pdfParse = (module.default ?? module) as PdfParseFn;
  }
  return pdfParse;
}

/**
 * Extract text content and metadata from a PDF buffer
 */
export async function extractText(buffer: Buffer): Promise<ExtractedDocument> {
  const parse = await getPdfParser();

  try {
    const data = await parse(buffer, {
      // Don't render pages as images
      pagerender: undefined,
    });

    // Extract per-page content
    const pages = extractPages(data.text, data.numpages);

    // Extract metadata
    const metadata = extractMetadata(data.info);

    return {
      text: data.text,
      pages,
      metadata,
      pageCount: data.numpages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for common PDF issues
    if (message.includes('password')) {
      throw new Error('PDF is password protected');
    }
    if (message.includes('encrypt')) {
      throw new Error('PDF is encrypted');
    }

    throw new Error(`Failed to extract PDF text: ${message}`);
  }
}

/**
 * Extract metadata from PDF info
 */
export function extractMetadata(info: Record<string, unknown> | null): DocumentMetadata {
  if (!info) return {};

  return {
    title: info.Title as string | undefined,
    author: info.Author as string | undefined,
    subject: info.Subject as string | undefined,
    keywords: info.Keywords
      ? (info.Keywords as string).split(',').map(k => k.trim())
      : undefined,
    creationDate: info.CreationDate as string | undefined,
    modificationDate: info.ModDate as string | undefined,
    producer: info.Producer as string | undefined,
  };
}

/**
 * Split text into pages based on page markers or heuristics
 */
function extractPages(text: string, pageCount: number): ExtractedPage[] {
  // pdf-parse doesn't preserve page boundaries well
  // We'll split by common page markers or distribute evenly

  // Try to find page markers (form feed character)
  const pageBreaks = text.split('\f');

  if (pageBreaks.length === pageCount) {
    return pageBreaks.map((content, index) => ({
      pageNumber: index + 1,
      content: content.trim(),
      charCount: content.length,
    }));
  }

  // Fall back to even distribution
  const charsPerPage = Math.ceil(text.length / pageCount);
  const pages: ExtractedPage[] = [];

  for (let i = 0; i < pageCount; i++) {
    const start = i * charsPerPage;
    const end = Math.min(start + charsPerPage, text.length);
    const content = text.slice(start, end).trim();

    pages.push({
      pageNumber: i + 1,
      content,
      charCount: content.length,
    });
  }

  return pages;
}

/**
 * Get just the metadata without full extraction
 */
export async function getMetadata(buffer: Buffer): Promise<DocumentMetadata & { pageCount: number }> {
  const parse = await getPdfParser();

  try {
    const data = await parse(buffer, {
      // Only get first page to speed up
      max: 1,
    });

    return {
      ...extractMetadata(data.info),
      pageCount: data.numpages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get PDF metadata: ${message}`);
  }
}

/**
 * Validate that a buffer is a valid PDF
 */
export function isValidPdf(buffer: Buffer): boolean {
  // Check for PDF magic bytes
  const header = buffer.slice(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Get estimated token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}
