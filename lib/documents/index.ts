/**
 * Document Processing Module
 * Phase 03: Pro Tier Features
 *
 * Export all document-related functionality.
 */

// Types
export * from './types';

// PDF Processing
export { extractText, getMetadata, isValidPdf, estimateTokens } from './pdf-processor';

// Chunking
export { chunkDocument, chunkByPage, chunkByFixedSize, chunkBySemantic } from './chunker';

// Embeddings
export {
  generateEmbedding,
  generateEmbeddings,
  embedChunks,
  cosineSimilarity,
  getEmbeddingDimensions,
  getEmbeddingModel,
} from './embeddings';

// Processing Pipeline
export { processDocument, reprocessDocument } from './process-document';
