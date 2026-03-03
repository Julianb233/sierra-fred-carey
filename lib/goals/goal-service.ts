/**
 * Goal Service — Data layer for structured goal sets
 *
 * Manages founder goal roadmaps stored in the founder_goals table.
 * Goals are generated based on the founder's funding stage and
 * displayed on the dashboard as a personalized roadmap.
 *
 * Linear: AI-1283
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getGoalSetForStage, type FundingStage } from "./goal-sets";

// ============================================================================
// Types
// ============================================================================

export interface FounderGoal {
  id: string;
  userId: string;
  stage: string;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all goals for a user, ordered by sort_order.
 */
export async function getFounderGoals(userId: string): Promise<FounderGoal[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("founder_goals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Goals] Failed to fetch:", error);
    return [];
  }

  return (data || []).map(mapRow);
}

/**
 * Generate and store goal set for a user based on their funding stage.
 * If goals already exist for the user, returns existing goals (no overwrite).
 * Pass `force: true` to regenerate (deletes existing goals first).
 */
export async function generateGoalSet(
  userId: string,
  stage: string | null,
  options?: { force?: boolean }
): Promise<FounderGoal[]> {
  const supabase = createServiceClient();

  // Check for existing goals
  const { data: existing, error: checkError } = await supabase
    .from("founder_goals")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (checkError) {
    console.error("[Goals] Failed to check existing:", checkError);
    return [];
  }

  if (existing && existing.length > 0 && !options?.force) {
    return getFounderGoals(userId);
  }

  // If forcing, delete existing goals first
  if (options?.force && existing && existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("founder_goals")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[Goals] Failed to delete existing:", deleteError);
      return [];
    }
  }

  // Generate goals from the stage definition
  const goalSet = getGoalSetForStage(stage);
  const inserts = goalSet.goals.map((goal) => ({
    user_id: userId,
    stage: goalSet.stage,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    sort_order: goal.order,
    completed: false,
  }));

  const { data, error } = await supabase
    .from("founder_goals")
    .insert(inserts)
    .select("*");

  if (error) {
    console.error("[Goals] Failed to store:", error);
    return [];
  }

  return (data || []).map(mapRow);
}

/**
 * Toggle a goal's completion status.
 */
export async function toggleGoalComplete(
  userId: string,
  goalId: string,
  completed: boolean
): Promise<FounderGoal | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("founder_goals")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("[Goals] Failed to toggle:", error);
    return null;
  }

  return mapRow(data);
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRow(row: Record<string, unknown>): FounderGoal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    stage: row.stage as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    sortOrder: row.sort_order as number,
    completed: (row.completed as boolean) || false,
    completedAt: (row.completed_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
