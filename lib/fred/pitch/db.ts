/**
 * Pitch Review Database Operations
 * Phase 03: Pro Tier Features
 */

import { createClient } from '@supabase/supabase-js';
import type { PitchReview, SlideAnalysis, SlideType } from './types';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Save pitch review result to database
 */
export async function savePitchReview(
  userId: string,
  review: PitchReview
): Promise<PitchReview> {
  const { data, error } = await getSupabase()
    .from('pitch_reviews')
    .insert({
      user_id: userId,
      document_id: review.documentId,
      overall_score: review.overallScore,
      structure_score: review.structureScore,
      content_score: review.contentScore,
      slides: review.slides,
      missing_sections: review.missingSections,
      strengths: review.strengths,
      improvements: review.improvements,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save pitch review: ${error.message}`);
  }

  return mapDbToReview(data);
}

/**
 * Get a specific pitch review by ID
 */
export async function getPitchReview(
  userId: string,
  reviewId: string
): Promise<PitchReview | null> {
  const { data, error } = await getSupabase()
    .from('pitch_reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get pitch review: ${error.message}`);
  }

  return mapDbToReview(data);
}

/**
 * Get user's pitch reviews list (newest first)
 */
export async function getPitchReviews(
  userId: string,
  limit: number = 10
): Promise<PitchReview[]> {
  const { data, error } = await getSupabase()
    .from('pitch_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get pitch reviews: ${error.message}`);
  }

  return (data || []).map(mapDbToReview);
}

/**
 * Get latest review for a specific document
 */
export async function getPitchReviewByDocument(
  userId: string,
  documentId: string
): Promise<PitchReview | null> {
  const { data, error } = await getSupabase()
    .from('pitch_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get pitch review by document: ${error.message}`);
  }

  return mapDbToReview(data);
}

// Map database row to PitchReview
function mapDbToReview(row: Record<string, unknown>): PitchReview {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    documentId: row.document_id as string,
    overallScore: Number(row.overall_score),
    structureScore: Number(row.structure_score),
    contentScore: Number(row.content_score),
    slides: (row.slides as SlideAnalysis[]) || [],
    missingSections: (row.missing_sections as SlideType[]) || [],
    strengths: (row.strengths as string[]) || [],
    improvements: (row.improvements as string[]) || [],
    createdAt: new Date(row.created_at as string),
  };
}
