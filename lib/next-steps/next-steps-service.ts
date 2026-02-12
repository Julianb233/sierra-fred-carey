/**
 * Next Steps Service — Data layer for Phase 43
 *
 * Manages next steps extracted from FRED conversations.
 * Steps are parsed from the "Next 3 Actions" block that FRED
 * appends to every substantive response.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export type StepPriority = "critical" | "important" | "optional";

export interface NextStep {
  id: string;
  userId: string;
  description: string;
  whyItMatters: string | null;
  priority: StepPriority;
  sourceConversationDate: string | null;
  completed: boolean;
  completedAt: string | null;
  dismissed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NextStepInsert {
  userId: string;
  description: string;
  whyItMatters?: string;
  priority?: StepPriority;
  sourceConversationDate?: string;
}

export interface GroupedNextSteps {
  critical: NextStep[];
  important: NextStep[];
  optional: NextStep[];
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all next steps for a user, grouped by priority.
 * Excludes dismissed steps. Returns { critical, important, optional }.
 */
export async function getNextSteps(userId: string): Promise<GroupedNextSteps> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("next_steps")
    .select("*")
    .eq("user_id", userId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[NextSteps] Failed to fetch:", error);
    throw new Error("Failed to fetch next steps");
  }

  const steps = (data || []).map(mapRow);

  return {
    critical: steps.filter((s) => s.priority === "critical"),
    important: steps.filter((s) => s.priority === "important"),
    optional: steps.filter((s) => s.priority === "optional"),
  };
}

/**
 * Mark a next step as complete.
 */
export async function markComplete(
  userId: string,
  stepId: string
): Promise<NextStep> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("next_steps")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", stepId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("[NextSteps] Failed to mark complete:", error);
    throw new Error("Failed to mark step complete");
  }

  return mapRow(data);
}

/**
 * Mark a next step as incomplete (undo).
 */
export async function markIncomplete(
  userId: string,
  stepId: string
): Promise<NextStep> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("next_steps")
    .update({
      completed: false,
      completed_at: null,
    })
    .eq("id", stepId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("[NextSteps] Failed to mark incomplete:", error);
    throw new Error("Failed to mark step incomplete");
  }

  return mapRow(data);
}

// ============================================================================
// Extraction & Storage
// ============================================================================

/**
 * Dismiss a next step (soft-hide from UI).
 */
export async function dismissStep(
  userId: string,
  stepId: string
): Promise<NextStep> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("next_steps")
    .update({ dismissed: true })
    .eq("id", stepId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("[NextSteps] Failed to dismiss:", error);
    throw new Error("Failed to dismiss step");
  }

  return mapRow(data);
}

/**
 * Extract "Next 3 Actions" from a FRED response and store them.
 * Called after FRED responds to auto-capture action items.
 */
export async function extractAndStoreNextSteps(
  userId: string,
  responseText: string,
  sourceConversationDate: string | null
): Promise<NextStep[]> {
  const extracted = extractNextActions(responseText);
  if (extracted.length === 0) return [];

  const supabase = createServiceClient();

  // Deduplicate: check if identical descriptions already exist (active only)
  const { data: existing } = await supabase
    .from("next_steps")
    .select("description")
    .eq("user_id", userId)
    .eq("completed", false)
    .eq("dismissed", false);

  const existingDescriptions = new Set(
    (existing || []).map((r: { description: string }) =>
      r.description.toLowerCase().trim()
    )
  );

  const newSteps = extracted.filter(
    (step) => !existingDescriptions.has(step.description.toLowerCase().trim())
  );

  if (newSteps.length === 0) return [];

  const inserts = newSteps.map((step, index) => ({
    user_id: userId,
    description: step.description,
    why_it_matters: step.whyItMatters || null,
    priority: prioritizeStep(index, newSteps.length),
    source_conversation_date: sourceConversationDate,
    completed: false,
    dismissed: false,
  }));

  const { data, error } = await supabase
    .from("next_steps")
    .insert(inserts)
    .select("*");

  if (error) {
    console.error("[NextSteps] Failed to store:", error);
    return [];
  }

  return (data || []).map(mapRow);
}

/**
 * Extract Next 3 Actions from FRED response text.
 * Matches the pattern:
 *   **Next 3 Actions:**
 *   1. Do X
 *   2. Do Y
 *   3. Do Z
 *
 * Also attempts to extract "why it matters" if the action item
 * contains a dash or colon separator (e.g., "Do X -- this will help...")
 */
function extractNextActions(
  text: string
): Array<{ description: string; whyItMatters: string | null }> {
  const marker = /\*?\*?Next 3 [Aa]ctions:?\*?\*?\s*\n/i;
  const match = text.match(marker);
  if (!match || match.index === undefined) return [];

  const afterMarker = text.slice(match.index + match[0].length);
  const lines = afterMarker.split("\n");
  const actions: Array<{ description: string; whyItMatters: string | null }> =
    [];

  for (const line of lines) {
    const trimmed = line.trim();
    const itemMatch = trimmed.match(/^(?:\d+\.\s*|-\s*\*?\*?)(.+)/);
    if (itemMatch) {
      const fullText = itemMatch[1].trim().replace(/\*+$/g, "").trim();

      // Try to split description from "why it matters"
      const separatorMatch = fullText.match(
        /^(.+?)(?:\s*[-—]\s+|\s*:\s+)(.+)$/
      );
      if (separatorMatch && separatorMatch[2].length > 20) {
        actions.push({
          description: separatorMatch[1].trim(),
          whyItMatters: separatorMatch[2].trim(),
        });
      } else {
        actions.push({ description: fullText, whyItMatters: null });
      }

      if (actions.length >= 3) break;
    } else if (trimmed === "" && actions.length > 0) {
      break;
    } else if (trimmed !== "" && actions.length === 0) {
      continue;
    } else {
      break;
    }
  }

  return actions;
}

/**
 * Assign priority based on position in the list.
 * First action = critical, second = important, third = optional.
 */
function prioritizeStep(index: number, _total: number): StepPriority {
  if (index === 0) return "critical";
  if (index === 1) return "important";
  return "optional";
}

// ============================================================================
// Row Mapper
// ============================================================================

function mapRow(row: Record<string, unknown>): NextStep {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    description: row.description as string,
    whyItMatters: (row.why_it_matters as string) || null,
    priority: (row.priority as StepPriority) || "optional",
    sourceConversationDate: (row.source_conversation_date as string) || null,
    completed: (row.completed as boolean) || false,
    completedAt: (row.completed_at as string) || null,
    dismissed: (row.dismissed as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
