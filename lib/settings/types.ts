/**
 * User Settings Types
 *
 * Comprehensive TypeScript interfaces for user settings management.
 * Supports profile, notifications, API keys, display preferences, and timezone settings.
 */

/**
 * Timezone options - common timezones for business use
 */
export type Timezone =
  | "UTC"
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "Europe/London"
  | "Europe/Paris"
  | "Asia/Tokyo"
  | "Asia/Shanghai"
  | "Australia/Sydney";

/**
 * Display theme options
 */
export type Theme = "light" | "dark" | "system";

/**
 * Language options
 */
export type Language = "en" | "es" | "fr" | "de" | "ja" | "zh";

/**
 * Notification channel types
 */
export type NotificationChannel = "email" | "sms" | "slack" | "pagerduty";

/**
 * Notification event types
 */
export type NotificationEvent =
  | "check_in_reminder"
  | "weekly_digest"
  | "milestone_achieved"
  | "investor_activity"
  | "document_shared"
  | "payment_processed"
  | "security_alert"
  | "feature_announcement"
  | "marketing"
  | "experiment_alert"
  | "performance_alert";

/**
 * API key scope/permissions
 */
export type APIKeyScope =
  | "read"
  | "write"
  | "admin"
  | "analytics"
  | "documents"
  | "check-ins";

/**
 * API key status
 */
export type APIKeyStatus = "active" | "revoked" | "expired";

/**
 * Notification preferences for a specific channel and event type
 */
export interface NotificationPreference {
  channel: NotificationChannel;
  event: NotificationEvent;
  enabled: boolean;
}

/**
 * Comprehensive notification preferences
 */
export interface NotificationPrefs {
  // Email notifications
  email: {
    enabled: boolean;
    checkInReminders: boolean;
    weeklyDigest: boolean;
    milestones: boolean;
    investorActivity: boolean;
    documentShared: boolean;
    securityAlerts: boolean;
    marketing: boolean;
  };

  // SMS notifications
  sms: {
    enabled: boolean;
    checkInReminders: boolean;
    securityAlerts: boolean;
    phoneNumber?: string;
    phoneVerified: boolean;
  };

  // Slack notifications
  slack: {
    enabled: boolean;
    webhookUrl?: string;
    channels: string[];
    events: NotificationEvent[];
  };

  // PagerDuty notifications
  pagerDuty: {
    enabled: boolean;
    integrationKey?: string;
    severity: "low" | "high" | "critical";
  };

  // Quiet hours
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: Timezone;
  };

  // Digest preferences
  digest: {
    frequency: "daily" | "weekly" | "monthly" | "never";
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm format
  };
}

/**
 * API Key settings and metadata
 */
export interface APIKeySettings {
  id: string;
  name: string;
  key: string; // Hashed in DB, masked in responses
  keyPrefix: string; // First 8 chars for identification (e.g., "sk_live_")
  scopes: APIKeyScope[];
  status: APIKeyStatus;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  metadata: {
    description?: string;
    ipWhitelist?: string[];
    rateLimit?: number;
    environment?: "development" | "staging" | "production";
  };
}

/**
 * Display and UI preferences
 */
export interface DisplayPrefs {
  theme: Theme;
  language: Language;
  compactMode: boolean;
  showOnboarding: boolean;
  sidebarCollapsed: boolean;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  currency: "USD" | "EUR" | "GBP" | "JPY";
  numberFormat: "1,234.56" | "1.234,56" | "1 234.56";
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  profileVisibility: "public" | "private" | "team";
  shareAnalytics: boolean;
  allowContactFromInvestors: boolean;
  showActivityStatus: boolean;
  dataRetentionDays: number;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: "app" | "sms" | "email" | null;
  sessionTimeout: number; // minutes
  requireReauthForSensitive: boolean;
  loginNotifications: boolean;
  trustedDevices: Array<{
    id: string;
    name: string;
    lastUsed: Date;
    trusted: boolean;
  }>;
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  stripe: {
    connected: boolean;
    accountId?: string;
    webhooksEnabled: boolean;
  };
  google: {
    connected: boolean;
    calendarSync: boolean;
    driveBackup: boolean;
  };
  slack: {
    connected: boolean;
    workspaceId?: string;
    defaultChannel?: string;
  };
  customWebhooks: Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
  }>;
}

/**
 * Complete user settings object
 */
export interface UserSettings {
  // Identity
  userId: string;

  // Profile information
  profile: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    company?: string;
    jobTitle?: string;
    bio?: string;
    avatarUrl?: string;
    websiteUrl?: string;
    linkedinUrl?: string;
    twitterHandle?: string;
  };

  // Preferences
  notifications: NotificationPrefs;
  display: DisplayPrefs;
  privacy: PrivacySettings;
  security: SecuritySettings;

  // Timezone settings
  timezone: Timezone;
  autoDetectTimezone: boolean;

  // Feature flags
  features: {
    betaFeatures: boolean;
    experimentalAI: boolean;
    advancedAnalytics: boolean;
    customBranding: boolean;
  };

  // Integrations
  integrations: IntegrationSettings;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

/**
 * Partial update type for settings
 */
export type UserSettingsUpdate = Partial<
  Omit<UserSettings, "userId" | "createdAt" | "updatedAt">
>;

/**
 * Default settings factory
 */
export function getDefaultSettings(userId: string): UserSettings {
  return {
    userId,
    profile: {
      fullName: "",
      email: "",
    },
    notifications: {
      email: {
        enabled: true,
        checkInReminders: true,
        weeklyDigest: true,
        milestones: true,
        investorActivity: true,
        documentShared: true,
        securityAlerts: true,
        marketing: false,
      },
      sms: {
        enabled: false,
        checkInReminders: false,
        securityAlerts: false,
        phoneVerified: false,
      },
      slack: {
        enabled: false,
        channels: [],
        events: [],
      },
      pagerDuty: {
        enabled: false,
        severity: "high",
      },
      quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
        timezone: "America/New_York",
      },
      digest: {
        frequency: "weekly",
        dayOfWeek: 1, // Monday
        time: "09:00",
      },
    },
    display: {
      theme: "system",
      language: "en",
      compactMode: false,
      showOnboarding: true,
      sidebarCollapsed: false,
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      currency: "USD",
      numberFormat: "1,234.56",
    },
    privacy: {
      profileVisibility: "private",
      shareAnalytics: true,
      allowContactFromInvestors: true,
      showActivityStatus: true,
      dataRetentionDays: 365,
    },
    security: {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      sessionTimeout: 60,
      requireReauthForSensitive: true,
      loginNotifications: true,
      trustedDevices: [],
    },
    timezone: "America/New_York",
    autoDetectTimezone: true,
    features: {
      betaFeatures: false,
      experimentalAI: false,
      advancedAnalytics: false,
      customBranding: false,
    },
    integrations: {
      stripe: {
        connected: false,
        webhooksEnabled: false,
      },
      google: {
        connected: false,
        calendarSync: false,
        driveBackup: false,
      },
      slack: {
        connected: false,
      },
      customWebhooks: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    onboardingCompleted: false,
    onboardingStep: 0,
  };
}

/**
 * Validation schemas
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateSettings(settings: Partial<UserSettings>): ValidationResult {
  const errors: Record<string, string> = {};

  // Profile validation
  if (settings.profile) {
    if (settings.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.profile.email)) {
      errors["profile.email"] = "Invalid email format";
    }

    if (settings.profile.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(settings.profile.phoneNumber)) {
      errors["profile.phoneNumber"] = "Invalid phone number format";
    }

    if (settings.profile.fullName && settings.profile.fullName.length > 100) {
      errors["profile.fullName"] = "Name too long (max 100 characters)";
    }
  }

  // Notification validation
  if (settings.notifications?.quietHours?.enabled) {
    const { startTime, endTime } = settings.notifications.quietHours;
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      errors["notifications.quietHours.startTime"] = "Invalid time format";
    }
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      errors["notifications.quietHours.endTime"] = "Invalid time format";
    }
  }

  // Security validation
  if (settings.security?.sessionTimeout) {
    if (settings.security.sessionTimeout < 5 || settings.security.sessionTimeout > 1440) {
      errors["security.sessionTimeout"] = "Session timeout must be between 5 and 1440 minutes";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * API Response types
 */
export interface SettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
  code?: string;
}

export interface APIKeyResponse {
  success: boolean;
  data?: APIKeySettings | APIKeySettings[];
  key?: string; // Only returned on creation
  error?: string;
  code?: string;
}

export interface APIKeyCreateRequest {
  name: string;
  scopes: APIKeyScope[];
  expiresInDays?: number;
  metadata?: APIKeySettings["metadata"];
}

export interface APIKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  scopes: APIKeyScope[];
  status: APIKeyStatus;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}
