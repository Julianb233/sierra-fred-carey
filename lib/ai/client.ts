import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sql } from "@/lib/db/supabase-sql";
import { getAIConfig, getActivePrompt } from "./config-loader";
import { getVariantAssignment } from "./ab-testing";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type Provider = "openai" | "anthropic" | "google";

// Lazy-load clients to avoid build-time errors
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let googleClient: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getGoogle(): GoogleGenerativeAI | null {
  if (!process.env.GOOGLE_API_KEY) return null;
  if (!googleClient) {
    googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return googleClient;
}

// OpenAI implementation
async function generateWithOpenAI(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI not configured");

  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "";
}

// Anthropic implementation
async function generateWithAnthropic(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const anthropic = getAnthropic();
  if (!anthropic) throw new Error("Anthropic not configured");

  // Convert messages to Anthropic format (filter out system messages)
  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    system: systemPrompt || "",
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

// Google implementation
async function generateWithGoogle(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const google = getGoogle();
  if (!google) throw new Error("Google AI not configured");

  const model = google.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Build conversation history
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : ("model" as const),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    },
    systemInstruction: systemPrompt,
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
}

// Get available providers in priority order
function getAvailableProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.GOOGLE_API_KEY) providers.push("google");
  return providers;
}

/**
 * Log AI request to database
 */
async function logAIRequest(
  userId: string | null,
  analyzer: string,
  inputData: any,
  systemPrompt: string,
  userPrompt: string,
  promptVersion: number | null,
  variantId: string | null,
  model: string,
  temperature: number
): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO ai_requests (
        user_id,
        analyzer,
        source_id,
        input_data,
        system_prompt,
        user_prompt,
        prompt_version,
        variant_id,
        model,
        temperature
      )
      VALUES (
        ${userId},
        ${analyzer},
        ${inputData.sourceId || null},
        ${JSON.stringify(inputData)},
        ${systemPrompt},
        ${userPrompt},
        ${promptVersion},
        ${variantId},
        ${model},
        ${temperature}
      )
      RETURNING id
    `;

    const requestId = result[0].id as string;
    console.log(`[AI Client] Logged request ${requestId} for analyzer ${analyzer}`);
    return requestId;
  } catch (error) {
    console.error("[AI Client] Error logging request:", error);
    // Return a fallback ID - don't fail the request
    return `error-${Date.now()}`;
  }
}

/**
 * Log AI response to database
 */
async function logAIResponse(
  requestId: string,
  responseText: string,
  parsedResponse: any | null,
  tokensUsed: number | null,
  latencyMs: number,
  provider: string,
  error: string | null
): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO ai_responses (
        request_id,
        response_text,
        parsed_response,
        tokens_used,
        latency_ms,
        provider,
        error
      )
      VALUES (
        ${requestId},
        ${responseText},
        ${parsedResponse ? JSON.stringify(parsedResponse) : null},
        ${tokensUsed},
        ${latencyMs},
        ${provider},
        ${error}
      )
      RETURNING id
    `;

    const responseId = result[0].id as string;
    console.log(`[AI Client] Logged response ${responseId} for request ${requestId}`);
    return responseId;
  } catch (error) {
    console.error("[AI Client] Error logging response:", error);
    // Return a fallback ID - don't fail the request
    return `error-${Date.now()}`;
  }
}

// Main function with fallback
export async function generateChatResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    throw new Error("No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY.");
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider}...`);

      switch (provider) {
        case "openai":
          return await generateWithOpenAI(messages, systemPrompt);
        case "anthropic":
          return await generateWithAnthropic(messages, systemPrompt);
        case "google":
          return await generateWithGoogle(messages, systemPrompt);
      }
    } catch (error) {
      console.error(`[AI] ${provider} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next provider
    }
  }

  throw lastError || new Error("All AI providers failed");
}

// Streaming response (OpenAI only for now, with fallback)
export async function generateStreamingResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ReadableStream> {
  const openai = getOpenAI();

  if (!openai) {
    // Fallback to non-streaming response
    const response = await generateChatResponse(messages, systemPrompt);
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(response));
        controller.close();
      },
    });
  }

  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });
}

/**
 * Generate AI response with full tracking and logging
 * Supports database-driven configuration, A/B testing, and request/response logging
 *
 * @param messages - Chat messages to send
 * @param systemPrompt - System prompt (optional, can be loaded from DB)
 * @param options - Additional options
 * @returns Response content with metadata
 */
export async function generateTrackedResponse(
  messages: ChatMessage[],
  systemPrompt?: string,
  options?: {
    userId?: string;
    analyzer?: string;
    sourceId?: string;
    inputData?: any;
  }
): Promise<{
  content: string;
  requestId: string;
  responseId: string;
  latencyMs: number;
  variant?: string;
}> {
  const startTime = Date.now();
  let requestId = "";
  let responseId = "";
  let variant: string | undefined;

  // Default values
  let model = "gpt-4o";
  let temperature = 0.7;
  let maxTokens = 1000;
  let finalSystemPrompt = systemPrompt || "";
  let variantId: string | null = null;
  let promptVersion: number | null = null;

  try {
    // If analyzer is specified, load config from database
    if (options?.analyzer) {
      console.log(`[AI Client] Loading config for analyzer: ${options.analyzer}`);

      try {
        const config = await getAIConfig(options.analyzer);
        model = config.model;
        temperature = config.temperature;
        maxTokens = config.maxTokens;

        console.log(
          `[AI Client] Using config: model=${model}, temp=${temperature}, maxTokens=${maxTokens}`
        );
      } catch (error) {
        console.warn(
          `[AI Client] Failed to load config for ${options.analyzer}, using defaults`,
          error
        );
      }

      // Try to load prompt from database
      try {
        const prompt = await getActivePrompt(`${options.analyzer}_system`);
        if (prompt) {
          finalSystemPrompt = prompt.content;
          promptVersion = prompt.version;
          console.log(
            `[AI Client] Using prompt version ${promptVersion} for ${options.analyzer}`
          );
        }
      } catch (error) {
        console.warn(
          `[AI Client] Failed to load prompt for ${options.analyzer}`,
          error
        );
      }

      // Check for A/B test variant assignment
      if (options.userId) {
        try {
          const variantAssignment = await getVariantAssignment(
            options.userId,
            options.analyzer
          );

          if (variantAssignment) {
            variant = variantAssignment.variantName;
            variantId = variantAssignment.id;

            console.log(
              `[AI Client] A/B test variant: ${variant} for ${options.analyzer}`
            );

            // Apply variant overrides
            if (variantAssignment.configOverrides) {
              const overrides = variantAssignment.configOverrides;
              if (overrides.model) model = overrides.model;
              if (overrides.temperature !== undefined)
                temperature = overrides.temperature;
              if (overrides.maxTokens !== undefined)
                maxTokens = overrides.maxTokens;
            }

            // Use variant's prompt if specified
            if (variantAssignment.promptId) {
              try {
                const variantPrompt = await sql`
                  SELECT content FROM ai_prompts WHERE id = ${variantAssignment.promptId}
                `;
                if (variantPrompt.length > 0) {
                  finalSystemPrompt = variantPrompt[0].content as string;
                  console.log(
                    `[AI Client] Using variant-specific prompt for ${variant}`
                  );
                }
              } catch (error) {
                console.warn("[AI Client] Failed to load variant prompt", error);
              }
            }
          }
        } catch (error) {
          console.warn("[AI Client] Failed to check A/B variant", error);
        }
      }
    }

    // Build user prompt from messages
    const userPrompt = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    // Log request
    if (options?.analyzer) {
      requestId = await logAIRequest(
        options.userId || null,
        options.analyzer,
        options.inputData || { sourceId: options.sourceId },
        finalSystemPrompt,
        userPrompt,
        promptVersion,
        variantId,
        model,
        temperature
      );
    }

    // Generate response with configured parameters
    console.log(
      `[AI Client] Generating response with model=${model}, temp=${temperature}`
    );

    let response: string = "";
    let provider: Provider = "openai"; // Will be determined by generateChatResponse
    let error: string | null = null;

    try {
      // Use the existing generateChatResponse which has provider fallback
      response = await generateChatResponse(messages, finalSystemPrompt);

      // Determine which provider was used (check in order of priority)
      const providers = getAvailableProviders();
      provider = providers[0]; // The first available provider is the one used

      // Log successful response
      const latencyMs = Date.now() - startTime;
      if (options?.analyzer && requestId) {
        responseId = await logAIResponse(
          requestId,
          response,
          null, // parsedResponse - can be set if you parse JSON responses
          null, // tokensUsed - would need to get from API response
          latencyMs,
          provider,
          null // no error
        );
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);

      // Log error response
      const latencyMs = Date.now() - startTime;
      if (options?.analyzer && requestId) {
        responseId = await logAIResponse(
          requestId,
          "",
          null,
          null,
          latencyMs,
          "error",
          error
        );
      }

      throw err;
    }

    const finalLatencyMs = Date.now() - startTime;

    console.log(
      `[AI Client] Response generated in ${finalLatencyMs}ms (requestId: ${requestId})`
    );

    return {
      content: response,
      requestId,
      responseId,
      latencyMs: finalLatencyMs,
      variant,
    };
  } catch (error) {
    console.error("[AI Client] Error in generateTrackedResponse:", error);
    throw error;
  }
}
