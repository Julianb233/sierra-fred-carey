/**
 * Notification System Types
 * Type definitions for multi-channel notification delivery
 */

export type NotificationChannel = 'slack' | 'pagerduty' | 'email';
export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertType = 'performance' | 'errors' | 'traffic' | 'significance';

/**
 * Notification Configuration
 */
export interface NotificationConfig {
  id: string;
  userId: string;
  channel: NotificationChannel;
  webhookUrl?: string; // For Slack
  apiKey?: string; // For PagerDuty
  emailAddress?: string; // For email
  routingKey?: string; // For PagerDuty
  enabled: boolean;
  alertLevels: AlertLevel[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Payload
 */
export interface NotificationPayload {
  userId: string;
  level: AlertLevel;
  type: AlertType;
  title: string;
  message: string;
  experimentName?: string;
  variantName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

/**
 * Notification Result
 */
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Slack Message Format
 */
export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: any;
}

export interface SlackAttachment {
  color: string;
  blocks?: SlackBlock[];
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
}

/**
 * PagerDuty Event Format
 */
export interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, any>;
  };
  client?: string;
  client_url?: string;
  links?: Array<{
    href: string;
    text: string;
  }>;
}

/**
 * Email Message Format
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Notification Log Entry
 */
export interface NotificationLog {
  id: string;
  userId: string;
  configId: string;
  channel: NotificationChannel;
  alertLevel: AlertLevel;
  alertType: AlertType;
  title: string;
  message: string;
  experimentName?: string;
  variantName?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  attempts: number;
  responseData?: Record<string, any>;
  sentAt?: Date;
  createdAt: Date;
}
