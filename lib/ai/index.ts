/**
 * Unified Intelligence Architecture
 *
 * Centralized AI library with:
 * - Vercel AI SDK 6 integration (new)
 * - Structured outputs with Zod schemas (new)
 * - Multi-provider fallback (OpenAI, Anthropic, Google)
 * - Database-driven configuration
 * - A/B testing support
 * - Request/response logging
 * - Automatic insight extraction
 */

// ============================================================================
// NEW: Vercel AI SDK 6 Client (Recommended)
// ============================================================================

// FRED AI Client - unified interface with AI SDK 6
export {
  generate,
  generateFromMessages,
  generateStructured,
  generateStructuredFromMessages,
  streamGenerate,
  streamGenerateFromMessages,
  streamToGenerator,
  streamToReadableStream,
  streamStructured,
  generateEmbedding,
  generateEmbeddings,
  estimateCost,
  withRetry,
  withTimeout,
  type GenerateOptions,
  type GenerateResult,
  type StructuredGenerateResult,
  type EmbeddingOptions,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from "./fred-client";

// Provider configuration
export {
  getModel,
  getEmbedding,
  getAvailableProviders,
  hasAnyProvider,
  PROVIDER_METADATA,
  EMBEDDING_METADATA,
  type ProviderKey,
  type EmbeddingProviderKey,
  type ProviderConfig,
  type EmbeddingConfig,
} from "./providers";

// Structured output schemas
export * from "./schemas";

// Tracked operations with logging
export {
  trackedGenerate,
  trackedGenerateStructured,
  trackedGenerateFromMessages,
  logAIRequest,
  logAIResponse,
  getUserAIStats,
  getAnalyzerStats,
  type TrackedGenerateOptions,
  type LogRequestParams,
  type LogResponseParams,
  type AIRequestLog,
  type AIResponseLog,
} from "./logging";

// ============================================================================
// LEGACY: Original AI Client (Deprecated - use fred-client instead)
// ============================================================================

// Core AI client (legacy - maintained for backward compatibility)
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
