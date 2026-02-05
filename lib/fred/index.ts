/**
 * FRED Cognitive Engine
 *
 * FRED = Fred's Rational Expert Decision-maker
 *
 * An AI-powered decision framework using XState v5 for deterministic
 * state management and Fred Cary's 7-factor scoring methodology.
 */

// Main service
export { FredService, createFredService, processWithFred } from "./service";
export type { FredServiceOptions, ProcessResult } from "./service";

// State machine
export { fredMachine } from "./machine";

// Types
export type {
  FredContext,
  FredConfig,
  FredError,
  FredErrorCode,
  FredEvent,
  FredResponse,
  FredState,
  UserInput,
  ValidatedInput,
  InputIntent,
  ExtractedEntity,
  ClarificationRequest,
  MentalModelResult,
  MentalModel,
  SynthesisResult,
  DecisionResult,
  DecisionAction,
  FactorScores,
  Alternative,
  Risk,
  MemoryContext,
  Attachment,
  ApprovalOption,
} from "./types";

export { DEFAULT_FRED_CONFIG } from "./types";

// Observability
export { FredObservability, fredLogger, createTraceId } from "./observability";
export type { StateTransition, FredMetrics } from "./observability";

// Actor functions (for advanced usage)
export {
  loadMemoryActor,
  validateInputActor,
  applyMentalModelsActor,
  synthesizeActor,
  decideActor,
  executeActor,
} from "./actors";
