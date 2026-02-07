/**
 * IRS Database Operations
 * Phase 03: Pro Tier Features
 */

import { createClient } from '@supabase/supabase-js';
import type { IRSResult, IRSCategory, CategoryScore, Recommendation } from './types';
import { clientEnv, serverEnv } from "@/lib/env";

function getSupabase() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Save IRS result to database
 */
export async function saveIRSResult(
  userId: string,
  result: IRSResult
): Promise<IRSResult> {
  const { data, error } = await getSupabase()
    .from('investor_readiness_scores')
    .insert({
      user_id: userId,
      overall_score: result.overall,
      category_scores: result.categories,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      recommendations: result.recommendations,
      source_documents: result.sourceDocuments,
      startup_context: result.startupContext,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save IRS result: ${error.message}`);
  }

  return mapDbToResult(data);
}

/**
 * Get user's IRS history
 */
export async function getIRSHistory(
  userId: string,
  limit: number = 10
): Promise<IRSResult[]> {
  const { data, error } = await getSupabase()
    .from('investor_readiness_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get IRS history: ${error.message}`);
  }

  return (data || []).map(mapDbToResult);
}

/**
 * Get latest IRS result for user
 */
export async function getLatestIRS(userId: string): Promise<IRSResult | null> {
  const { data, error } = await getSupabase()
    .from('investor_readiness_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get latest IRS: ${error.message}`);
  }

  return mapDbToResult(data);
}

/**
 * Get specific IRS result by ID
 */
export async function getIRSById(
  userId: string,
  irsId: string
): Promise<IRSResult | null> {
  const { data, error } = await getSupabase()
    .from('investor_readiness_scores')
    .select('*')
    .eq('id', irsId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get IRS: ${error.message}`);
  }

  return mapDbToResult(data);
}

/**
 * Delete IRS result
 */
export async function deleteIRS(userId: string, irsId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('investor_readiness_scores')
    .delete()
    .eq('id', irsId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete IRS: ${error.message}`);
  }
}

// Map database row to IRSResult
function mapDbToResult(row: Record<string, unknown>): IRSResult {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    overall: Number(row.overall_score),
    categories: row.category_scores as Record<IRSCategory, CategoryScore>,
    strengths: (row.strengths as string[]) || [],
    weaknesses: (row.weaknesses as string[]) || [],
    recommendations: (row.recommendations as Recommendation[]) || [],
    sourceDocuments: (row.source_documents as string[]) || [],
    startupContext: (row.startup_context as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
  };
}
