/**
 * Document Types
 * Phase 03: Pro Tier Features
 */

export type DocumentType = 'pitch_deck' | 'financial' | 'strategy' | 'legal' | 'other';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface UploadedDocument {
  id: string;
  userId: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize: number;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creationDate?: string;
  modificationDate?: string;
  producer?: string;
  [key: string]: unknown;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[] | null;
  pageNumber: number | null;
  section: string | null;
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface ChunkMetadata {
  startChar?: number;
  endChar?: number;
  tokenCount?: number;
  [key: string]: unknown;
}

export interface ExtractedDocument {
  text: string;
  pages: ExtractedPage[];
  metadata: DocumentMetadata;
  pageCount: number;
}

export interface ExtractedPage {
  pageNumber: number;
  content: string;
  charCount: number;
}

export interface ChunkOptions {
  strategy: 'page' | 'semantic' | 'fixed';
  maxTokens?: number;
  overlap?: number;
}

export interface Chunk {
  index: number;
  content: string;
  pageNumber?: number;
  section?: string;
  tokenCount: number;
  metadata: ChunkMetadata;
}

export interface SimilarChunk extends DocumentChunk {
  similarity: number;
  document?: UploadedDocument;
}
