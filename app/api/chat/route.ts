import { NextRequest, NextResponse } from "next/server";
import { generateFromMessages, hasAnyProvider } from "@/lib/ai";
import { FRED_CAREY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  runDiagnosticAnalysis,
  type ConversationContext,
} from "@/lib/ai/diagnostic-engine";
import type { ModelMessage } from "ai";

/**
 * POST /api/chat
 * Chat with Fred Carey AI assistant
 *
 * SECURITY: Works for both authenticated and anonymous users
 * Uses Vercel AI SDK 6 for unified provider abstraction
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

    // Check if any AI provider is available
    if (!hasAnyProvider()) {
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Build conversation history for context
    const messages: ModelMessage[] = [];

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
          content: typeof m.content === "string" ? m.content : "[complex content]",
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

    // Generate response using AI SDK 6 (with automatic provider fallback)
    const result = await generateFromMessages(messages, {
      system: systemPrompt,
      model: "primary",
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    const latencyMs = Date.now() - startTime;
    console.log(
      `[Chat API] Response generated in ${latencyMs}ms (${result.usage.totalTokens} tokens)`
    );

    return NextResponse.json({
      response: result.text,
      timestamp: new Date().toISOString(),
      diagnostic: {
        mode: diagnosticMode,
      },
      meta: {
        latencyMs,
        tokens: result.usage.totalTokens,
        model: result.modelId,
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
