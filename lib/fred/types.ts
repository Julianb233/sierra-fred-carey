/**
 * FRED Cognitive Engine Types
 *
 * Type definitions for the FRED state machine and its components.
 * FRED = Fred's Rational Expert Decision-maker
 */

import type { StartupStep, StepStatus } from "@/lib/ai/frameworks/startup-process";

// ============================================================================
// Core Context Types
// ============================================================================

/**
 * Conversation state passed through the XState machine (Phase 36).
 * Lightweight projection of fred_conversation_state for prompt injection
 * and actor access.
 */
export interface ConversationStateContext {
  currentStep: StartupStep;
  stepStatuses: Record<StartupStep, StepStatus>;
  processStatus: string;
  currentBlockers: string[];
  diagnosticTags: Record<string, string>;
  founderSnapshot: Record<string, unknown>;
  /** Pre-built progress context string for prompt injection */
  progressContext: string;
  /** Phase 38: Active diagnostic mode */
  activeMode: "founder-os" | "positioning" | "investor-readiness";
  /** Phase 38: Whether a mode transition occurred on this message */
  modeTransitioned: boolean;
}

/**
 * FRED State Machine Context
 * Contains all data flowing through the decision pipeline
 */
export interface FredContext {
  /** Unique session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** Raw user input */
  input: UserInput | null;
  /** Validated and parsed input */
  validatedInput: ValidatedInput | null;
  /** Results from mental model analysis */
  mentalModels: MentalModelResult[];
  /** Synthesized recommendation */
  synthesis: SynthesisResult | null;
  /** Final decision */
  decision: DecisionResult | null;
  /** 7-factor scores */
  scores: FactorScores | null;
  /** Error if any occurred */
  error: FredError | null;
  /** Number of retry attempts */
  retryCount: number;
  /** Timestamp when processing started */
  startedAt: Date | null;
  /** Timestamp when processing completed */
  completedAt: Date | null;
  /** Memory context loaded for this session */
  memoryContext: MemoryContext | null;
  /** Dynamic founder context string for prompt personalization (Phase 34) */
  founderContext: string | null;
  /** Conversation state for structured flow (Phase 36) */
  conversationState: ConversationStateContext | null;
  /** When true, skip human_review state (chat has no approval UI) */
  chatMode: boolean;
  /** Pre-loaded semantic facts from buildFounderContext to avoid duplicate DB calls */
  preloadedFacts?: Array<{ category: string; key: string; value: Record<string, unknown> }>;
  /** User tier (free/pro/studio) for memory loading */
  tier?: string;
  /** Token streaming channel — emits LLM response tokens as they arrive */
  tokenChannel?: { emit: (chunk: string) => void } | null;
}

/**
 * Memory context loaded from FRED's memory systems
 */
export interface MemoryContext {
  /** Recent episodes for context */
  recentEpisodes: Array<{
    eventType: string;
    content: Record<string, unknown>;
    createdAt: Date;
  }>;
  /** Relevant facts about user/startup */
  relevantFacts: Array<{
    category: string;
    key: string;
    value: Record<string, unknown>;
  }>;
  /** Recent decisions for pattern matching */
  recentDecisions: Array<{
    decisionType: string;
    recommendation: Record<string, unknown>;
    outcome?: Record<string, unknown>;
  }>;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Raw user input to FRED
 */
export interface UserInput {
  /** User's message or query */
  message: string;
  /** Timestamp of the input */
  timestamp?: Date;
  /** Optional file attachments */
  attachments?: Attachment[];
  /** Additional context provided by the user */
  context?: Record<string, unknown>;
  /** Type of request (if known) */
  requestType?: "question" | "decision" | "feedback" | "information";
}

/**
 * File attachment
 */
export interface Attachment {
  /** File name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** File URL or base64 content */
  content: string;
  /** File size in bytes */
  size: number;
}

/**
 * Validated and parsed input
 */
export interface ValidatedInput {
  /** Original message */
  originalMessage: string;
  /** Detected intent */
  intent: InputIntent;
  /** Detected coaching topic (maps to COACHING_PROMPTS keys) */
  topic?: CoachingTopic;
  /** Extracted entities */
  entities: ExtractedEntity[];
  /** Confidence in intent detection (0-1) */
  confidence: number;
  /** Questions needing clarification before proceeding */
  clarificationNeeded: ClarificationRequest[];
  /** Keywords extracted from input */
  keywords: string[];
  /** Sentiment analysis */
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  /** Urgency level detected */
  urgency: "low" | "medium" | "high" | "critical";
  /** Burnout signals detected from message analysis */
  burnoutSignals?: BurnoutSignals;
  /** Which startup step this message relates to (Phase 36) */
  stepRelevance?: { targetStep: StartupStep; confidence: number } | null;
  /** Whether the founder is drifting to a downstream step (Phase 36) */
  driftDetected?: { isDrift: boolean; targetStep: StartupStep; currentStep: StartupStep } | null;
  /** Downstream request detected for Reality Lens gate (Phase 37) */
  downstreamRequest?: DownstreamRequest;
  /** Phase 38: Positioning signal detection results */
  positioningSignals?: {
    icpVagueOrUndefined: boolean;
    everyoneAsTarget: boolean;
    genericMessaging: boolean;
    highEffortLowTraction: boolean;
    hasSignals: boolean;
  };
  /** Phase 38: Investor signal detection results */
  investorSignals?: {
    mentionsFundraising: boolean;
    mentionsValuation: boolean;
    mentionsDeck: boolean;
    asksAboutReadiness: boolean;
    uploadedDeck: boolean;
    hasSignals: boolean;
  };
}

/**
 * Downstream work request types that require upstream Reality Lens validation.
 * Phase 37: Operating Bible Section 2.3 — Decision Sequencing Rule.
 */
export type DownstreamRequest =
  | "pitch_deck"
  | "fundraising"
  | "hiring"
  | "patents"
  | "scaling"
  | "marketing_campaign"
  | null;

/**
 * Coaching topic detected from user message.
 * Maps to keys in COACHING_PROMPTS from prompts.ts.
 */
export type CoachingTopic = "fundraising" | "pitchReview" | "strategy" | "positioning" | "mindset";

/**
 * Detected user intent
 */
export type InputIntent =
  | "question" // Asking for information
  | "decision_request" // Needs a decision made
  | "information" // Providing information
  | "feedback" // Giving feedback on previous output
  | "clarification" // Responding to clarification request
  | "greeting" // Social greeting
  | "unknown"; // Unable to determine

/**
 * Entity extracted from input
 */
export interface ExtractedEntity {
  /** Entity type */
  type:
    | "startup_name"
    | "person"
    | "money"
    | "date"
    | "metric"
    | "company"
    | "product"
    | "market"
    | "competitor"
    | "investor"
    | "other";
  /** Entity value */
  value: string;
  /** Confidence (0-1) */
  confidence: number;
  /** Position in original text */
  position?: { start: number; end: number };
}

/**
 * Request for clarification
 */
export interface ClarificationRequest {
  /** What needs clarification */
  question: string;
  /** Why it's needed */
  reason: string;
  /** Suggested options if applicable */
  options?: string[];
  /** Is this blocking? */
  required: boolean;
}

// ============================================================================
// Mental Model Types
// ============================================================================

/**
 * Result from applying a mental model
 */
export interface MentalModelResult {
  /** Model identifier */
  model: MentalModel;
  /** Model's analysis output */
  analysis: Record<string, unknown>;
  /** How relevant this model is to the query (0-1) */
  relevance: number;
  /** Key insights from this model */
  insights: string[];
  /** Confidence in the analysis (0-1) */
  confidence: number;
}

/**
 * Available mental models
 */
export type MentalModel =
  | "first_principles" // Break down to fundamentals
  | "second_order_effects" // Consider downstream impacts
  | "inversion" // What could go wrong?
  | "opportunity_cost" // What are we giving up?
  | "regret_minimization" // What decision minimizes future regret?
  | "swot" // Strengths, weaknesses, opportunities, threats
  | "jobs_to_be_done" // What job is the user hiring this for?
  | "five_whys" // Root cause analysis
  | "pre_mortem" // Imagine failure, work backward
  | "contrarian" // What if the opposite is true?
  | "probabilistic" // Expected value calculation
  | "time_horizon" // Short vs long term trade-offs;

// ============================================================================
// Synthesis Types
// ============================================================================

/**
 * Synthesized recommendation from FRED
 */
export interface SynthesisResult {
  /** Primary recommendation */
  recommendation: string;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Reasoning chain explaining the recommendation */
  reasoning: string;
  /** 7-factor scores */
  factors: FactorScores;
  /** Alternative options considered */
  alternatives: Alternative[];
  /** Key assumptions made */
  assumptions: string[];
  /** Risks identified */
  risks: Risk[];
  /** Suggested next steps */
  nextSteps: string[];
  /** Follow-up questions FRED might ask */
  followUpQuestions: string[];
  /** Detected red flags from risk analysis */
  redFlags?: RedFlag[];
}

/**
 * Alternative option considered
 */
export interface Alternative {
  /** Description of the alternative */
  description: string;
  /** Pros of this alternative */
  pros: string[];
  /** Cons of this alternative */
  cons: string[];
  /** Why it wasn't the primary recommendation */
  whyNotRecommended: string;
  /** Composite score */
  score: number;
}

/**
 * Identified risk
 */
export interface Risk {
  /** Risk description */
  description: string;
  /** Likelihood (0-1) */
  likelihood: number;
  /** Impact (0-1) */
  impact: number;
  /** Mitigation strategy */
  mitigation?: string;
}

// ============================================================================
// Decision Types
// ============================================================================

/**
 * Final decision from FRED
 */
export interface DecisionResult {
  /** What action to take */
  action: DecisionAction;
  /** Human-readable content/response */
  content: string;
  /** Confidence in decision (0-1) */
  confidence: number;
  /** Does this require human approval? */
  requiresHumanApproval: boolean;
  /** Reasoning for the decision */
  reasoning: string;
  /** Procedure used (if any) */
  procedureUsed?: string;
  /** Metadata for tracking */
  metadata: Record<string, unknown>;
}

/**
 * Decision action types
 */
export type DecisionAction =
  | "auto_execute" // FRED executes without approval
  | "recommend" // FRED recommends, awaits approval
  | "escalate" // Requires human decision
  | "clarify" // Need more information
  | "defer"; // Cannot make decision now

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Fred Cary's 7-Factor Decision Scores
 */
export interface FactorScores {
  /** Strategic Alignment (0-1): Does this align with long-term vision? */
  strategicAlignment: number;
  /** Leverage (0-1): What's the multiplier effect? */
  leverage: number;
  /** Speed (0-1): How quickly can we see results? */
  speed: number;
  /** Revenue Impact (0-1): What's the revenue potential? */
  revenue: number;
  /** Time Cost (0-1, inverted): How much time does this require? */
  time: number;
  /** Risk (0-1, inverted): What's the downside exposure? */
  risk: number;
  /** Relationship Impact (0-1): How does this affect key relationships? */
  relationships: number;
  /** Weighted composite score (0-100) */
  composite: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * FRED-specific error
 */
export interface FredError {
  /** Error code */
  code: FredErrorCode;
  /** Human-readable message */
  message: string;
  /** Which state the error occurred in */
  state: string;
  /** Original error if any */
  cause?: Error;
  /** Whether this is retryable */
  retryable: boolean;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Error codes
 */
export type FredErrorCode =
  | "VALIDATION_FAILED"
  | "MENTAL_MODEL_FAILED"
  | "SYNTHESIS_FAILED"
  | "DECISION_FAILED"
  | "EXECUTION_FAILED"
  | "AI_PROVIDER_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "MEMORY_ERROR"
  | "UNKNOWN_ERROR";

// ============================================================================
// Event Types (for XState)
// ============================================================================

/**
 * All events the FRED state machine can receive
 */
export type FredEvent =
  | { type: "START"; input: UserInput }
  | { type: "USER_INPUT"; input: UserInput }
  | { type: "VALIDATE_COMPLETE"; result: ValidatedInput }
  | { type: "MODELS_COMPLETE"; results: MentalModelResult[] }
  | { type: "SYNTHESIS_COMPLETE"; result: SynthesisResult }
  | { type: "DECISION_COMPLETE"; result: DecisionResult }
  | { type: "MEMORY_LOADED"; context: MemoryContext }
  | { type: "HUMAN_APPROVED" }
  | { type: "HUMAN_REJECTED"; feedback?: string }
  | { type: "CLARIFICATION_PROVIDED"; input: UserInput }
  | { type: "ERROR"; error: FredError }
  | { type: "RETRY" }
  | { type: "CANCEL" }
  | { type: "TIMEOUT" };

/**
 * State machine states
 */
export type FredState =
  | "idle"
  | "loading_memory"
  | "intake"
  | "validation"
  | "clarification"
  | "mental_models"
  | "synthesis"
  | "decide"
  | "human_review"
  | "execute"
  | "complete"
  | "error"
  | "failed";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * FRED configuration options
 */
export interface FredConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Timeout for AI calls (ms) */
  aiTimeout: number;
  /** Minimum confidence for auto-decide */
  autoDecideThreshold: number;
  /** Enable memory persistence */
  enableMemory: boolean;
  /** Enable observability logging */
  enableObservability: boolean;
  /** Mental models to use */
  enabledModels: MentalModel[];
  /** Default weights for 7-factor scoring */
  factorWeights: {
    strategicAlignment: number;
    leverage: number;
    speed: number;
    revenue: number;
    time: number;
    risk: number;
    relationships: number;
  };
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * FRED's response to the user
 */
export interface FredResponse {
  /** Main response content */
  content: string;
  /** Action taken or recommended */
  action: DecisionAction;
  /** Confidence in the response (0-1) */
  confidence: number;
  /** Does this need user approval? */
  requiresApproval: boolean;
  /** Reasoning behind the response */
  reasoning?: string;
  /** Options for user approval (if applicable) */
  approvalOptions?: ApprovalOption[];
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Option presented for user approval
 */
export interface ApprovalOption {
  /** Display label */
  label: string;
  /** Value to send back */
  value: string;
  /** Description of what this option does */
  description?: string;
}

/**
 * Default FRED configuration
 */
export const DEFAULT_FRED_CONFIG: FredConfig = {
  maxRetries: 3,
  aiTimeout: 30000,
  autoDecideThreshold: 0.85,
  enableMemory: true,
  enableObservability: true,
  enabledModels: [
    "first_principles",
    "second_order_effects",
    "opportunity_cost",
    "pre_mortem",
  ],
  factorWeights: {
    strategicAlignment: 0.2,
    leverage: 0.15,
    speed: 0.15,
    revenue: 0.15,
    time: 0.1,
    risk: 0.15,
    relationships: 0.1,
  },
};

// ============================================================================
// Founder Wellbeing Types
// ============================================================================

/**
 * Burnout signal detection results from analyzing founder messages
 */
export interface BurnoutSignals {
  /** Whether burnout signals were detected above threshold */
  detected: boolean;
  /** Overall stress level score (0-100) */
  stressLevel: number;
  /** Specific indicators found, e.g. ["sleep_issues", "overwhelm", "isolation"] */
  indicators: string[];
  /** Brief supportive message in Fred's voice */
  recommendation: string;
  /** Whether to suggest the wellbeing check-in page */
  suggestCheckIn: boolean;
}

// ============================================================================
// Red Flag Types
// ============================================================================

export type RedFlagCategory = "market" | "financial" | "team" | "product" | "legal" | "competitive";

export type Severity = "critical" | "high" | "medium" | "low";

export type FlagStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export interface RedFlag {
  id?: string;
  userId?: string;
  category: RedFlagCategory;
  severity: Severity;
  title: string;
  description: string;
  status: FlagStatus;
  sourceMessageId?: string;
  detectedAt: string;
  resolvedAt?: string;
}
