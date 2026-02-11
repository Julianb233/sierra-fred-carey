/**
 * Conversation State Data Access Layer
 *
 * CRUD operations for fred_conversation_state and fred_step_evidence tables.
 * Tracks where each founder is in the 9-Step Startup Process so FRED can
 * deliver step-appropriate mentoring.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { sanitizeUserInput } from "@/lib/ai/guards/prompt-guard";
import type { StartupStep, StepStatus } from "@/lib/ai/frameworks/startup-process";
import { STEP_ORDER, createInitialState } from "@/lib/ai/frameworks/startup-process";

// ============================================================================
// Types
// ============================================================================

export type EvidenceType =
  | "required_output"
  | "supporting_fact"
  | "kill_signal"
  | "blocker"
  | "user_statement"
  | "validation_result";

export type EvidenceSource = "conversation" | "document" | "inferred" | "user_confirmed";

export type ProcessStatus = "active" | "paused" | "completed" | "abandoned";

// ============================================================================
// Wave 3 Types: Reality Lens Gate + Diagnostic Mode
// ============================================================================

/** Reality Lens dimension names (matches REALITY_LENS_FACTORS in schemas/reality-lens.ts) */
export type RealityLensDimension = "feasibility" | "economics" | "demand" | "distribution" | "timing";

/** Validation status for a single RL dimension */
export type RLGateStatus = "not_assessed" | "assumed" | "weak" | "validated";

/** Per-dimension gate state */
export interface RLDimensionGate {
  status: RLGateStatus;
  blockers: string[];
  lastAssessedAt: string | null;
}

/** Full Reality Lens gate state across all 5 dimensions */
export type RealityLensGate = Record<RealityLensDimension, RLDimensionGate>;

/** Diagnostic mode (matches DiagnosticMode in lib/ai/diagnostic-engine.ts) */
export type ActiveMode = "founder-os" | "positioning" | "investor-readiness";

/** Framework introduction state for a single framework */
export interface FrameworkIntroductionState {
  introduced: boolean;
  introducedAt: string | null;
  trigger: string | null;
}

/** Signal history entry (capped at 20 in application layer) */
export interface SignalHistoryEntry {
  signal: string;
  framework: "positioning" | "investor";
  detectedAt: string;
  context: string;
}

/** Mode context — signal history, introduction state, assessment tracking */
export interface ModeContext {
  activatedAt: string | null;
  activatedBy: string | null;
  introductionState: {
    positioning: FrameworkIntroductionState;
    investor: FrameworkIntroductionState;
  };
  signalHistory: SignalHistoryEntry[];
  formalAssessments: { offered: boolean; accepted: boolean };
}

/** All 5 RL dimensions */
export const REALITY_LENS_DIMENSIONS: RealityLensDimension[] = [
  "feasibility", "economics", "demand", "distribution", "timing",
];

/** Silent diagnostic tags from early messages (Operating Bible 5.2) */
export interface DiagnosticTags {
  positioningClarity?: "low" | "med" | "high";
  investorReadinessSignal?: "low" | "med" | "high";
  stage?: "idea" | "pre-seed" | "seed" | "growth";
  primaryConstraint?: "demand" | "distribution" | "product_depth" | "execution" | "team" | "focus";
}

/** Founder context snapshot (Operating Bible Section 12) */
export interface FounderSnapshot {
  stage?: string;
  productStatus?: string;
  traction?: string;
  runway?: { time?: string; money?: string; energy?: string };
  primaryConstraint?: string;
  ninetyDayGoal?: string;
}

export interface ConversationState {
  id: string;
  userId: string;
  currentStep: StartupStep;
  stepStatuses: Record<StartupStep, StepStatus>;
  processStatus: ProcessStatus;
  currentBlockers: string[];
  diagnosticTags: DiagnosticTags;
  founderSnapshot: FounderSnapshot;
  // Wave 3: Reality Lens gate + diagnostic mode
  realityLensGate: RealityLensGate;
  activeMode: ActiveMode;
  modeContext: ModeContext;
  lastTransitionAt: Date | null;
  lastTransitionFrom: string | null;
  lastTransitionTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepEvidence {
  id: string;
  userId: string;
  step: StartupStep;
  evidenceType: EvidenceType;
  content: string;
  metadata: Record<string, unknown>;
  semanticMemoryId: string | null;
  confidence: number;
  source: EvidenceSource;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepProgress {
  userId: string;
  currentStep: StartupStep;
  processStatus: ProcessStatus;
  stepStatuses: Record<StartupStep, StepStatus>;
  currentBlockers: string[];
  stateUpdatedAt: Date;
  evidenceCounts: Record<string, number>;
}

// ============================================================================
// Conversation State Operations
// ============================================================================

/**
 * Get or create the conversation state for a user.
 * Returns existing state or creates a fresh one starting at step 1.
 */
export async function getOrCreateConversationState(
  userId: string
): Promise<ConversationState> {
  const supabase = createServiceClient();

  // Try to get existing state
  const { data: existing, error: selectError } = await supabase
    .from("fred_conversation_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing && !selectError) {
    return transformStateRow(existing);
  }

  // Create initial state
  const initialState = createInitialState();
  const stepStatuses: Record<string, string> = {};
  for (const step of STEP_ORDER) {
    stepStatuses[step] = initialState.steps[step].status;
  }

  const { data, error } = await supabase
    .from("fred_conversation_state")
    .insert({
      user_id: userId,
      current_step: initialState.currentStep,
      step_statuses: stepStatuses,
      process_status: "active",
      current_blockers: [],
    })
    .select()
    .single();

  if (error) {
    // Race condition: another request created it first
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("fred_conversation_state")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (retry) return transformStateRow(retry);
    }
    console.error("[ConvState] Error creating conversation state:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Get the conversation state for a user. Returns null if none exists.
 */
export async function getConversationState(
  userId: string
): Promise<ConversationState | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_conversation_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[ConvState] Error getting conversation state:", error);
    throw error;
  }

  return data ? transformStateRow(data) : null;
}

/**
 * Update the status of a specific step.
 */
export async function updateStepStatus(
  userId: string,
  step: StartupStep,
  status: StepStatus
): Promise<ConversationState> {
  const state = await getOrCreateConversationState(userId);
  const newStatuses = { ...state.stepStatuses, [step]: status };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({ step_statuses: newStatuses })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error updating step status:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Advance to the next step. Records the transition.
 */
export async function advanceToStep(
  userId: string,
  newStep: StartupStep
): Promise<ConversationState> {
  const state = await getOrCreateConversationState(userId);
  const previousStep = state.currentStep;

  // Mark previous step as validated if it was in_progress
  const newStatuses = { ...state.stepStatuses };
  if (newStatuses[previousStep] === "in_progress") {
    newStatuses[previousStep] = "validated";
  }
  // Mark new step as in_progress if not_started
  if (newStatuses[newStep] === "not_started") {
    newStatuses[newStep] = "in_progress";
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({
      current_step: newStep,
      step_statuses: newStatuses,
      current_blockers: [],
      last_transition_at: new Date().toISOString(),
      last_transition_from: previousStep,
      last_transition_to: newStep,
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error advancing step:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Set blockers on the current step.
 */
export async function setBlockers(
  userId: string,
  blockers: string[]
): Promise<ConversationState> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({ current_blockers: blockers })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error setting blockers:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Update the overall process status.
 */
export async function updateProcessStatus(
  userId: string,
  status: ProcessStatus
): Promise<ConversationState> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({ process_status: status })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error updating process status:", error);
    throw error;
  }

  return transformStateRow(data);
}

// ============================================================================
// Step Evidence Operations
// ============================================================================

/**
 * Store a piece of evidence for a step.
 */
export async function storeStepEvidence(
  userId: string,
  step: StartupStep,
  evidenceType: EvidenceType,
  content: string,
  options: {
    metadata?: Record<string, unknown>;
    semanticMemoryId?: string;
    confidence?: number;
    source?: EvidenceSource;
  } = {}
): Promise<StepEvidence> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_step_evidence")
    .insert({
      user_id: userId,
      step,
      evidence_type: evidenceType,
      content,
      metadata: options.metadata ?? {},
      semantic_memory_id: options.semanticMemoryId ?? null,
      confidence: options.confidence ?? 1.0,
      source: options.source ?? "conversation",
    })
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error storing step evidence:", error);
    throw error;
  }

  return transformEvidenceRow(data);
}

/**
 * Get all active evidence for a specific step.
 */
export async function getStepEvidence(
  userId: string,
  step: StartupStep
): Promise<StepEvidence[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_step_evidence")
    .select("*")
    .eq("user_id", userId)
    .eq("step", step)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ConvState] Error getting step evidence:", error);
    throw error;
  }

  return (data || []).map(transformEvidenceRow);
}

/**
 * Get all active evidence for a user across all steps.
 */
export async function getAllEvidence(userId: string): Promise<StepEvidence[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_step_evidence")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("step")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ConvState] Error getting all evidence:", error);
    throw error;
  }

  return (data || []).map(transformEvidenceRow);
}

/**
 * Get evidence of a specific type for a step.
 */
export async function getEvidenceByType(
  userId: string,
  step: StartupStep,
  evidenceType: EvidenceType
): Promise<StepEvidence[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_step_evidence")
    .select("*")
    .eq("user_id", userId)
    .eq("step", step)
    .eq("evidence_type", evidenceType)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ConvState] Error getting evidence by type:", error);
    throw error;
  }

  return (data || []).map(transformEvidenceRow);
}

/**
 * Deactivate a piece of evidence (soft delete).
 */
export async function deactivateEvidence(evidenceId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fred_step_evidence")
    .update({ is_active: false })
    .eq("id", evidenceId);

  if (error) {
    console.error("[ConvState] Error deactivating evidence:", error);
    throw error;
  }
}

// ============================================================================
// Diagnostic Tags & Founder Snapshot (Operating Bible 5.2 & 12)
// ============================================================================

/**
 * Update silent diagnostic tags. Merges with existing tags.
 * Called during early messages when FRED silently assesses the founder.
 */
export async function updateDiagnosticTags(
  userId: string,
  tags: Partial<DiagnosticTags>
): Promise<ConversationState> {
  const state = await getOrCreateConversationState(userId);
  const merged = { ...state.diagnosticTags, ...tags };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({ diagnostic_tags: merged })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error updating diagnostic tags:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Update founder snapshot. Merges with existing snapshot.
 * Called after check-ins and major revelations.
 */
export async function updateFounderSnapshot(
  userId: string,
  snapshot: Partial<FounderSnapshot>
): Promise<ConversationState> {
  const state = await getOrCreateConversationState(userId);
  const merged = { ...state.founderSnapshot, ...snapshot };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fred_conversation_state")
    .update({ founder_snapshot: merged })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[ConvState] Error updating founder snapshot:", error);
    throw error;
  }

  return transformStateRow(data);
}

/**
 * Populate founder_snapshot from the profiles table.
 * Called during onboarding handoff (Phase 35) to seed conversation state
 * with data collected during onboarding.
 */
export async function syncSnapshotFromProfile(userId: string): Promise<ConversationState> {
  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stage, product_status, traction, runway, primary_constraint, ninety_day_goal, revenue_range, team_size, funding_history, industry")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("[ConvState] Error reading profile for snapshot sync:", profileError);
    throw profileError;
  }

  const snapshot: Partial<FounderSnapshot> = {};
  if (profile.stage) snapshot.stage = profile.stage;
  if (profile.product_status) snapshot.productStatus = profile.product_status;
  if (profile.traction) snapshot.traction = profile.traction;
  if (profile.runway && Object.keys(profile.runway).length > 0) snapshot.runway = profile.runway;
  if (profile.primary_constraint) snapshot.primaryConstraint = profile.primary_constraint;
  if (profile.ninety_day_goal) snapshot.ninetyDayGoal = profile.ninety_day_goal;

  return updateFounderSnapshot(userId, snapshot);
}

// ============================================================================
// Composite Queries
// ============================================================================

/**
 * Get a full progress snapshot for a user, including state and evidence counts.
 * This is the primary query used by the chat route to build FRED's context.
 */
export async function getStepProgress(userId: string): Promise<StepProgress | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fred_step_progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[ConvState] Error getting step progress:", error);
    throw error;
  }

  if (!data) return null;

  return {
    userId: data.user_id,
    currentStep: data.current_step,
    processStatus: data.process_status,
    stepStatuses: data.step_statuses,
    currentBlockers: data.current_blockers || [],
    stateUpdatedAt: new Date(data.state_updated_at),
    evidenceCounts: data.evidence_counts || {},
  };
}

/**
 * Build a context string summarizing the founder's progress for FRED's system prompt.
 * This is the key output consumed by the chat route.
 *
 * Optimized for token efficiency (<300 tokens target):
 * - Only lists steps with activity (in_progress, validated, blocked, skipped)
 * - Omits not_started steps (redundant -- FRED knows the 9-step order)
 * - Caps evidence per step to keep output concise
 */
export async function buildProgressContext(userId: string): Promise<string> {
  const [state, evidence] = await Promise.all([
    getOrCreateConversationState(userId),
    getAllEvidence(userId),
  ]);

  const evidenceByStep = new Map<string, StepEvidence[]>();
  for (const e of evidence) {
    const list = evidenceByStep.get(e.step) || [];
    list.push(e);
    evidenceByStep.set(e.step, list);
  }

  const lines: string[] = [];

  // Founder Snapshot -- compact single-line format
  const snap = state.founderSnapshot;
  if (Object.keys(snap).length > 0) {
    const parts: string[] = [];
    if (snap.stage) parts.push(`stage=${snap.stage}`);
    if (snap.productStatus) parts.push(`product=${snap.productStatus}`);
    if (snap.traction) parts.push(`traction=${snap.traction}`);
    if (snap.runway) {
      const r = [snap.runway.time, snap.runway.money, snap.runway.energy].filter(Boolean);
      if (r.length > 0) parts.push(`runway=${r.join("/")}`);
    }
    if (snap.primaryConstraint) parts.push(`constraint=${snap.primaryConstraint}`);
    if (snap.ninetyDayGoal) parts.push(`90d-goal=${snap.ninetyDayGoal}`);
    if (parts.length > 0) lines.push(`Founder: ${parts.join(", ")}`);
  }

  // Diagnostic Tags -- compact single line
  const diag = state.diagnosticTags;
  if (Object.keys(diag).length > 0) {
    const parts: string[] = [];
    if (diag.positioningClarity) parts.push(`positioning=${diag.positioningClarity}`);
    if (diag.investorReadinessSignal) parts.push(`investor-signal=${diag.investorReadinessSignal}`);
    if (diag.stage) parts.push(`stage=${diag.stage}`);
    if (diag.primaryConstraint) parts.push(`constraint=${diag.primaryConstraint}`);
    if (parts.length > 0) lines.push(`Diagnosis: ${parts.join(", ")}`);
  }

  // Current position -- single line
  lines.push(`Process: ${state.processStatus}, current_step=${state.currentStep}`);

  // Separate steps into categories for tiered detail output
  const activeSteps = STEP_ORDER.filter((step) => {
    const status = state.stepStatuses[step] || "not_started";
    return status !== "not_started" || step === state.currentStep;
  });
  const notStartedCount = STEP_ORDER.length - activeSteps.length;

  // Find the most recently validated step (last in STEP_ORDER with status=validated)
  const lastValidatedStep = [...STEP_ORDER]
    .reverse()
    .find((s) => state.stepStatuses[s] === "validated");

  // Steps that get full evidence: current step + most recently validated step
  const detailSteps = new Set<string>();
  detailSteps.add(state.currentStep);
  if (lastValidatedStep) detailSteps.add(lastValidatedStep);

  // Compact status-only line for older validated steps
  const statusOnlySteps = activeSteps.filter(
    (s) => !detailSteps.has(s)
  );
  if (statusOnlySteps.length > 0) {
    const summary = statusOnlySteps
      .map((s) => `${s}=${state.stepStatuses[s] || "not_started"}`)
      .join(", ");
    lines.push(`Prior steps: ${summary}`);
  }

  // Detailed output for current step and most recently validated step
  for (const step of activeSteps.filter((s) => detailSteps.has(s))) {
    const status = state.stepStatuses[step] || "not_started";
    const stepEvidence = evidenceByStep.get(step) || [];
    const marker = step === state.currentStep ? " <-- CURRENT" : "";
    lines.push(`[${status.toUpperCase()}] ${step}${marker}`);

    // Show evidence (cap at 2 outputs + 2 facts + all kill signals)
    const outputs = stepEvidence.filter((e) => e.evidenceType === "required_output");
    const facts = stepEvidence.filter((e) => e.evidenceType === "supporting_fact");
    const killSignals = stepEvidence.filter((e) => e.evidenceType === "kill_signal");

    for (const o of outputs.slice(0, 2)) {
      lines.push(`  Output: ${sanitizeUserInput(o.content, 200)}`);
    }
    for (const f of facts.slice(0, 2)) {
      lines.push(`  Fact: ${sanitizeUserInput(f.content, 200)}`);
    }
    const remaining = Math.max(0, outputs.length - 2) + Math.max(0, facts.length - 2);
    if (remaining > 0) {
      lines.push(`  +${remaining} more`);
    }
    for (const k of killSignals) {
      lines.push(`  WARNING: ${sanitizeUserInput(k.content, 200)}`);
    }
  }

  if (notStartedCount > 0) {
    lines.push(`(${notStartedCount} steps not yet started)`);
  }

  if (state.currentBlockers.length > 0) {
    lines.push(`Blockers: ${state.currentBlockers.map((b) => sanitizeUserInput(String(b), 200)).join("; ")}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Wave 3: Reality Lens Gate Operations
// ============================================================================

/**
 * Update the validation status of a single Reality Lens dimension.
 * FRED calls this during chat when it assesses a dimension inline.
 */
export async function updateRealityLensDimension(
  userId: string,
  dimension: RealityLensDimension,
  status: RLGateStatus,
  blockers?: string[]
): Promise<void> {
  if (!REALITY_LENS_DIMENSIONS.includes(dimension)) {
    throw new Error(`Invalid RL dimension: ${dimension}`);
  }

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  // Build the dimension update object (snake_case for DB)
  const dimensionUpdate = {
    status,
    blockers: blockers || [],
    last_assessed_at: now,
  };

  // Use jsonb_set to update a single dimension without overwriting others
  const { error } = await supabase.rpc("exec_sql", {
    query: `
      UPDATE fred_conversation_state
      SET reality_lens_gate = jsonb_set(
        reality_lens_gate,
        $1::text[],
        $2::jsonb
      )
      WHERE user_id = $3
    `,
    params: [
      `{${dimension}}`,
      JSON.stringify(dimensionUpdate),
      userId,
    ],
  });

  // Fallback: if RPC not available, do full read-modify-write
  if (error) {
    const state = await getConversationState(userId);
    if (!state) return;

    const gate = state.realityLensGate;
    gate[dimension] = {
      status,
      blockers: blockers || [],
      lastAssessedAt: now,
    };

    // Convert back to snake_case for DB
    const dbGate: Record<string, unknown> = {};
    for (const dim of REALITY_LENS_DIMENSIONS) {
      dbGate[dim] = {
        status: gate[dim].status,
        blockers: gate[dim].blockers,
        last_assessed_at: gate[dim].lastAssessedAt,
      };
    }

    const { error: updateError } = await supabase
      .from("fred_conversation_state")
      .update({ reality_lens_gate: dbGate })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[Conversation State] Failed to update RL dimension:", updateError);
      throw updateError;
    }
  }
}

/**
 * Get the Reality Lens gate state for a user.
 * Returns null if no conversation state exists.
 */
export async function getRealityLensGate(userId: string): Promise<RealityLensGate | null> {
  const state = await getConversationState(userId);
  return state?.realityLensGate || null;
}

/**
 * Check if all Reality Lens dimensions are validated.
 * Phase 37 uses this as the gate before allowing downstream work.
 */
export function isRealityLensFullyValidated(gate: RealityLensGate): boolean {
  return REALITY_LENS_DIMENSIONS.every((dim) => gate[dim].status === "validated");
}

/**
 * Get dimensions that are blocking progress (not validated).
 * Returns dimensions with their blockers for FRED to communicate to the founder.
 */
export function getBlockingDimensions(
  gate: RealityLensGate
): Array<{ dimension: RealityLensDimension; status: RLGateStatus; blockers: string[] }> {
  return REALITY_LENS_DIMENSIONS
    .filter((dim) => gate[dim].status !== "validated")
    .map((dim) => ({
      dimension: dim,
      status: gate[dim].status,
      blockers: gate[dim].blockers,
    }));
}

// ============================================================================
// Wave 3: Diagnostic Mode Operations
// ============================================================================

/** Max signal history entries to keep (architect directive: cap at 20) */
const MAX_SIGNAL_HISTORY = 20;

/**
 * Update the active diagnostic mode.
 * Called when the diagnostic engine detects a mode switch.
 */
export async function updateActiveMode(
  userId: string,
  mode: ActiveMode,
  activatedBy?: string
): Promise<void> {
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  // Update active_mode and set activation metadata in mode_context
  const state = await getConversationState(userId);
  if (!state) return;

  const modeContext = state.modeContext;
  modeContext.activatedAt = now;
  modeContext.activatedBy = activatedBy || "signal_detected";

  // Convert to snake_case for DB
  const dbModeContext = modeContextToDb(modeContext);

  const { error } = await supabase
    .from("fred_conversation_state")
    .update({
      active_mode: mode,
      mode_context: dbModeContext,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[Conversation State] Failed to update active mode:", error);
    throw error;
  }
}

/**
 * Record a framework introduction event.
 * Called when FRED introduces positioning or investor lens to the founder.
 */
export async function recordFrameworkIntroduction(
  userId: string,
  framework: "positioning" | "investor",
  trigger: string
): Promise<void> {
  const state = await getConversationState(userId);
  if (!state) return;

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const modeContext = state.modeContext;
  modeContext.introductionState[framework] = {
    introduced: true,
    introducedAt: now,
    trigger,
  };

  const dbModeContext = modeContextToDb(modeContext);

  const { error } = await supabase
    .from("fred_conversation_state")
    .update({ mode_context: dbModeContext })
    .eq("user_id", userId);

  if (error) {
    console.error("[Conversation State] Failed to record framework introduction:", error);
    throw error;
  }
}

/**
 * Append a signal detection to the signal history.
 * Caps at MAX_SIGNAL_HISTORY entries (drops oldest).
 */
export async function appendSignalHistory(
  userId: string,
  signal: string,
  framework: "positioning" | "investor",
  context: string
): Promise<void> {
  const state = await getConversationState(userId);
  if (!state) return;

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const modeContext = state.modeContext;

  // Append new signal
  modeContext.signalHistory.push({
    signal,
    framework,
    detectedAt: now,
    context: context.slice(0, 200), // Cap context length
  });

  // Cap at MAX_SIGNAL_HISTORY (drop oldest)
  if (modeContext.signalHistory.length > MAX_SIGNAL_HISTORY) {
    modeContext.signalHistory = modeContext.signalHistory.slice(-MAX_SIGNAL_HISTORY);
  }

  const dbModeContext = modeContextToDb(modeContext);

  const { error } = await supabase
    .from("fred_conversation_state")
    .update({ mode_context: dbModeContext })
    .eq("user_id", userId);

  if (error) {
    console.error("[Conversation State] Failed to append signal history:", error);
    throw error;
  }
}

/**
 * Update formal assessment tracking.
 */
export async function updateFormalAssessments(
  userId: string,
  offered?: boolean,
  accepted?: boolean
): Promise<void> {
  const state = await getConversationState(userId);
  if (!state) return;

  const supabase = await createServiceClient();

  const modeContext = state.modeContext;
  if (offered !== undefined) modeContext.formalAssessments.offered = offered;
  if (accepted !== undefined) modeContext.formalAssessments.accepted = accepted;

  const dbModeContext = modeContextToDb(modeContext);

  const { error } = await supabase
    .from("fred_conversation_state")
    .update({ mode_context: dbModeContext })
    .eq("user_id", userId);

  if (error) {
    console.error("[Conversation State] Failed to update formal assessments:", error);
    throw error;
  }
}

/** Convert camelCase ModeContext to snake_case for DB storage */
function modeContextToDb(ctx: ModeContext): Record<string, unknown> {
  return {
    activated_at: ctx.activatedAt,
    activated_by: ctx.activatedBy,
    introduction_state: {
      positioning: {
        introduced: ctx.introductionState.positioning.introduced,
        introduced_at: ctx.introductionState.positioning.introducedAt,
        trigger: ctx.introductionState.positioning.trigger,
      },
      investor: {
        introduced: ctx.introductionState.investor.introduced,
        introduced_at: ctx.introductionState.investor.introducedAt,
        trigger: ctx.introductionState.investor.trigger,
      },
    },
    signal_history: ctx.signalHistory.map((s) => ({
      signal: s.signal,
      framework: s.framework,
      detected_at: s.detectedAt,
      context: s.context,
    })),
    formal_assessments: ctx.formalAssessments,
  };
}

// ============================================================================
// Transform Functions (snake_case -> camelCase)
// ============================================================================

/** Default Reality Lens gate state (all dimensions not_assessed) */
const DEFAULT_RL_GATE: RealityLensGate = {
  feasibility: { status: "not_assessed", blockers: [], lastAssessedAt: null },
  economics: { status: "not_assessed", blockers: [], lastAssessedAt: null },
  demand: { status: "not_assessed", blockers: [], lastAssessedAt: null },
  distribution: { status: "not_assessed", blockers: [], lastAssessedAt: null },
  timing: { status: "not_assessed", blockers: [], lastAssessedAt: null },
};

/** Default mode context */
const DEFAULT_MODE_CONTEXT: ModeContext = {
  activatedAt: null,
  activatedBy: null,
  introductionState: {
    positioning: { introduced: false, introducedAt: null, trigger: null },
    investor: { introduced: false, introducedAt: null, trigger: null },
  },
  signalHistory: [],
  formalAssessments: { offered: false, accepted: false },
};

/** Transform DB snake_case RL gate JSON to camelCase */
function transformRLGate(raw: Record<string, unknown> | null): RealityLensGate {
  if (!raw) return { ...DEFAULT_RL_GATE };
  const gate = { ...DEFAULT_RL_GATE };
  for (const dim of REALITY_LENS_DIMENSIONS) {
    const entry = raw[dim] as Record<string, unknown> | undefined;
    if (entry) {
      gate[dim] = {
        status: (entry.status as RLGateStatus) || "not_assessed",
        blockers: (entry.blockers as string[]) || [],
        lastAssessedAt: (entry.last_assessed_at as string) || null,
      };
    }
  }
  return gate;
}

/** Transform DB snake_case mode context JSON to camelCase */
function transformModeContext(raw: Record<string, unknown> | null): ModeContext {
  if (!raw) return { ...DEFAULT_MODE_CONTEXT };
  const intro = raw.introduction_state as Record<string, Record<string, unknown>> | undefined;
  const signals = raw.signal_history as Array<Record<string, string>> | undefined;
  const assessments = raw.formal_assessments as Record<string, boolean> | undefined;
  return {
    activatedAt: (raw.activated_at as string) || null,
    activatedBy: (raw.activated_by as string) || null,
    introductionState: {
      positioning: {
        introduced: intro?.positioning?.introduced as boolean ?? false,
        introducedAt: (intro?.positioning?.introduced_at as string) || null,
        trigger: (intro?.positioning?.trigger as string) || null,
      },
      investor: {
        introduced: intro?.investor?.introduced as boolean ?? false,
        introducedAt: (intro?.investor?.introduced_at as string) || null,
        trigger: (intro?.investor?.trigger as string) || null,
      },
    },
    signalHistory: (signals || []).map((s) => ({
      signal: s.signal || "",
      framework: (s.framework as "positioning" | "investor") || "positioning",
      detectedAt: s.detected_at || "",
      context: s.context || "",
    })),
    formalAssessments: {
      offered: assessments?.offered ?? false,
      accepted: assessments?.accepted ?? false,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase rows are untyped at this boundary
function transformStateRow(row: any): ConversationState {
  return {
    id: row.id,
    userId: row.user_id,
    currentStep: row.current_step,
    stepStatuses: row.step_statuses,
    processStatus: row.process_status,
    currentBlockers: row.current_blockers || [],
    diagnosticTags: row.diagnostic_tags || {},
    founderSnapshot: row.founder_snapshot || {},
    realityLensGate: transformRLGate(row.reality_lens_gate),
    activeMode: row.active_mode || "founder-os",
    modeContext: transformModeContext(row.mode_context),
    lastTransitionAt: row.last_transition_at ? new Date(row.last_transition_at) : null,
    lastTransitionFrom: row.last_transition_from,
    lastTransitionTo: row.last_transition_to,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase rows are untyped at this boundary
function transformEvidenceRow(row: any): StepEvidence {
  return {
    id: row.id,
    userId: row.user_id,
    step: row.step,
    evidenceType: row.evidence_type,
    content: row.content,
    metadata: row.metadata || {},
    semanticMemoryId: row.semantic_memory_id,
    confidence: row.confidence,
    source: row.source,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
