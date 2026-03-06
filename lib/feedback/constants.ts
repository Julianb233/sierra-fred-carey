/**
 * Feedback System Constants
 *
 * Shared constants for the feedback collection and analysis pipeline.
 */

import type { FeedbackChannel, FeedbackCategory } from "./types";

/** All supported feedback collection channels */
export const FEEDBACK_CHANNELS: FeedbackChannel[] = [
  "chat",
  "voice",
  "sms",
  "whatsapp",
];

/** All supported feedback categories */
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "irrelevant",
  "incorrect",
  "too_vague",
  "too_long",
  "wrong_tone",
  "coaching_discomfort",
  "helpful",
  "other",
];

/** Tier-based signal weighting -- higher-tier users' feedback has more weight */
export const TIER_WEIGHTS = {
  free: 1,
  pro: 2,
  studio: 3,
} as const;

/** Max detailed feedback submissions per user per week */
export const MAX_DETAILED_FEEDBACK_PER_WEEK = 5;

/** Sentiment label to numeric score mapping */
export const SENTIMENT_SCORES = {
  positive: 1,
  neutral: 0,
  negative: -0.5,
  frustrated: -1,
} as const;

/** Spike detection thresholds */
export const SPIKE_THRESHOLD = {
  /** Average sentiment below this in last 3 messages triggers spike */
  avgNegativeThreshold: -0.5,
  /** Previous 3 messages must be above this for it to count as a "spike" (sharp drop) */
  previousPositiveThreshold: 0,
  /** Single message sentiment below this with high confidence triggers spike */
  singleMessageThreshold: -0.8,
  /** Minimum confidence for single-message spike detection */
  singleMessageConfidence: 0.7,
} as const;
