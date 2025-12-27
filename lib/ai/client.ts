import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time errors when env var isn't set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const openai = getOpenAI();

  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
}

export async function generateStreamingResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ReadableStream> {
  const openai = getOpenAI();

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
