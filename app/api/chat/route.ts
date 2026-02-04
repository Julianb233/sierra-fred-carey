import { NextRequest, NextResponse } from "next/server";
import { generateChatResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  runDiagnosticAnalysis,
  type ConversationContext,
} from "@/lib/ai/diagnostic-engine";

/**
 * POST /api/chat
 * Chat with Fred Carey AI assistant
 *
 * SECURITY: Works for both authenticated and anonymous users
 * Uses direct AI generation without database tracking for reliability
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { message, history, hasUploadedDeck } = await req.json();

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

    // Run diagnostic analysis to determine which framework to apply
    let systemPrompt = FRED_CAREY_SYSTEM_PROMPT;
    let diagnosticMode = "general";

    try {
      const conversationContext: ConversationContext = {
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        hasUploadedDeck: hasUploadedDeck || false,
      };

      const diagnosticAnalysis = runDiagnosticAnalysis(
        FRED_CAREY_SYSTEM_PROMPT,
        conversationContext
      );

      systemPrompt = diagnosticAnalysis.systemPrompt;
      diagnosticMode = diagnosticAnalysis.state.currentMode;
    } catch (diagError) {
      console.warn("Diagnostic analysis failed, using default prompt:", diagError);
    }

    // Generate response using OpenAI (with fallback to other providers)
    const response = await generateChatResponse(messages, systemPrompt);

    const latencyMs = Date.now() - startTime;
    console.log(`[Chat API] Response generated in ${latencyMs}ms`);

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
      diagnostic: {
        mode: diagnosticMode,
      },
      meta: {
        latencyMs,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Provide more helpful error messages
    let errorMessage = "Failed to process chat message";
    if (error instanceof Error) {
      if (error.message.includes("No AI providers configured")) {
        errorMessage = "AI service not configured. Please contact support.";
      } else if (error.message.includes("API key")) {
        errorMessage = "AI service authentication failed. Please contact support.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
