/**
 * Document Database Operations
 * Phase 03: Pro Tier Features
 *
 * CRUD operations for uploaded documents and chunks.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  UploadedDocument,
  DocumentChunk,
  DocumentType,
  DocumentStatus,
  SimilarChunk,
  Chunk,
} from '@/lib/documents/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a new document record
 */
export async function createDocument(
  userId: string,
  data: {
    name: string;
    type: DocumentType;
    fileUrl: string;
    fileSize: number;
    pageCount?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<UploadedDocument> {
  const { data: document, error } = await supabase
    .from('uploaded_documents')
    .insert({
      user_id: userId,
      name: data.name,
      type: data.type,
      file_url: data.fileUrl,
      file_size: data.fileSize,
      page_count: data.pageCount,
      metadata: data.metadata || {},
      status: 'processing',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return mapDocument(document);
}

/**
 * Get documents for a user
 */
export async function getDocuments(
  userId: string,
  filters?: {
    type?: DocumentType;
    status?: DocumentStatus;
    limit?: number;
    offset?: number;
  }
): Promise<UploadedDocument[]> {
  let query = supabase
    .from('uploaded_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get documents: ${error.message}`);
  }

  return (data || []).map(mapDocument);
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(
  userId: string,
  documentId: string
): Promise<UploadedDocument | null> {
  const { data, error } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get document: ${error.message}`);
  }

  return mapDocument(data);
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from('uploaded_documents')
    .update({
      status,
      error_message: errorMessage,
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to update document status: ${error.message}`);
  }
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  documentId: string,
  metadata: Record<string, unknown>,
  pageCount?: number
): Promise<void> {
  const updates: Record<string, unknown> = { metadata };
  if (pageCount !== undefined) {
    updates.page_count = pageCount;
  }

  const { error } = await supabase
    .from('uploaded_documents')
    .update(updates)
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to update document metadata: ${error.message}`);
  }
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<void> {
  // Verify ownership
  const document = await getDocumentById(userId, documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Delete from storage
  const fileName = document.fileUrl.split('/').pop();
  if (fileName) {
    await supabase.storage.from('documents').remove([`${userId}/${fileName}`]);
  }

  // Delete document (chunks cascade)
  const { error } = await supabase
    .from('uploaded_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Store document chunks with embeddings
 */
export async function storeChunks(
  documentId: string,
  chunks: (Chunk & { embedding: number[] })[]
): Promise<void> {
  const chunkRecords = chunks.map(chunk => ({
    document_id: documentId,
    chunk_index: chunk.index,
    content: chunk.content,
    // pgvector expects a JSON array with the correct dimension, or null.
    // Pass null for empty embeddings to avoid dimension mismatch errors.
    embedding: chunk.embedding.length > 0
      ? JSON.stringify(chunk.embedding)
      : null,
    page_number: chunk.pageNumber,
    section: chunk.section,
    metadata: chunk.metadata,
  }));

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize);
    const { error } = await supabase.from('document_chunks').insert(batch);

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }
}

/**
 * Get chunks for a document
 */
export async function getDocumentChunks(
  documentId: string
): Promise<DocumentChunk[]> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to get chunks: ${error.message}`);
  }

  return (data || []).map(mapChunk);
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  userId: string,
  embedding: number[],
  options?: {
    limit?: number;
    threshold?: number;
    documentId?: string;
    documentType?: DocumentType;
  }
): Promise<SimilarChunk[]> {
  const limit = options?.limit || 5;
  const threshold = options?.threshold || 0.7;

  // Use RPC for vector similarity search
  const { data, error } = await supabase.rpc('search_document_chunks', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    p_user_id: userId,
    p_document_id: options?.documentId,
    p_document_type: options?.documentType,
  });

  if (error) {
    // Fallback: function might not exist yet
    console.warn('Vector search RPC not available, falling back to basic query');
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    ...mapChunk(row),
    similarity: row.similarity as number,
  }));
}

/**
 * Search chunks by text (full-text search fallback)
 */
export async function searchChunksByText(
  userId: string,
  query: string,
  options?: {
    limit?: number;
    documentId?: string;
  }
): Promise<DocumentChunk[]> {
  let dbQuery = supabase
    .from('document_chunks')
    .select(`
      *,
      uploaded_documents!inner (user_id)
    `)
    .eq('uploaded_documents.user_id', userId)
    .textSearch('content', query)
    .limit(options?.limit || 10);

  if (options?.documentId) {
    dbQuery = dbQuery.eq('document_id', options.documentId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return (data || []).map(mapChunk);
}

// Map database row to UploadedDocument
function mapDocument(row: Record<string, unknown>): UploadedDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    type: row.type as DocumentType,
    fileUrl: row.file_url as string,
    fileSize: row.file_size as number,
    pageCount: row.page_count as number | null,
    status: row.status as DocumentStatus,
    errorMessage: row.error_message as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Map database row to DocumentChunk
function mapChunk(row: Record<string, unknown>): DocumentChunk {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    chunkIndex: row.chunk_index as number,
    content: row.content as string,
    embedding: row.embedding as number[] | null,
    pageNumber: row.page_number as number | null,
    section: row.section as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
  };
}
