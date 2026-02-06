/**
 * Document Chunker
 * Phase 03: Pro Tier Features
 *
 * Splits documents into semantically meaningful chunks for RAG.
 */

import type { ExtractedPage, Chunk, ChunkOptions, ChunkMetadata } from './types';

// Target chunk sizes
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP = 50;
const CHARS_PER_TOKEN = 4; // Rough estimate

/**
 * Chunk a document using the specified strategy
 */
export function chunkDocument(
  text: string,
  pages: ExtractedPage[],
  options: ChunkOptions = { strategy: 'semantic' }
): Chunk[] {
  const { strategy, maxTokens = DEFAULT_MAX_TOKENS, overlap = DEFAULT_OVERLAP } = options;

  switch (strategy) {
    case 'page':
      return chunkByPage(pages);
    case 'fixed':
      return chunkByFixedSize(text, maxTokens, overlap);
    case 'semantic':
    default:
      return chunkBySemantic(text, pages, maxTokens, overlap);
  }
}

/**
 * Chunk by page - each page becomes a chunk
 * Best for pitch decks where each slide is meaningful
 */
export function chunkByPage(pages: ExtractedPage[]): Chunk[] {
  return pages
    .filter(page => page.content.trim().length > 0)
    .map((page, index) => ({
      index,
      content: page.content,
      pageNumber: page.pageNumber,
      tokenCount: estimateTokenCount(page.content),
      metadata: {
        startChar: 0,
        endChar: page.charCount,
      },
    }));
}

/**
 * Chunk by fixed size with overlap
 * Simple but effective for uniform documents
 */
export function chunkByFixedSize(
  text: string,
  maxTokens: number,
  overlap: number
): Chunk[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;
  const chunks: Chunk[] = [];

  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    let chunkEnd = end;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('. ', end);
      if (lastSentence > start + maxChars / 2) {
        chunkEnd = lastSentence + 1;
      }
    }

    const content = text.slice(start, chunkEnd).trim();

    if (content.length > 0) {
      chunks.push({
        index,
        content,
        tokenCount: estimateTokenCount(content),
        metadata: {
          startChar: start,
          endChar: chunkEnd,
        },
      });
      index++;
    }

    // Move start, accounting for overlap
    start = chunkEnd - overlapChars;
  }

  return chunks;
}

/**
 * Chunk by semantic boundaries (paragraphs, sections)
 * Best for documents with natural structure
 */
export function chunkBySemantic(
  text: string,
  pages: ExtractedPage[],
  maxTokens: number,
  overlap: number
): Chunk[] {
  // First, try to identify sections
  const sections = identifySections(text);

  if (sections.length > 1) {
    // Document has clear sections - chunk within sections
    return chunkSections(sections, pages, maxTokens, overlap);
  }

  // Fall back to paragraph-based chunking
  return chunkByParagraphs(text, pages, maxTokens, overlap);
}

/**
 * Identify sections based on common patterns
 */
function identifySections(text: string): { title: string; content: string; start: number }[] {
  const sections: { title: string; content: string; start: number }[] = [];

  // Common section patterns
  const sectionPatterns = [
    /^#{1,3}\s+(.+)$/gm,           // Markdown headers
    /^([A-Z][A-Z\s]+)$/gm,         // ALL CAPS headers
    /^\d+\.\s+([A-Z].+)$/gm,       // Numbered sections
    /^([A-Z][a-z]+(?: [A-Z][a-z]+)*):?$/gm, // Title Case headers
  ];

  let matches: { title: string; index: number }[] = [];

  for (const pattern of sectionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        title: match[1] || match[0],
        index: match.index,
      });
    }
  }

  // Sort by position
  matches = matches.sort((a, b) => a.index - b.index);

  // Remove duplicates and create sections
  const seenIndices = new Set<number>();

  for (let i = 0; i < matches.length; i++) {
    if (seenIndices.has(matches[i].index)) continue;
    seenIndices.add(matches[i].index);

    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;

    sections.push({
      title: matches[i].title.trim(),
      content: text.slice(start, end).trim(),
      start,
    });
  }

  return sections;
}

/**
 * Chunk within identified sections
 */
function chunkSections(
  sections: { title: string; content: string; start: number }[],
  pages: ExtractedPage[],
  maxTokens: number,
  overlap: number
): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;

  for (const section of sections) {
    const sectionTokens = estimateTokenCount(section.content);

    if (sectionTokens <= maxTokens) {
      // Section fits in one chunk
      chunks.push({
        index,
        content: section.content,
        section: section.title,
        pageNumber: findPageNumber(section.start, pages),
        tokenCount: sectionTokens,
        metadata: {
          startChar: section.start,
          endChar: section.start + section.content.length,
        },
      });
      index++;
    } else {
      // Split section into smaller chunks
      const subChunks = chunkByParagraphs(section.content, pages, maxTokens, overlap);
      for (const subChunk of subChunks) {
        chunks.push({
          ...subChunk,
          index,
          section: section.title,
          metadata: {
            ...subChunk.metadata,
            startChar: (subChunk.metadata.startChar || 0) + section.start,
            endChar: (subChunk.metadata.endChar || 0) + section.start,
          },
        });
        index++;
      }
    }
  }

  return chunks;
}

/**
 * Chunk by paragraphs
 */
function chunkByParagraphs(
  text: string,
  pages: ExtractedPage[],
  maxTokens: number,
  overlap: number
): Chunk[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: Chunk[] = [];

  let currentChunk = '';
  let currentStart = 0;
  let index = 0;
  let position = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokenCount(para);
    const currentTokens = estimateTokenCount(currentChunk);

    if (currentTokens + paraTokens <= maxTokens) {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      // Save current chunk and start new one
      if (currentChunk) {
        chunks.push({
          index,
          content: currentChunk,
          pageNumber: findPageNumber(currentStart, pages),
          tokenCount: currentTokens,
          metadata: {
            startChar: currentStart,
            endChar: position,
          },
        });
        index++;
      }

      // Handle paragraphs larger than max
      if (paraTokens > maxTokens) {
        const splitChunks = chunkByFixedSize(para, maxTokens, overlap);
        for (const splitChunk of splitChunks) {
          chunks.push({
            ...splitChunk,
            index,
            pageNumber: findPageNumber(position + (splitChunk.metadata.startChar || 0), pages),
            metadata: {
              ...splitChunk.metadata,
              startChar: position + (splitChunk.metadata.startChar || 0),
              endChar: position + (splitChunk.metadata.endChar || 0),
            },
          });
          index++;
        }
        currentChunk = '';
        currentStart = position + para.length + 2;
      } else {
        currentChunk = para;
        currentStart = position;
      }
    }

    position += para.length + 2; // +2 for \n\n
  }

  // Save final chunk
  if (currentChunk) {
    chunks.push({
      index,
      content: currentChunk,
      pageNumber: findPageNumber(currentStart, pages),
      tokenCount: estimateTokenCount(currentChunk),
      metadata: {
        startChar: currentStart,
        endChar: position,
      },
    });
  }

  return chunks;
}

/**
 * Find which page a character position belongs to
 */
function findPageNumber(charPosition: number, pages: ExtractedPage[]): number | undefined {
  let accumulatedChars = 0;

  for (const page of pages) {
    accumulatedChars += page.charCount + 1; // +1 for page separator
    if (charPosition < accumulatedChars) {
      return page.pageNumber;
    }
  }

  return pages.length > 0 ? pages[pages.length - 1].pageNumber : undefined;
}

/**
 * Estimate token count for text
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
