/**
 * Boardy Matches Database Operations
 * Phase 04: Studio Tier Features - Plan 06
 *
 * CRUD operations for the boardy_matches table.
 * Follows the pattern from lib/db/agent-tasks.ts using Supabase client.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  BoardyMatch,
  BoardyMatchType,
  BoardyMatchStatus,
} from "@/lib/boardy/types";

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Create
// ============================================================================

/**
 * Create a new Boardy match record
 */
export async function createMatch(params: {
  userId: string;
  matchType: BoardyMatchType;
  matchName: string;
  matchDescription: string;
  matchScore: number;
  status: BoardyMatchStatus;
  boardyReferenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<BoardyMatch> {
  const { data, error } = await supabase
    .from("boardy_matches")
    .insert({
      user_id: params.userId,
      match_type: params.matchType,
      match_name: params.matchName,
      match_description: params.matchDescription,
      match_score: params.matchScore,
      status: params.status,
      boardy_reference_id: params.boardyReferenceId || null,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create boardy match: ${error.message}`);
  }

  return mapBoardyMatch(data);
}

// ============================================================================
// Read
// ============================================================================

/**
 * Get matches for a user with optional filters
 */
export async function getMatches(
  userId: string,
  opts?: {
    matchType?: BoardyMatchType;
    status?: BoardyMatchStatus;
    limit?: number;
  }
): Promise<BoardyMatch[]> {
  try {
    let query = supabase
      .from("boardy_matches")
      .select("*")
      .eq("user_id", userId)
      .order("match_score", { ascending: false });

    if (opts?.matchType) {
      query = query.eq("match_type", opts.matchType);
    }
    if (opts?.status) {
      query = query.eq("status", opts.status);
    }
    // Always apply a limit to prevent unbounded queries
    query = query.limit(opts?.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      // PGRST205 = table doesn't exist (migrations not applied)
      if (error.code === 'PGRST205' || error.message?.includes('relation') || error.code === '42P01') {
        console.warn('[getMatches] Table does not exist, returning empty array');
        return [];
      }
      throw new Error(`Failed to get boardy matches: ${error.message}`);
    }

    return (data || []).map(mapBoardyMatch);
  } catch (err) {
    // Gracefully handle missing table or connection issues
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('PGRST205')) {
      console.warn('[getMatches] Table does not exist, returning empty array');
      return [];
    }
    throw err;
  }
}

// ============================================================================
// Update
// ============================================================================

/**
 * Update the status of a match
 */
export async function updateMatchStatus(
  matchId: string,
  status: BoardyMatchStatus
): Promise<BoardyMatch> {
  const { data, error } = await supabase
    .from("boardy_matches")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update boardy match status: ${error.message}`);
  }

  return mapBoardyMatch(data);
}

// ============================================================================
// Delete
// ============================================================================

/**
 * Delete matches by status for a user (used for refresh - delete old suggestions)
 */
export async function deleteMatchesByStatus(
  userId: string,
  status: BoardyMatchStatus,
  olderThanHours: number = 1
): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("boardy_matches")
    .delete()
    .eq("user_id", userId)
    .eq("status", status)
    .lt("created_at", cutoff);

  if (error) {
    throw new Error(`Failed to delete boardy matches: ${error.message}`);
  }
}

/**
 * Get a single match by ID (for ownership verification)
 */
export async function getMatchById(
  matchId: string
): Promise<BoardyMatch | null> {
  const { data, error } = await supabase
    .from("boardy_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get boardy match: ${error.message}`);
  }

  return mapBoardyMatch(data);
}

// ============================================================================
// Mapper
// ============================================================================

/**
 * Map database row to BoardyMatch interface
 */
function mapBoardyMatch(row: Record<string, unknown>): BoardyMatch {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    matchType: row.match_type as BoardyMatchType,
    matchName: (row.match_name as string) || "",
    matchDescription: (row.match_description as string) || "",
    matchScore: (row.match_score as number) || 0,
    status: row.status as BoardyMatchStatus,
    boardyReferenceId: row.boardy_reference_id as string | undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
