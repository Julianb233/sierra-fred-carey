/**
 * Typed Analytics Event Constants
 *
 * Phase 30-01: Centralized event name constants for product analytics.
 * Organized by category for discoverability and type safety.
 */

// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = {
  /** Authentication events */
  AUTH: {
    SIGNUP: "auth.signup",
    LOGIN: "auth.login",
    LOGOUT: "auth.logout",
  },

  /** Onboarding flow events */
  ONBOARDING: {
    STARTED: "onboarding.started",
    STEP_COMPLETED: "onboarding.step_completed",
    COMPLETED: "onboarding.completed",
    SKIPPED: "onboarding.skipped",
  },

  /** Chat / FRED interaction events */
  CHAT: {
    MESSAGE_SENT: "chat.message_sent",
    SESSION_STARTED: "chat.session_started",
    SESSION_ENDED: "chat.session_ended",
  },

  /** Feature usage events */
  FEATURES: {
    REALITY_LENS_USED: "features.reality_lens_used",
    INVESTOR_READINESS_USED: "features.investor_readiness_used",
    PITCH_DECK_UPLOADED: "features.pitch_deck_uploaded",
    STRATEGY_CREATED: "features.strategy_created",
    AGENT_DISPATCHED: "features.agent_dispatched",
  },

  /** Subscription / billing events */
  SUBSCRIPTION: {
    TIER_CHANGED: "subscription.tier_changed",
    CHECKOUT_STARTED: "subscription.checkout_started",
    CHECKOUT_COMPLETED: "subscription.checkout_completed",
  },

  /** General engagement events */
  ENGAGEMENT: {
    DASHBOARD_VIEWED: "engagement.dashboard_viewed",
    SETTINGS_UPDATED: "engagement.settings_updated",
    DOCUMENT_EXPORTED: "engagement.document_exported",
  },
} as const;

// ---------------------------------------------------------------------------
// Property type definitions for each event category
// ---------------------------------------------------------------------------

export interface AuthEventProperties {
  method?: "email" | "google" | "github" | "magic_link";
  referrer?: string;
}

export interface OnboardingEventProperties {
  step?: string;
  stepIndex?: number;
  totalSteps?: number;
  skippedReason?: string;
}

export interface ChatEventProperties {
  messageLength?: number;
  topic?: string;
  sessionDurationMs?: number;
  modelUsed?: string;
  tier?: string;
}

export interface FeatureEventProperties {
  featureName?: string;
  documentId?: string;
  documentType?: string;
  agentType?: string;
  tier?: string;
}

export interface SubscriptionEventProperties {
  fromTier?: string;
  toTier?: string;
  priceId?: string;
  amount?: number;
  currency?: string;
}

export interface EngagementEventProperties {
  page?: string;
  section?: string;
  exportFormat?: string;
  settingChanged?: string;
}

// ---------------------------------------------------------------------------
// Union type of all event names
// ---------------------------------------------------------------------------

type EventCategory = typeof ANALYTICS_EVENTS;
type EventValues<T> = T extends Record<string, string> ? T[keyof T] : never;

export type AnalyticsEventName =
  | EventValues<EventCategory["AUTH"]>
  | EventValues<EventCategory["ONBOARDING"]>
  | EventValues<EventCategory["CHAT"]>
  | EventValues<EventCategory["FEATURES"]>
  | EventValues<EventCategory["SUBSCRIPTION"]>
  | EventValues<EventCategory["ENGAGEMENT"]>;
