/**
 * Strategy Document Database Operations
 * Phase 03: Pro Tier Features
 */

import { createClient } from '@supabase/supabase-js';
import type {
  GeneratedDocument,
  GeneratedSection,
  StrategyDocType,
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Save a generated strategy document to the database.
 */
export async function saveStrategyDocument(
  userId: string,
  doc: GeneratedDocument
): Promise<GeneratedDocument> {
  const { data, error } = await supabase
    .from('strategy_documents')
    .insert({
      user_id: userId,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      sections: doc.sections,
      metadata: {
        wordCount: doc.metadata.wordCount,
        generatedAt: doc.metadata.generatedAt.toISOString(),
        sectionCount: doc.metadata.sectionCount,
      },
      version: doc.version,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save strategy document: ${error.message}`);
  }

  return mapDbToDocument(data);
}

/**
 * List strategy documents for a user with optional filters.
 */
export async function getStrategyDocuments(
  userId: string,
  filters?: { type?: StrategyDocType; limit?: number }
): Promise<GeneratedDocument[]> {
  let query = supabase
    .from('strategy_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get strategy documents: ${error.message}`);
  }

  return (data || []).map(mapDbToDocument);
}

/**
 * Get a single strategy document by ID, scoped to user.
 * Returns null if not found.
 */
export async function getStrategyDocumentById(
  userId: string,
  docId: string
): Promise<GeneratedDocument | null> {
  const { data, error } = await supabase
    .from('strategy_documents')
    .select('*')
    .eq('id', docId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get strategy document: ${error.message}`);
  }

  return mapDbToDocument(data);
}

/**
 * Update a strategy document. Bumps version and sets updated_at.
 */
export async function updateStrategyDocument(
  userId: string,
  docId: string,
  updates: { content?: string; title?: string; sections?: GeneratedSection[] }
): Promise<GeneratedDocument> {
  // First fetch the current document to get the version
  const current = await getStrategyDocumentById(userId, docId);
  if (!current) {
    throw new Error('Strategy document not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    version: (current.version || 1) + 1,
  };

  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.sections !== undefined) updateData.sections = updates.sections;

  const { data, error } = await supabase
    .from('strategy_documents')
    .update(updateData)
    .eq('id', docId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update strategy document: ${error.message}`);
  }

  return mapDbToDocument(data);
}

/**
 * Delete a strategy document with ownership check.
 */
export async function deleteStrategyDocument(
  userId: string,
  docId: string
): Promise<void> {
  const { error } = await supabase
    .from('strategy_documents')
    .delete()
    .eq('id', docId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete strategy document: ${error.message}`);
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Map a database row (snake_case) to a GeneratedDocument (camelCase).
 */
function mapDbToDocument(row: Record<string, unknown>): GeneratedDocument {
  const metadata = (row.metadata as Record<string, unknown>) || {};

  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as StrategyDocType,
    title: row.title as string,
    content: row.content as string,
    sections: (row.sections as GeneratedSection[]) || [],
    metadata: {
      wordCount: Number(metadata.wordCount) || 0,
      generatedAt: metadata.generatedAt
        ? new Date(metadata.generatedAt as string)
        : new Date(row.created_at as string),
      sectionCount: Number(metadata.sectionCount) || 0,
    },
    version: Number(row.version) || 1,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
