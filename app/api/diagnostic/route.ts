import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import {
  runDiagnosticAnalysis,
  type ConversationContext,
} from "@/lib/ai/diagnostic-engine";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";
import { sanitizeUserInput, detectInjectionAttempt } from "@/lib/ai/guards/prompt-guard";

/**
 * POST /api/diagnostic
 * Analyze conversation and determine which framework to apply
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalUserId();

    // SECURITY: Rate limit diagnostic analysis to prevent abuse
    const identifier = userId || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const rateLimitResult = await checkRateLimit(`diagnostic:analyze:${identifier}`, {
      limit: 30,
      windowSeconds: 60,
    });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { messages, hasUploadedDeck, userProfile } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // SECURITY: Check user messages for prompt injection attempts
    const userMessages = messages.filter((m: { role: string; content: string }) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (lastUserMessage) {
      const injectionCheck = detectInjectionAttempt(lastUserMessage.content);
      if (injectionCheck.isInjection) {
        return NextResponse.json(
          { error: "Input rejected: potentially harmful content detected" },
          { status: 400 }
        );
      }
    }

    const context: ConversationContext = {
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.role === "user" ? sanitizeUserInput(m.content) : m.content,
      })),
      hasUploadedDeck: hasUploadedDeck || false,
      userProfile: userProfile || undefined,
    };

    const analysis = runDiagnosticAnalysis(buildSystemPrompt(""), context);

    return NextResponse.json({
      state: {
        currentMode: analysis.state.currentMode,
        positioningSignalStrength: analysis.state.positioningSignalStrength,
        investorSignalStrength: analysis.state.investorSignalStrength,
        shouldIntroducePositioning: analysis.state.shouldIntroducePositioning,
        shouldIntroduceInvestor: analysis.state.shouldIntroduceInvestor,
      },
      introduction: analysis.introduction,
      userId: userId || null,
    });
  } catch (error) {
    console.error("Diagnostic API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze conversation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/diagnostic
 * Get available frameworks and their descriptions
 */
export async function GET() {
  return NextResponse.json({
    frameworks: [
      {
        id: "startup-process",
        name: "9-Step Startup Process",
        description: "Gating process from idea to traction",
        steps: 9,
      },
      {
        id: "positioning",
        name: "Positioning Readiness Framework",
        description: "Market clarity diagnostic with A-F grades",
        categories: 4,
      },
      {
        id: "investor-lens",
        name: "Investor Lens",
        description: "VC evaluation for Pre-Seed, Seed, Series A",
        stages: 3,
      },
      {
        id: "reality-lens",
        name: "Reality Lens",
        description: "5 Dimensions: Feasibility, Economics, Demand, Distribution, Timing",
        dimensions: 5,
      },
    ],
  });
}
