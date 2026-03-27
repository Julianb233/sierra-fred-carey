/**
 * Shared Data Model: Funnel → Full Platform Migration
 *
 * Defines the canonical types for data that originates in the funnel
 * (u.joinsahara.com) and must migrate cleanly into the full Sahara
 * platform (joinsahara.com).
 *
 * The funnel stores data client-side (localStorage/sessionStorage).
 * When a user signs up for the full platform, this data is extracted,
 * transformed, and persisted to Supabase.
 *
 * Linear: AI-1903
 */

// ============================================================================
// Funnel-side data shapes (what localStorage contains)
// ============================================================================

/** Chat message as stored in funnel localStorage (`sahara-funnel-chat`) */
export interface FunnelChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string (serialized Date)
}

/**
 * Journey progress as stored in funnel localStorage (`sahara-funnel-journey`).
 * Keys are `${stageId}-${milestoneIndex}`, values are boolean.
 */
export type FunnelJourneyProgress = Record<string, boolean>

/** Complete funnel payload sent during migration */
export interface FunnelMigrationPayload {
  /** Funnel session ID (from sessionStorage `sahara-funnel-session`) */
  sessionId: string
  /** Chat messages from localStorage */
  chatMessages: FunnelChatMessage[]
  /** Journey milestone progress from localStorage */
  journeyProgress: FunnelJourneyProgress
  /** UTC timestamp when the export was created */
  exportedAt: string
  /** Funnel version for forward-compatibility */
  funnelVersion: string
}

// ============================================================================
// Server-side staging table (funnel_leads)
// ============================================================================

/**
 * Row in the `funnel_leads` staging table.
 * Persists funnel data server-side before or during sign-up so nothing is lost
 * if the user's browser clears localStorage.
 */
export interface FunnelLead {
  id: string
  sessionId: string
  /** Set once the user creates an account; NULL for anonymous leads */
  userId: string | null
  chatMessages: FunnelChatMessage[]
  journeyProgress: FunnelJourneyProgress
  /** Whether this lead's data has been migrated to platform tables */
  migrated: boolean
  migratedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Platform-side target tables
// ============================================================================

/**
 * Mapping: where each piece of funnel data lands in the platform.
 *
 * | Funnel Source               | Platform Target             | Notes                              |
 * |----------------------------|-----------------------------|------------------------------------|
 * | chatMessages (role=user)   | fred_episodic_memory        | event_type='conversation'          |
 * | chatMessages (role=asst)   | fred_episodic_memory        | event_type='conversation'          |
 * | journeyProgress            | founder_goals (completed)   | Map stage milestones → goals       |
 * | journeyProgress            | journey_events              | Log milestone completion events     |
 * | sessionId                  | profiles.enrichment_data    | Store original funnel session ref   |
 */

// ============================================================================
// Journey stage ↔ platform mapping
// ============================================================================

/**
 * Canonical journey stage IDs (shared between funnel constants.ts and platform).
 * Must stay in sync with JOURNEY_STAGES in funnel/src/lib/constants.ts.
 */
export const JOURNEY_STAGE_IDS = ['idea', 'build', 'launch', 'scale', 'fund'] as const
export type JourneyStageId = (typeof JOURNEY_STAGE_IDS)[number]

/**
 * Maps funnel journey stage IDs to platform founder_goals categories.
 */
export const STAGE_TO_GOAL_CATEGORY: Record<JourneyStageId, string> = {
  idea: 'validation',
  build: 'product',
  launch: 'growth',
  scale: 'strategy',
  fund: 'fundraising',
}

/**
 * Maps funnel milestone indices to platform goal titles.
 * Mirrors JOURNEY_STAGES[].milestones from funnel/src/lib/constants.ts.
 */
export const STAGE_MILESTONES: Record<JourneyStageId, string[]> = {
  idea: [
    'Define the problem you solve',
    'Identify your target customer',
    'Validate demand (10+ conversations)',
    'Create a one-page business brief',
  ],
  build: [
    'Build an MVP (minimum viable product)',
    'Get 10 paying customers or active users',
    'Establish key metrics & KPIs',
    'Create a pitch deck draft',
  ],
  launch: [
    'Launch publicly',
    'Achieve consistent growth (10%+ MoM)',
    'Reach $1K MRR or 100 active users',
    'Refine your go-to-market strategy',
  ],
  scale: [
    'Hire first key team members',
    'Reach $10K+ MRR',
    'Complete investor readiness assessment',
    'Build investor pipeline',
  ],
  fund: [
    'Finalize pitch deck with Fred',
    'Complete due diligence prep',
    'Secure term sheet',
    'Close your round',
  ],
}

// ============================================================================
// Migration result
// ============================================================================

export interface MigrationResult {
  success: boolean
  /** Number of chat messages migrated to fred_episodic_memory */
  episodesCreated: number
  /** Number of founder_goals rows created/updated */
  goalsUpdated: number
  /** Number of journey_events logged */
  eventsLogged: number
  /** Errors encountered (non-fatal) */
  warnings: string[]
  /** When the migration completed */
  completedAt: string
}
