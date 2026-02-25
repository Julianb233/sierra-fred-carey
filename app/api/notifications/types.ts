/**
 * API Request/Response Types for Notification Endpoints
 * Provides type safety for notification API calls
 */

import { AlertLevel, AlertType } from "@/lib/notifications/types";

/**
 * Slack Notification Request Body
 */
export interface SlackNotificationRequest {
  /** Slack webhook URL (required if userId not provided) */
  webhookUrl?: string;
  /** User ID to fetch webhook from config (optional) */
  userId?: string;
  /** Alert level */
  level: AlertLevel;
  /** Alert type */
  type: AlertType;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Experiment name (optional) */
  experimentName?: string;
  /** Variant name (optional) */
  variantName?: string;
  /** Metric name (optional) */
  metric?: string;
  /** Metric value (optional) */
  value?: number;
  /** Threshold value (optional) */
  threshold?: number;
  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Slack Notification Response
 */
export interface SlackNotificationResponse {
  success: boolean;
  data?: {
    channel: "slack";
    timestamp: Date;
  };
  error?: string;
  details?: string;
  message?: string;
}

/**
 * PagerDuty Notification Request Body
 */
export interface PagerDutyNotificationRequest {
  /** PagerDuty routing/integration key (required if userId not provided) */
  routingKey?: string;
  /** User ID to fetch routing key from config (optional) */
  userId?: string;
  /** Alert level (required for trigger action) */
  level?: AlertLevel;
  /** Alert type (required for trigger action) */
  type?: AlertType;
  /** Alert title (required for trigger action) */
  title?: string;
  /** Alert message (required for trigger action) */
  message?: string;
  /** Event action: trigger or resolve */
  action?: "trigger" | "resolve";
  /** Deduplication key (required for resolve action) */
  dedupKey?: string;
  /** Experiment name (optional) */
  experimentName?: string;
  /** Variant name (optional) */
  variantName?: string;
  /** Metric name (optional) */
  metric?: string;
  /** Metric value (optional) */
  value?: number;
  /** Threshold value (optional) */
  threshold?: number;
  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * PagerDuty Notification Response
 */
export interface PagerDutyNotificationResponse {
  success: boolean;
  data?: {
    action: "trigger" | "resolve";
    channel: "pagerduty";
    incidentKey?: string;
    dedupKey?: string;
    timestamp: Date;
  };
  error?: string;
  details?: string;
  message?: string;
}

/**
 * Notification Config Response (for GET requests)
 */
export interface NotificationConfigResponse {
  success: boolean;
  data?: {
    id: string;
    userId: string;
    channel: "slack" | "pagerduty" | "email";
    webhookUrl?: string;
    routingKey?: string;
    enabled: boolean;
    alertLevels: AlertLevel[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  } | null;
  error?: string;
  message?: string;
}

/**
 * Generic Error Response
 */
export interface NotificationErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: string;
}
