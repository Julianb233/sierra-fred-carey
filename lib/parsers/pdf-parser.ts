import * as pdfParse from "pdf-parse";

// pdf-parse default export
const pdf = (pdfParse as any).default || pdfParse;

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
  try {
    // Parse the PDF
    const data = await pdf(buffer);

    // Extract text from each page
    const slides: SlideContent[] = [];
    const pageTexts: string[] = [];

    // pdf-parse doesn't provide per-page text by default
    // We need to use the render_page option to extract text per page
    const options = {
      max: data.numpages,
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        return pageText;
      },
    };

    // Re-parse with page-by-page extraction
    const detailedData = await pdf(buffer, options);

    // Since pdf-parse doesn't easily expose per-page text,
    // we'll estimate by splitting the full text
    // This is a fallback approach - for production, consider using pdf-lib or pdfjs-dist
    const fullText = data.text;
    const estimatedPagesText = fullText.split(/\n\s*\n\s*\n/); // Rough page breaks

    // If we have approximately the right number of sections, use them
    if (estimatedPagesText.length >= data.numpages * 0.5) {
      estimatedPagesText.slice(0, data.numpages).forEach((text: string, index: number) => {
        slides.push({
          pageNumber: index + 1,
          text: text.trim(),
          wordCount: getWordCount(text),
        });
      });
    } else {
      // Fallback: distribute text evenly across pages
      const charsPerPage = Math.ceil(fullText.length / data.numpages);
      for (let i = 0; i < data.numpages; i++) {
        const startIdx = i * charsPerPage;
        const endIdx = Math.min((i + 1) * charsPerPage, fullText.length);
        const pageText = fullText.substring(startIdx, endIdx);
        slides.push({
          pageNumber: i + 1,
          text: pageText.trim(),
          wordCount: getWordCount(pageText),
        });
      }
    }

    // Extract metadata
    const metadata = {
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      createdAt: data.info?.CreationDate || undefined,
    };

    return {
      totalPages: data.numpages,
      slides,
      fullText,
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
  try {
    const data = await pdf(buffer);
    return {
      pages: data.numpages,
      metadata: {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        createdAt: data.info?.CreationDate || undefined,
      },
    };
  } catch (error) {
    throw new PDFParseError(
      "Failed to extract PDF info",
      error instanceof Error ? error : undefined
    );
  }
}
