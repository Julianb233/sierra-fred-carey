import { PDFParse } from "pdf-parse";

/**
 * Content extracted from a single slide/page
 */
export interface SlideContent {
  pageNumber: number;
  text: string;
  wordCount: number;
}

/**
 * Complete parsed PDF deck structure
 */
export interface ParsedDeck {
  totalPages: number;
  slides: SlideContent[];
  fullText: string;
  metadata: {
    title?: string;
    author?: string;
    createdAt?: string;
  };
}

/**
 * Error types for PDF parsing
 */
export class PDFParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "PDFParseError";
  }
}

/**
 * Calculate word count from text
 */
function getWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Parse PDF buffer into structured deck data
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDeck> {
  let parser: PDFParse | undefined;
  try {
    // pdf-parse v2 uses a class-based API
    parser = new PDFParse({ data: new Uint8Array(buffer) });

    // Get text with per-page results
    const textResult = await parser.getText();

    // Get metadata
    const infoResult = await parser.getInfo();

    // Build slides from per-page text results
    const slides: SlideContent[] = textResult.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text.trim(),
      wordCount: getWordCount(page.text),
    }));

    // Extract metadata from info result
    const dateNode = infoResult.getDateNode();
    const metadata = {
      title: infoResult.info?.Title || undefined,
      author: infoResult.info?.Author || undefined,
      createdAt: dateNode.CreationDate?.toISOString() || undefined,
    };

    return {
      totalPages: textResult.total,
      slides,
      fullText: textResult.text,
      metadata,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Check for common PDF errors
      if (error.message.includes("password")) {
        throw new PDFParseError(
          "PDF is password-protected and cannot be parsed",
          error
        );
      }
      if (error.message.includes("Invalid PDF")) {
        throw new PDFParseError("Invalid or corrupted PDF file", error);
      }
      throw new PDFParseError(`Failed to parse PDF: ${error.message}`, error);
    }
    throw new PDFParseError("Unknown error parsing PDF", error);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

/**
 * Fetch and parse PDF from a URL
 */
export async function parsePDFFromUrl(url: string): Promise<ParsedDeck> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) {
      throw new PDFParseError("URL must use HTTP or HTTPS protocol");
    }

    // Fetch the PDF
    const response = await fetch(url, {
      headers: {
        Accept: "application/pdf",
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new PDFParseError(
        `Failed to fetch PDF: ${response.status} ${response.statusText}`
      );
    }

    // Verify content type
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("pdf")) {
      console.warn(
        `Warning: Content-Type is ${contentType}, expected application/pdf`
      );
    }

    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify it's a PDF (should start with %PDF)
    const header = buffer.toString("utf8", 0, 5);
    if (!header.startsWith("%PDF")) {
      throw new PDFParseError(
        "File does not appear to be a valid PDF (missing PDF header)"
      );
    }

    // Parse the PDF
    return await parsePDF(buffer);
  } catch (error) {
    if (error instanceof PDFParseError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes("Invalid URL")) {
      throw new PDFParseError("Invalid URL provided");
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new PDFParseError("Request timed out fetching PDF");
    }
    if (error instanceof Error) {
      throw new PDFParseError(`Failed to fetch PDF: ${error.message}`, error);
    }
    throw new PDFParseError("Unknown error fetching PDF", error);
  }
}

/**
 * Validate PDF buffer
 */
export function isValidPDF(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.toString("utf8", 0, 5);
  return header.startsWith("%PDF");
}

/**
 * Get PDF info without full parsing (faster)
 */
export async function getPDFInfo(
  buffer: Buffer
): Promise<{ pages: number; metadata: ParsedDeck["metadata"] }> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const infoResult = await parser.getInfo();
    const dateNode = infoResult.getDateNode();
    return {
      pages: infoResult.total,
      metadata: {
        title: infoResult.info?.Title || undefined,
        author: infoResult.info?.Author || undefined,
        createdAt: dateNode.CreationDate?.toISOString() || undefined,
      },
    };
  } catch (error) {
    throw new PDFParseError(
      "Failed to extract PDF info",
      error instanceof Error ? error : undefined
    );
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}
