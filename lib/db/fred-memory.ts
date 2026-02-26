/**
 * FRED Memory Access Functions
 *
 * Provides CRUD operations for FRED's three-layer memory architecture:
 * - Episodic Memory: Conversation history, decisions, outcomes
 * - Semantic Memory: Learned facts, user/startup knowledge
 * - Procedural Memory: Decision frameworks, action templates
 */

import { createServiceClient } from "@/lib/supabase/server";
import { MEMORY_CONFIG, type MemoryTier } from "@/lib/constants";

// ============================================================================
// Async Embedding Generation (fire-and-forget)
// ============================================================================

/**
 * Fire-and-forget embedding generation for a stored episode.
 * Generates an embedding for the text content and updates the row.
 * Never throws — logs warnings on failure.
 */
function fireEmbeddingGeneration(episodeId: string, text: string): void {
  (async () => {
    try {
      const { generateEmbedding } = await import("@/lib/ai/fred-client");
      // Truncate to 8000 chars to stay within embedding model limits
      const truncated = text.slice(0, 8000);
      const result = await generateEmbedding(truncated);
      const supabase = createServiceClient();
      const { error } = await supabase
        .from("fred_episodic_memory")
        .update({ embedding: result.embedding })
        .eq("id", episodeId);
      if (error) {
        console.warn("[FRED Memory] Failed to update episode embedding:", error.message);
      }
    } catch (error) {
      console.warn("[FRED Memory] Async embedding generation failed (non-blocking):", error);
    }
  })();
}

// ============================================================================
// Types
// ============================================================================

export type EpisodeEventType = "conversation" | "decision" | "outcome" | "feedback";

export type SemanticCategory =
  | "startup_facts"
  | "user_preferences"
  | "market_knowledge"
  | "team_info"
  | "investor_info"
  | "product_details"
  | "metrics"
  | "goals"
  | "challenges"
  | "decisions";

export type ProcedureType =
  | "decision_framework"
  | "action_template"
  | "analysis_pattern"
  | "scoring_model"
  | "assessment_rubric";

export interface EpisodicMemory {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EpisodeEventType;
  content: Record<string, unknown>;
  embedding?: number[];
  importanceScore: number;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface SemanticMemory {
  id: string;
  userId: string;
  category: SemanticCategory;
  key: string;
  value: Record<string, unknown>;
  embedding?: number[];
  confidence: number;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProceduralMemory {
  id: string;
  name: string;
  description?: string;
  procedureType: ProcedureType;
  steps: Array<{
    step: number;
    name: string;
    description: string;
    action?: string;
    expectedOutput?: string;
  }>;
  triggers?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  successRate: number;
  usageCount: number;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecisionLog {
  id: string;
  userId: string;
  sessionId: string;
  decisionType: "auto" | "recommended" | "escalated";
  inputContext: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  scores?: Record<string, number>;
  recommendation?: Record<string, unknown>;
  finalDecision?: Record<string, unknown>;
  outcome?: Record<string, unknown>;
  outcomeScore?: number;
  procedureUsed?: string;
  confidence?: number;
  createdAt: Date;
  decidedAt?: Date;
  outcomeRecordedAt?: Date;
}

// ============================================================================
// Episodic Memory Operations
// ============================================================================

/**
 * Store a new episode in episodic memory
 */
export async function storeEpisode(
  userId: string,
  sessionId: string,
  eventType: EpisodeEventType,
  content: Record<string, unknown>,
  options: {
    embedding?: number[];
    importanceScore?: number;
    metadata?: Record<string, unknown>;
    channel?: string;
  } = {}
): Promise<EpisodicMemory> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_episodic_memory")
    .insert({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      content,
      channel: options.channel ?? "chat",
      embedding: options.embedding,
      importance_score: options.importanceScore ?? 0.5,
      metadata: options.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[FRED Memory] Error storing episode:", error);
    throw error;
  }

  const episode = transformEpisodicRow(data);

  // Fire-and-forget: generate embedding for episodes with text content.
  // Only for user/assistant messages that have a string content field.
  if (!options.embedding && content && typeof content.content === "string" && content.content.length > 0) {
    fireEmbeddingGeneration(episode.id, content.content as string);
  }

  return episode;
}

/**
 * Retrieve recent episodes for a user
 */
export async function retrieveRecentEpisodes(
  userId: string,
  options: {
    limit?: number;
    sessionId?: string;
    eventType?: EpisodeEventType;
  } = {}
): Promise<EpisodicMemory[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("fred_episodic_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 10);

  if (options.sessionId) {
    query = query.eq("session_id", options.sessionId);
  }

  if (options.eventType) {
    query = query.eq("event_type", options.eventType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FRED Memory] Error retrieving episodes:", error);
    throw error;
  }

  return (data || []).map(transformEpisodicRow);
}

/**
 * Search episodes by embedding similarity
 */
export async function searchEpisodesByEmbedding(
  userId: string,
  embedding: number[],
  options: {
    limit?: number;
    similarityThreshold?: number;
  } = {}
): Promise<Array<EpisodicMemory & { similarity: number }>> {
  const supabase = createServiceClient();

  // Use Supabase's RPC for vector similarity search
  const { data, error } = await supabase.rpc("search_episodic_memory", {
    query_embedding: embedding,
    match_user_id: userId,
    match_threshold: options.similarityThreshold ?? 0.7,
    match_count: options.limit ?? 5,
  });

  if (error) {
    // If the function doesn't exist yet, fall back to regular query
    console.warn("[FRED Memory] Vector search RPC not available, using fallback:", error.message);
    const episodes = await retrieveRecentEpisodes(userId, { limit: options.limit ?? 5 });
    return episodes.map((e) => ({ ...e, similarity: 0 }));
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    ...transformEpisodicRow(row),
    similarity: row.similarity as number,
  }));
}

/**
 * Update importance score for an episode
 */
export async function updateEpisodeImportance(
  episodeId: string,
  importanceScore: number
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_episodic_memory")
    .update({ importance_score: importanceScore })
    .eq("id", episodeId);

  if (error) {
    console.error("[FRED Memory] Error updating episode importance:", error);
    throw error;
  }
}

// ============================================================================
// Semantic Memory Operations
// ============================================================================

/**
 * Store or update a fact in semantic memory
 */
export async function storeFact(
  userId: string,
  category: SemanticCategory,
  key: string,
  value: Record<string, unknown>,
  options: {
    embedding?: number[];
    confidence?: number;
    source?: string;
  } = {}
): Promise<SemanticMemory> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_semantic_memory")
    .upsert(
      {
        user_id: userId,
        category,
        key,
        value,
        embedding: options.embedding,
        confidence: options.confidence ?? 1.0,
        source: options.source,
      },
      {
        onConflict: "user_id,category,key",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("[FRED Memory] Error storing fact:", error);
    throw error;
  }

  return transformSemanticRow(data);
}

/**
 * Get a specific fact from semantic memory
 */
export async function getFact(
  userId: string,
  category: SemanticCategory,
  key: string
): Promise<SemanticMemory | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_semantic_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    console.error("[FRED Memory] Error getting fact:", error);
    throw error;
  }

  return data ? transformSemanticRow(data) : null;
}

/**
 * Get all facts in a category for a user
 */
export async function getFactsByCategory(
  userId: string,
  category: SemanticCategory
): Promise<SemanticMemory[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_semantic_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[FRED Memory] Error getting facts by category:", error);
    throw error;
  }

  return (data || []).map(transformSemanticRow);
}

/**
 * Search facts by embedding similarity
 */
export async function searchFactsByEmbedding(
  userId: string,
  embedding: number[],
  options: {
    limit?: number;
    similarityThreshold?: number;
    category?: SemanticCategory;
  } = {}
): Promise<Array<SemanticMemory & { similarity: number }>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("search_semantic_memory", {
    query_embedding: embedding,
    match_user_id: userId,
    match_threshold: options.similarityThreshold ?? 0.7,
    match_count: options.limit ?? 5,
    match_category: options.category,
  });

  if (error) {
    console.warn("[FRED Memory] Vector search RPC not available, using fallback:", error.message);
    const facts = options.category
      ? await getFactsByCategory(userId, options.category)
      : [];
    return facts.slice(0, options.limit ?? 5).map((f) => ({ ...f, similarity: 0 }));
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    ...transformSemanticRow(row),
    similarity: row.similarity as number,
  }));
}

/**
 * Delete a fact from semantic memory
 */
export async function deleteFact(
  userId: string,
  category: SemanticCategory,
  key: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_semantic_memory")
    .delete()
    .eq("user_id", userId)
    .eq("category", category)
    .eq("key", key);

  if (error) {
    console.error("[FRED Memory] Error deleting fact:", error);
    throw error;
  }
}

/**
 * Short-lived cache for getAllUserFacts to avoid duplicate DB queries
 * within a single request cycle. TTL of 5 seconds ensures freshness
 * across separate requests while deduplicating calls within one.
 */
const factsCache = new Map<string, { data: SemanticMemory[]; expiry: number }>();

/**
 * Get all semantic memory for a user (for context building).
 * Results are cached for 5s to deduplicate calls within a single request.
 */
export async function getAllUserFacts(userId: string): Promise<SemanticMemory[]> {
  const cached = factsCache.get(userId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_semantic_memory")
    .select("*")
    .eq("user_id", userId)
    .order("category")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[FRED Memory] Error getting all user facts:", error);
    throw error;
  }

  const result = (data || []).map(transformSemanticRow);
  factsCache.set(userId, { data: result, expiry: Date.now() + 5000 });
  return result;
}

// ============================================================================
// Procedural Memory Operations
// ============================================================================

/**
 * Get a procedure by name
 */
export async function getProcedure(name: string): Promise<ProceduralMemory | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_procedural_memory")
    .select("*")
    .eq("name", name)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[FRED Memory] Error getting procedure:", error);
    throw error;
  }

  return data ? transformProceduralRow(data) : null;
}

/**
 * Get all procedures of a specific type
 */
export async function getProceduresByType(
  procedureType: ProcedureType
): Promise<ProceduralMemory[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_procedural_memory")
    .select("*")
    .eq("procedure_type", procedureType)
    .eq("is_active", true)
    .order("usage_count", { ascending: false });

  if (error) {
    console.error("[FRED Memory] Error getting procedures by type:", error);
    throw error;
  }

  return (data || []).map(transformProceduralRow);
}

/**
 * Get all active procedures
 */
export async function getAllProcedures(): Promise<ProceduralMemory[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_procedural_memory")
    .select("*")
    .eq("is_active", true)
    .order("procedure_type")
    .order("name");

  if (error) {
    console.error("[FRED Memory] Error getting all procedures:", error);
    throw error;
  }

  return (data || []).map(transformProceduralRow);
}

/**
 * Record usage of a procedure and update success rate
 */
export async function recordProcedureUsage(
  name: string,
  success: boolean
): Promise<void> {
  const supabase = createServiceClient();

  // First get current stats
  const { data: current, error: fetchError } = await supabase
    .from("fred_procedural_memory")
    .select("usage_count, success_rate")
    .eq("name", name)
    .single();

  if (fetchError) {
    console.error("[FRED Memory] Error fetching procedure for usage update:", fetchError);
    throw fetchError;
  }

  // Calculate new success rate (exponential moving average)
  const alpha = 0.1; // Weight for new observations
  const currentRate = current.success_rate ?? 0.5;
  const newRate = currentRate * (1 - alpha) + (success ? 1 : 0) * alpha;

  // Update the procedure
  const { error: updateError } = await supabase
    .from("fred_procedural_memory")
    .update({
      usage_count: (current.usage_count ?? 0) + 1,
      success_rate: newRate,
    })
    .eq("name", name);

  if (updateError) {
    console.error("[FRED Memory] Error updating procedure usage:", updateError);
    throw updateError;
  }
}

// ============================================================================
// Decision Log Operations
// ============================================================================

/**
 * Log a new decision
 */
export async function logDecision(
  userId: string,
  sessionId: string,
  data: {
    decisionType: "auto" | "recommended" | "escalated";
    inputContext: Record<string, unknown>;
    analysis?: Record<string, unknown>;
    scores?: Record<string, number>;
    recommendation?: Record<string, unknown>;
    procedureUsed?: string;
    confidence?: number;
  }
): Promise<DecisionLog> {
  const supabase = createServiceClient();

  const { data: result, error } = await supabase
    .from("fred_decision_log")
    .insert({
      user_id: userId,
      session_id: sessionId,
      decision_type: data.decisionType,
      input_context: data.inputContext,
      analysis: data.analysis,
      scores: data.scores,
      recommendation: data.recommendation,
      procedure_used: data.procedureUsed,
      confidence: data.confidence,
    })
    .select()
    .single();

  if (error) {
    console.error("[FRED Memory] Error logging decision:", error);
    throw error;
  }

  return transformDecisionRow(result);
}

/**
 * Record the final decision (may differ from recommendation if escalated)
 */
export async function recordFinalDecision(
  decisionId: string,
  finalDecision: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_decision_log")
    .update({
      final_decision: finalDecision,
      decided_at: new Date().toISOString(),
    })
    .eq("id", decisionId);

  if (error) {
    console.error("[FRED Memory] Error recording final decision:", error);
    throw error;
  }
}

/**
 * Record the outcome of a decision
 */
export async function recordDecisionOutcome(
  decisionId: string,
  outcome: Record<string, unknown>,
  outcomeScore?: number
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_decision_log")
    .update({
      outcome,
      outcome_score: outcomeScore,
      outcome_recorded_at: new Date().toISOString(),
    })
    .eq("id", decisionId);

  if (error) {
    console.error("[FRED Memory] Error recording decision outcome:", error);
    throw error;
  }
}

/**
 * Get recent decisions for a user
 */
export async function getRecentDecisions(
  userId: string,
  options: {
    limit?: number;
    decisionType?: "auto" | "recommended" | "escalated";
    withOutcome?: boolean;
  } = {}
): Promise<DecisionLog[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("fred_decision_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 10);

  if (options.decisionType) {
    query = query.eq("decision_type", options.decisionType);
  }

  if (options.withOutcome === true) {
    query = query.not("outcome", "is", null);
  } else if (options.withOutcome === false) {
    query = query.is("outcome", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FRED Memory] Error getting recent decisions:", error);
    throw error;
  }

  return (data || []).map(transformDecisionRow);
}

// ============================================================================
// Retention Enforcement (Phase 32-02)
// ============================================================================

/**
 * Enforce tier-based memory retention limits.
 * Deletes episodic memories that exceed the tier's retention window or item cap.
 */
export async function enforceRetentionLimits(
  userId: string,
  tier: MemoryTier
): Promise<number> {
  const config = MEMORY_CONFIG[tier];
  const supabase = createServiceClient();
  let deletedCount = 0;

  // For Free tier (0 days retention), delete all episodic memories
  if (config.retentionDays === 0) {
    const { data } = await supabase
      .from("fred_episodic_memory")
      .delete()
      .eq("user_id", userId)
      .select("id");
    deletedCount += data?.length ?? 0;
    return deletedCount;
  }

  // Delete episodes older than retention period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.retentionDays);
  const { data: expired } = await supabase
    .from("fred_episodic_memory")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoff.toISOString())
    .select("id");
  deletedCount += expired?.length ?? 0;

  // Delete excess episodes beyond maxEpisodicItems (keep newest)
  if (config.maxEpisodicItems > 0) {
    const { data: all } = await supabase
      .from("fred_episodic_memory")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (all && all.length > config.maxEpisodicItems) {
      const idsToDelete = all.slice(config.maxEpisodicItems).map((r) => r.id);
      const { data: removed } = await supabase
        .from("fred_episodic_memory")
        .delete()
        .in("id", idsToDelete)
        .select("id");
      deletedCount += removed?.length ?? 0;
    }
  }

  return deletedCount;
}

// ============================================================================
// Transform Functions (snake_case -> camelCase)
// ============================================================================

function transformEpisodicRow(row: Record<string, unknown>): EpisodicMemory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sessionId: row.session_id as string,
    eventType: row.event_type as EpisodeEventType,
    content: row.content as Record<string, unknown>,
    embedding: row.embedding as number[] | undefined,
    importanceScore: row.importance_score as number,
    createdAt: new Date(row.created_at as string),
    metadata: (row.metadata || {}) as Record<string, unknown>,
  };
}

function transformSemanticRow(row: Record<string, unknown>): SemanticMemory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as SemanticCategory,
    key: row.key as string,
    value: row.value as Record<string, unknown>,
    embedding: row.embedding as number[] | undefined,
    confidence: row.confidence as number,
    source: row.source as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function transformProceduralRow(row: Record<string, unknown>): ProceduralMemory {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    procedureType: row.procedure_type as ProcedureType,
    steps: (row.steps || []) as ProceduralMemory["steps"],
    triggers: row.triggers as Record<string, unknown> | undefined,
    inputSchema: row.input_schema as Record<string, unknown> | undefined,
    outputSchema: row.output_schema as Record<string, unknown> | undefined,
    successRate: row.success_rate as number,
    usageCount: row.usage_count as number,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function transformDecisionRow(row: Record<string, unknown>): DecisionLog {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sessionId: row.session_id as string,
    decisionType: row.decision_type as DecisionLog["decisionType"],
    inputContext: row.input_context as Record<string, unknown>,
    analysis: row.analysis as Record<string, unknown> | undefined,
    scores: row.scores as Record<string, number> | undefined,
    recommendation: row.recommendation as Record<string, unknown> | undefined,
    finalDecision: row.final_decision as Record<string, unknown> | undefined,
    outcome: row.outcome as Record<string, unknown> | undefined,
    outcomeScore: row.outcome_score as number | undefined,
    procedureUsed: row.procedure_used as string | undefined,
    confidence: row.confidence as number | undefined,
    createdAt: new Date(row.created_at as string),
    decidedAt: row.decided_at ? new Date(row.decided_at as string) : undefined,
    outcomeRecordedAt: row.outcome_recorded_at ? new Date(row.outcome_recorded_at as string) : undefined,
  };
}
