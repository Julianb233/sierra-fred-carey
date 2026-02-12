/**
 * Document Repository Service
 * Phase 44: Unified document management
 *
 * Provides CRUD operations for the document_repository table,
 * file upload to Supabase storage, and auto-categorization.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentFolder = "decks" | "strategy" | "reports" | "uploads";
export type DocumentSourceType = "upload" | "generated" | "strategy" | "linked";

export interface RepositoryDocument {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  folder: DocumentFolder;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  metadata: Record<string, unknown>;
  sourceType: DocumentSourceType | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  folder: DocumentFolder;
  fileUrl?: string;
  fileType?: string | null;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  sourceType?: DocumentSourceType;
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Storage bucket name
// ---------------------------------------------------------------------------

const STORAGE_BUCKET = "document-repository";

// ---------------------------------------------------------------------------
// Auto-categorization
// ---------------------------------------------------------------------------

const FOLDER_PATTERNS: Record<DocumentFolder, RegExp[]> = {
  decks: [
    /pitch[\s_-]?deck/i,
    /investor[\s_-]?deck/i,
    /presentation/i,
    /\.pptx?\b/i,
    /\.key\b/i,
  ],
  strategy: [
    /strategy/i,
    /gtm/i,
    /go[\s_-]?to[\s_-]?market/i,
    /competitive[\s_-]?analysis/i,
    /market[\s_-]?analysis/i,
    /business[\s_-]?plan/i,
  ],
  reports: [
    /report/i,
    /financial[\s_-]?model/i,
    /metrics/i,
    /analytics/i,
    /summary/i,
    /memo/i,
  ],
  uploads: [],
};

/**
 * Detect the most likely folder for a file based on its name and type.
 */
export function suggestFolder(fileName: string, fileType?: string): DocumentFolder {
  const combined = `${fileName} ${fileType || ""}`;

  for (const [folder, patterns] of Object.entries(FOLDER_PATTERNS) as [DocumentFolder, RegExp[]][]) {
    if (folder === "uploads") continue; // fallback
    for (const pattern of patterns) {
      if (pattern.test(combined)) return folder;
    }
  }

  return "uploads";
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): RepositoryDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    folder: row.folder as DocumentFolder,
    fileUrl: (row.file_url as string) ?? null,
    fileType: (row.file_type as string) ?? null,
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    sourceType: (row.source_type as DocumentSourceType) ?? null,
    sourceId: (row.source_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * List documents for a user, optionally filtered by folder.
 */
export async function listDocuments(
  userId: string,
  folder?: DocumentFolder
): Promise<RepositoryDocument[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("document_repository")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (folder) {
    query = query.eq("folder", folder);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

/**
 * Get a single document by ID (scoped to user).
 */
export async function getDocument(
  userId: string,
  documentId: string
): Promise<RepositoryDocument | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("document_repository")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get document: ${error.message}`);
  }

  return mapRow(data);
}

/**
 * Create a new document record.
 */
export async function createDocument(
  userId: string,
  input: CreateDocumentInput
): Promise<RepositoryDocument> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("document_repository")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      folder: input.folder,
      file_url: input.fileUrl ?? null,
      file_type: input.fileType ?? null,
      file_size: input.fileSize ?? null,
      metadata: input.metadata ?? {},
      source_type: input.sourceType ?? "upload",
      source_id: input.sourceId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return mapRow(data);
}

/**
 * Delete a document and its associated storage file.
 */
export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // Fetch first to get file_url for storage cleanup
  const doc = await getDocument(userId, documentId);
  if (!doc) return false;

  // Remove from storage if there's a file
  if (doc.fileUrl) {
    await removeStorageFile(supabase, userId, doc.fileUrl);
  }

  const { error } = await supabase
    .from("document_repository")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Upload a file to Supabase storage under the user's folder.
 * Returns the storage path.
 */
export async function uploadFile(
  userId: string,
  file: File
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createServiceClient();

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Remove a file from storage given its public URL.
 */
async function removeStorageFile(
  supabase: SupabaseClient,
  userId: string,
  fileUrl: string
): Promise<void> {
  try {
    // Extract storage path from URL: look for the bucket name segment
    const bucketSegment = `/${STORAGE_BUCKET}/`;
    const idx = fileUrl.indexOf(bucketSegment);
    if (idx === -1) return;

    const storagePath = fileUrl.substring(idx + bucketSegment.length);
    // Verify the path is under the user's folder to prevent path traversal
    if (!storagePath.startsWith(`${userId}/`)) return;

    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  } catch (err) {
    console.warn("[DocumentRepository] Failed to remove storage file:", err);
  }
}

// ---------------------------------------------------------------------------
// Content extraction for "Review with Fred"
// ---------------------------------------------------------------------------

/**
 * Get document content suitable for loading into chat context.
 * For uploaded files, tries to retrieve text content from document_chunks
 * (populated by the existing document processing pipeline).
 * For generated/strategy docs, fetches content from legacy tables.
 */
export async function getDocumentContent(
  userId: string,
  documentId: string
): Promise<{ title: string; content: string; fileType: string | null } | null> {
  const doc = await getDocument(userId, documentId);
  if (!doc) return null;

  const supabase = createServiceClient();

  // If this is a linked strategy doc, fetch content from the source table
  if (doc.sourceType === "strategy" && doc.sourceId) {
    const { data } = await supabase
      .from("strategy_documents")
      .select("title, content")
      .eq("id", doc.sourceId)
      .eq("user_id", userId)
      .single();

    if (data) {
      return {
        title: data.title as string,
        content: data.content as string,
        fileType: "text/markdown",
      };
    }
  }

  // If linked to a generated document (from the documents table)
  if (doc.sourceType === "generated" && doc.sourceId) {
    const { data } = await supabase
      .from("documents")
      .select("title, content")
      .eq("id", doc.sourceId)
      .eq("user_id", userId)
      .single();

    if (data) {
      return {
        title: data.title as string,
        content: data.content as string,
        fileType: "text/markdown",
      };
    }
  }

  // For uploaded files, try to get chunks from uploaded_documents pipeline
  if (doc.sourceType === "upload" && doc.sourceId) {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, chunk_index")
      .eq("document_id", doc.sourceId)
      .order("chunk_index", { ascending: true });

    if (chunks && chunks.length > 0) {
      const fullContent = chunks
        .map((c: Record<string, unknown>) => c.content as string)
        .join("\n\n");

      return {
        title: doc.title,
        content: fullContent,
        fileType: doc.fileType,
      };
    }
  }

  // Fallback: return metadata or minimal info
  return {
    title: doc.title,
    content: doc.description || `[Document: ${doc.title}] — No text content available for review. The file is stored at: ${doc.fileUrl}`,
    fileType: doc.fileType,
  };
}
