/**
 * Embedding Generator
 * Phase 03: Pro Tier Features
 *
 * Generates vector embeddings for document chunks using OpenAI.
 */

import OpenAI from 'openai';
import type { Chunk } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI limit per request
const MAX_TOKENS_PER_INPUT = 8191; // Model limit

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate if necessary
  const truncatedText = truncateToTokenLimit(text);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Truncate all texts
  const truncatedTexts = texts.map(truncateToTokenLimit);

  // Batch requests to stay within limits
  const batches = batchArray(truncatedTexts, MAX_BATCH_SIZE);
  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    const sortedData = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sortedData.map(d => d.embedding));
  }

  return allEmbeddings;
}

/**
 * Generate embeddings for chunks
 */
export async function embedChunks(
  chunks: Chunk[]
): Promise<(Chunk & { embedding: number[] })[]> {
  if (chunks.length === 0) return [];

  const texts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddings(texts);

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Truncate text to fit within token limit
 */
function truncateToTokenLimit(text: string): string {
  // Rough estimate: 4 chars per token
  const maxChars = MAX_TOKENS_PER_INPUT * 4;

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate and add ellipsis
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Split array into batches
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Get embedding dimensions
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

/**
 * Get embedding model name
 */
export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}
