import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    model: "gpt-4-turbo-preview",
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
    model: "gpt-4-turbo-preview",
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
