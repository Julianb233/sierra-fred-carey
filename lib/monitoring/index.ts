/**
 * Monitoring Module
 * Centralized exports for A/B testing monitoring and alerting
 */

// Core metrics and comparison
export {
  collectVariantMetrics,
  compareExperimentVariants,
  getMonitoringDashboard,
  logVariantAssignment,
  AUTO_NOTIFY_ALERTS,
  type VariantMetrics,
  type ExperimentComparison,
  type Alert,
} from "./ab-test-metrics";

// Alert notification system
export {
  notifyAlerts,
  notifyUserAlerts,
  scheduleAlertNotifications,
  type AlertNotificationConfig,
} from "./alert-notifier";

// Alert scheduler
export {
  runAlertNotificationCheck,
  AlertScheduler,
  getAlertScheduler,
  startGlobalAlertScheduler,
  stopGlobalAlertScheduler,
} from "./alert-scheduler";
