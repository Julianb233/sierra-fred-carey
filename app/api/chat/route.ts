import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse, ChatMessage } from "@/lib/ai/client";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getOptionalUserId } from "@/lib/auth";
import {
  runDiagnosticAnalysis,
  type ConversationContext,
} from "@/lib/ai/diagnostic-engine";

/**
 * POST /api/chat
 * Chat with Fred Carey AI assistant
 *
 * SECURITY: Optional authentication - works for both authenticated and anonymous users
 * Note: For authenticated users, we can provide personalized responses
 *
 * Now includes diagnostic engine for intelligent framework selection
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (optional for chat)
    // Chat can work without auth, but personalized if authenticated
    const userId = await getOptionalUserId();

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

    // Generate response using the diagnostic-enhanced system prompt
    const trackedResult = await generateTrackedResponse(
      messages,
      diagnosticAnalysis.systemPrompt,
      {
        userId: userId || undefined,
        analyzer: "chat",
        inputData: {
          message,
          historyLength: history?.length || 0,
          diagnosticMode: diagnosticAnalysis.state.currentMode,
        },
      }
    );

    return NextResponse.json({
      response: trackedResult.content,
      timestamp: new Date().toISOString(),
      diagnostic: {
        mode: diagnosticAnalysis.state.currentMode,
        positioningSignalStrength: diagnosticAnalysis.state.positioningSignalStrength,
        investorSignalStrength: diagnosticAnalysis.state.investorSignalStrength,
        introduction: diagnosticAnalysis.introduction,
      },
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
