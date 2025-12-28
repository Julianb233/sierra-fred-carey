import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = req.headers.get("x-user-id") ||
                   req.cookies.get("userId")?.value ||
                   "anonymous";

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

    // Generate response using OpenAI
    const response = await generateChatResponse(
      messages,
      FRED_CAREY_SYSTEM_PROMPT
    );

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
