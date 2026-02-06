/**
 * Document Processing Pipeline
 * Phase 03: Pro Tier Features
 *
 * Orchestrates the full document processing flow:
 * 1. Download from storage
 * 2. Extract text
 * 3. Chunk document
 * 4. Generate embeddings
 * 5. Store chunks
 * 6. Update status
 */

import { createClient } from '@supabase/supabase-js';
import { extractText, isValidPdf } from './pdf-processor';
import { chunkDocument } from './chunker';
import { embedChunks } from './embeddings';
import {
  updateDocumentStatus,
  updateDocumentMetadata,
  storeChunks,
} from '@/lib/db/documents';
import type { DocumentType, ChunkOptions } from './types';

// Lazy Supabase client (avoids module-level init during static generation)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ProcessOptions {
  chunkStrategy?: ChunkOptions['strategy'];
  maxTokens?: number;
}

/**
 * Process a document through the full pipeline
 */
export async function processDocument(
  documentId: string,
  fileUrl: string,
  documentType: DocumentType,
  options: ProcessOptions = {}
): Promise<void> {
  console.log(`[ProcessDocument] Starting processing for ${documentId}`);

  try {
    // 1. Download from storage
    console.log(`[ProcessDocument] Downloading file...`);
    const buffer = await downloadFile(fileUrl);

    // Validate PDF
    if (!isValidPdf(buffer)) {
      throw new Error('File is not a valid PDF');
    }

    // 2. Extract text
    console.log(`[ProcessDocument] Extracting text...`);
    const extracted = await extractText(buffer);
    console.log(`[ProcessDocument] Extracted ${extracted.pageCount} pages`);

    // Update metadata
    await updateDocumentMetadata(documentId, extracted.metadata, extracted.pageCount);

    // 3. Chunk document
    console.log(`[ProcessDocument] Chunking document...`);
    const chunkOptions: ChunkOptions = {
      // Use page chunking for pitch decks, semantic for others
      strategy: options.chunkStrategy ||
        (documentType === 'pitch_deck' ? 'page' : 'semantic'),
      maxTokens: options.maxTokens || 500,
    };

    const chunks = chunkDocument(extracted.text, extracted.pages, chunkOptions);
    console.log(`[ProcessDocument] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('No content could be extracted from document');
    }

    // 4. Generate embeddings
    console.log(`[ProcessDocument] Generating embeddings...`);
    const chunksWithEmbeddings = await embedChunks(chunks);
    console.log(`[ProcessDocument] Generated ${chunksWithEmbeddings.length} embeddings`);

    // 5. Store chunks
    console.log(`[ProcessDocument] Storing chunks...`);
    await storeChunks(documentId, chunksWithEmbeddings);

    // 6. Update status to ready
    await updateDocumentStatus(documentId, 'ready');
    console.log(`[ProcessDocument] Processing complete for ${documentId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProcessDocument] Processing failed: ${message}`);

    // Update status to failed
    await updateDocumentStatus(documentId, 'failed', message);
    throw error;
  }
}

/**
 * Download file from Supabase storage
 */
async function downloadFile(fileUrl: string): Promise<Buffer> {
  // Extract bucket and path from URL
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split('/storage/v1/object/public/');

  if (pathParts.length !== 2) {
    // Try direct fetch for public URLs
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const [bucket, ...pathSegments] = pathParts[1].split('/');
  const path = pathSegments.join('/');

  const { data, error } = await getSupabase().storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Failed to download from storage: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Reprocess a document (e.g., after algorithm improvements)
 */
export async function reprocessDocument(
  documentId: string,
  fileUrl: string,
  documentType: DocumentType,
  options: ProcessOptions = {}
): Promise<void> {
  // Delete existing chunks
  const { error } = await getSupabase()
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to delete existing chunks: ${error.message}`);
  }

  // Update status back to processing
  await updateDocumentStatus(documentId, 'processing');

  // Process again
  await processDocument(documentId, fileUrl, documentType, options);
}
