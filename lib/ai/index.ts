/**
 * Unified Intelligence Architecture
 *
 * Centralized AI library with:
 * - Database-driven configuration
 * - A/B testing support
 * - Request/response logging
 * - Automatic insight extraction
 * - Multi-provider fallback
 */

// Core AI client
export {
  generateChatResponse,
  generateStreamingResponse,
  generateTrackedResponse,
  type ChatMessage,
} from "./client";

// Configuration management
export {
  getAIConfig,
  getActivePrompt,
  clearConfigCache,
  getMultipleConfigs,
  updateAIConfig,
  type AIConfig,
  type AIPrompt,
} from "./config-loader";

// A/B testing
export {
  getVariantAssignment,
  getActiveExperiments,
  recordVariantUsage,
  getVariantStats,
  createExperiment,
  endExperiment,
  type ABVariant,
} from "./ab-testing";

// Insight extraction
export {
  extractInsights,
  saveInsights,
  extractAndSaveInsights,
  getUserInsights,
  dismissInsight,
  type ExtractedInsight,
} from "./insight-extractor";
