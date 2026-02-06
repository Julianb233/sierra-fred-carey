/**
 * PDF Processor
 * Phase 03: Pro Tier Features
 *
 * Extracts text and metadata from PDF documents.
 */

import type { ExtractedDocument, ExtractedPage, DocumentMetadata } from './types';
import { PDFParse } from 'pdf-parse';

/**
 * Extract text content and metadata from a PDF buffer
 *
 * Uses pdf-parse v2 class-based API.
 */
export async function extractText(buffer: Buffer): Promise<ExtractedDocument> {
  let parser: PDFParse | undefined;

  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });

    // Get text with per-page results and info in parallel
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo(),
    ]);

    // Build per-page content from v2 page results, with fallback
    let pages: ExtractedPage[];
    if (textResult.pages && textResult.pages.length > 0) {
      pages = textResult.pages.map((page) => ({
        pageNumber: page.num,
        content: page.text.trim(),
        charCount: page.text.length,
      }));
    } else {
      pages = extractPages(textResult.text, textResult.total);
    }

    // Extract metadata from info
    const info = infoResult.info as Record<string, unknown> | null;
    const metadata = extractMetadata(info);

    return {
      text: textResult.text,
      pages,
      metadata,
      pageCount: textResult.total,
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
  } finally {
    if (parser) {
      await parser.destroy();
    }
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
  let parser: PDFParse | undefined;

  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const infoResult = await parser.getInfo();
    const info = infoResult.info as Record<string, unknown> | null;

    return {
      ...extractMetadata(info),
      pageCount: infoResult.total,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get PDF metadata: ${message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
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
