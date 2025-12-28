import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getOptionalUserId } from "@/lib/auth";

/**
 * POST /api/chat
 * Chat with Fred Carey AI assistant
 *
 * SECURITY: Optional authentication - works for both authenticated and anonymous users
 * Note: For authenticated users, we can provide personalized responses
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (optional for chat)
    // Chat can work without auth, but personalized if authenticated
    const userId = await getOptionalUserId();

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation history for context
    const messages: ChatMessage[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        // Last 10 messages for context
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Add the current message
    messages.push({ role: "user", content: message });

    // Generate response using tracked AI client (logs to DB, supports A/B testing)
    const trackedResult = await generateTrackedResponse(
      messages,
      FRED_CAREY_SYSTEM_PROMPT,
      {
        userId: userId || undefined,
        analyzer: "chat",
        inputData: { message, historyLength: history?.length || 0 },
      }
    );

    return NextResponse.json({
      response: trackedResult.content,
      timestamp: new Date().toISOString(),
      meta: {
        requestId: trackedResult.requestId,
        responseId: trackedResult.responseId,
        latencyMs: trackedResult.latencyMs,
        variant: trackedResult.variant,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
