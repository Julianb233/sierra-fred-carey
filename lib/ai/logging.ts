/**
 * AI Request/Response Logging
 *
 * Wraps AI operations with comprehensive logging for:
 * - Performance tracking
 * - Cost monitoring
 * - Debug and audit trails
 * - A/B test analysis
 */

import { sql } from "@/lib/db/supabase-sql";
import { type ProviderKey, PROVIDER_METADATA } from "./providers";

// ============================================================================
// Types
// ============================================================================

export interface AIRequestLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  analyzer: string;
  model: string;
  prompt: string;
  systemPrompt: string | null;
  inputTokens: number | null;
  createdAt: Date;
}

export interface AIResponseLog {
  id: string;
  requestId: string;
  response: string;
  parsedResponse: unknown | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  provider: string;
  finishReason: string | null;
  estimatedCost: number | null;
  error: string | null;
  createdAt: Date;
}

export interface LogRequestParams {
  userId?: string;
  sessionId?: string;
  analyzer: string;
  model: ProviderKey;
  prompt: string;
  systemPrompt?: string;
  inputTokens?: number;
}

export interface LogResponseParams {
  requestId: string;
  response: string;
  parsedResponse?: unknown;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  provider: ProviderKey;
  finishReason?: string;
  error?: string;
}

// ============================================================================
// Request Logging
// ============================================================================

/**
 * Log an AI request to the database
 */
export async function logAIRequest(
  params: LogRequestParams
): Promise<string> {
  const {
    userId,
    sessionId,
    analyzer,
    model,
    prompt,
    systemPrompt,
    inputTokens,
  } = params;

  try {
    const result = await sql`
      INSERT INTO ai_requests (
        user_id,
        session_id,
        analyzer,
        model,
        system_prompt,
        user_prompt,
        input_tokens,
        created_at
      )
      VALUES (
        ${userId || null},
        ${sessionId || null},
        ${analyzer},
        ${PROVIDER_METADATA[model].name},
        ${systemPrompt || null},
        ${prompt},
        ${inputTokens || null},
        NOW()
      )
      RETURNING id
    `;

    const requestId = result[0].id as string;
    logger.log(`[AI Logging] Request logged: ${requestId} (${analyzer})`);
    return requestId;
  } catch (error) {
    console.error("[AI Logging] Failed to log request:", error);
    // Return a fallback ID - don't fail the actual AI request
    return `unlogged-${Date.now()}`;
  }
}

/**
 * Log an AI response to the database
 */
export async function logAIResponse(params: LogResponseParams): Promise<string> {
  const {
    requestId,
    response,
    parsedResponse,
    outputTokens,
    totalTokens,
    latencyMs,
    provider,
    finishReason,
    error,
  } = params;

  // Calculate estimated cost
  let estimatedCost: number | null = null;
  if (totalTokens && outputTokens) {
    const inputTokens = totalTokens - outputTokens;
    const metadata = PROVIDER_METADATA[provider];
    estimatedCost =
      (inputTokens / 1_000_000) * metadata.costPerMillionTokens.input +
      (outputTokens / 1_000_000) * metadata.costPerMillionTokens.output;
  }

  try {
    const result = await sql`
      INSERT INTO ai_responses (
        request_id,
        response_text,
        parsed_response,
        output_tokens,
        tokens_used,
        latency_ms,
        provider,
        finish_reason,
        estimated_cost,
        error,
        created_at
      )
      VALUES (
        ${requestId},
        ${response},
        ${parsedResponse ? JSON.stringify(parsedResponse) : null},
        ${outputTokens || null},
        ${totalTokens || null},
        ${latencyMs},
        ${PROVIDER_METADATA[provider].name},
        ${finishReason || null},
        ${estimatedCost},
        ${error || null},
        NOW()
      )
      RETURNING id
    `;

    const responseId = result[0].id as string;
    logger.log(
      `[AI Logging] Response logged: ${responseId} (${latencyMs}ms, ${finishReason || "complete"})`
    );
    return responseId;
  } catch (err) {
    console.error("[AI Logging] Failed to log response:", err);
    return `unlogged-${Date.now()}`;
  }
}

// ============================================================================
// Wrapped AI Operations
// ============================================================================

import {
  generate,
  generateStructured,
  generateFromMessages,
  type GenerateOptions,
  type GenerateResult,
  type StructuredGenerateResult,
} from "./fred-client";
import { type z } from "zod";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import { logger } from "@/lib/logger";

export interface TrackedGenerateOptions extends GenerateOptions {
  userId?: string;
  sessionId?: string;
  analyzer: string;
}

/**
 * Generate text with full request/response logging
 */
export async function trackedGenerate(
  prompt: string,
  options: TrackedGenerateOptions
): Promise<GenerateResult & { requestId: string; responseId: string }> {
  const startTime = Date.now();
  const model = options.model || "primary";

  // Log request
  const requestId = await logAIRequest({
    userId: options.userId,
    sessionId: options.sessionId,
    analyzer: options.analyzer,
    model,
    prompt,
    systemPrompt: options.system,
  });

  try {
    // Generate response
    const result = await generate(prompt, options);
    const latencyMs = Date.now() - startTime;

    // Log response
    const responseId = await logAIResponse({
      requestId,
      response: result.text,
      outputTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      latencyMs,
      provider: model,
      finishReason: result.finishReason,
    });

    return { ...result, requestId, responseId };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log error
    await logAIResponse({
      requestId,
      response: "",
      latencyMs,
      provider: model,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Generate structured output with full request/response logging
 */
export async function trackedGenerateStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: TrackedGenerateOptions
): Promise<StructuredGenerateResult<z.infer<T>> & { requestId: string; responseId: string }> {
  const startTime = Date.now();
  const model = options.model || "primary";

  // Log request
  const requestId = await logAIRequest({
    userId: options.userId,
    sessionId: options.sessionId,
    analyzer: options.analyzer,
    model,
    prompt,
    systemPrompt: options.system,
  });

  try {
    // Generate response
    const result = await generateStructured(prompt, schema, options);
    const latencyMs = Date.now() - startTime;

    // Log response with parsed object
    const responseId = await logAIResponse({
      requestId,
      response: JSON.stringify(result.object),
      parsedResponse: result.object,
      outputTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      latencyMs,
      provider: model,
      finishReason: result.finishReason,
    });

    return { ...result, requestId, responseId };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log error
    await logAIResponse({
      requestId,
      response: "",
      latencyMs,
      provider: model,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Generate from messages with full request/response logging
 */
export async function trackedGenerateFromMessages(
  messages: ModelMessage[],
  options: TrackedGenerateOptions
): Promise<GenerateResult & { requestId: string; responseId: string }> {
  const startTime = Date.now();
  const model = options.model || "primary";

  // Build prompt summary from messages
  const prompt = messages
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : "[complex content]"))
    .join("\n");

  // Log request
  const requestId = await logAIRequest({
    userId: options.userId,
    sessionId: options.sessionId,
    analyzer: options.analyzer,
    model,
    prompt,
    systemPrompt: options.system,
  });

  try {
    // Generate response
    const result = await generateFromMessages(messages, options);
    const latencyMs = Date.now() - startTime;

    // Log response
    const responseId = await logAIResponse({
      requestId,
      response: result.text,
      outputTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      latencyMs,
      provider: model,
      finishReason: result.finishReason,
    });

    return { ...result, requestId, responseId };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log error
    await logAIResponse({
      requestId,
      response: "",
      latencyMs,
      provider: model,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

// ============================================================================
// Analytics Queries
// ============================================================================

/**
 * Get AI usage stats for a user
 */
export async function getUserAIStats(
  userId: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  avgLatencyMs: number;
  errorRate: number;
}> {
  try {
    const result = await sql`
      SELECT
        COUNT(req.id) as total_requests,
        COALESCE(SUM(res.tokens_used), 0) as total_tokens,
        COALESCE(SUM(res.estimated_cost), 0) as estimated_cost,
        COALESCE(AVG(res.latency_ms), 0) as avg_latency_ms,
        COALESCE(
          SUM(CASE WHEN res.error IS NOT NULL THEN 1 ELSE 0 END)::float /
          NULLIF(COUNT(res.id), 0),
          0
        ) as error_rate
      FROM ai_requests req
      LEFT JOIN ai_responses res ON res.request_id = req.id
      WHERE req.user_id = ${userId}
        AND req.created_at > NOW() - INTERVAL '${days} days'
    `;

    const row = result[0];
    return {
      totalRequests: Number(row.total_requests) || 0,
      totalTokens: Number(row.total_tokens) || 0,
      estimatedCost: Number(row.estimated_cost) || 0,
      avgLatencyMs: Number(row.avg_latency_ms) || 0,
      errorRate: Number(row.error_rate) || 0,
    };
  } catch (error) {
    console.error("[AI Logging] Failed to get user stats:", error);
    return {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      avgLatencyMs: 0,
      errorRate: 0,
    };
  }
}

/**
 * Get AI usage stats by analyzer
 */
export async function getAnalyzerStats(
  days: number = 7
): Promise<
  Array<{
    analyzer: string;
    requestCount: number;
    avgLatencyMs: number;
    errorRate: number;
    totalCost: number;
  }>
> {
  try {
    const result = await sql`
      SELECT
        req.analyzer,
        COUNT(req.id) as request_count,
        COALESCE(AVG(res.latency_ms), 0) as avg_latency_ms,
        COALESCE(
          SUM(CASE WHEN res.error IS NOT NULL THEN 1 ELSE 0 END)::float /
          NULLIF(COUNT(res.id), 0),
          0
        ) as error_rate,
        COALESCE(SUM(res.estimated_cost), 0) as total_cost
      FROM ai_requests req
      LEFT JOIN ai_responses res ON res.request_id = req.id
      WHERE req.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY req.analyzer
      ORDER BY request_count DESC
    `;

    return result.map((row: any) => ({
      analyzer: row.analyzer as string,
      requestCount: Number(row.request_count) || 0,
      avgLatencyMs: Number(row.avg_latency_ms) || 0,
      errorRate: Number(row.error_rate) || 0,
      totalCost: Number(row.total_cost) || 0,
    }));
  } catch (error) {
    console.error("[AI Logging] Failed to get analyzer stats:", error);
    return [];
  }
}
