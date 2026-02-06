/**
 * FRED Chat API Endpoint
 *
 * POST /api/fred/chat
 * Interactive chat with FRED using streaming responses.
 * Returns Server-Sent Events (SSE) with real-time updates.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createFredService } from "@/lib/fred/service";
import { storeEpisode } from "@/lib/db/fred-memory";
import { checkRateLimitForUser, RATE_LIMIT_TIERS } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

/** Map numeric UserTier enum to rate-limit tier key */
const TIER_TO_RATE_KEY: Record<UserTier, keyof typeof RATE_LIMIT_TIERS> = {
  [UserTier.FREE]: "free",
  [UserTier.PRO]: "pro",
  [UserTier.STUDIO]: "studio",
};

// ============================================================================
// Request Schema
// ============================================================================

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(10000),
  context: z
    .object({
      startupName: z.string().optional(),
      stage: z.string().optional(),
      industry: z.string().optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
  sessionId: z.string().uuid().optional(),
  stream: z.boolean().default(true),
  storeInMemory: z.boolean().default(true),
});

// ============================================================================
// SSE Helper
// ============================================================================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Require authentication
    const userId = await requireAuth();

    // Check rate limit using actual user tier
    const userTier = await getUserTier(userId);
    const rateLimitKey = TIER_TO_RATE_KEY[userTier] ?? "free";
    const { response: rateLimitResponse } = checkRateLimitForUser(req, userId, rateLimitKey);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { message, context, sessionId, stream, storeInMemory } = parsed.data;
    const effectiveSessionId = sessionId || crypto.randomUUID();

    // Create FRED service
    const fredService = createFredService({
      userId,
      sessionId: effectiveSessionId,
      enableObservability: true,
    });

    // Non-streaming response
    if (!stream) {
      const result = await fredService.process({
        message,
        timestamp: new Date(),
        context,
      });

      const latencyMs = Date.now() - startTime;

      // Store in episodic memory if requested
      if (storeInMemory) {
        try {
          await storeEpisode(userId, effectiveSessionId, "conversation", {
            role: "user",
            content: message,
            context,
          });
          await storeEpisode(userId, effectiveSessionId, "conversation", {
            role: "assistant",
            content: result.response.content,
            action: result.response.action,
            confidence: result.response.confidence,
          });
        } catch (error) {
          console.warn("[FRED Chat] Failed to store in memory:", error);
        }
      }

      return NextResponse.json({
        success: true,
        sessionId: effectiveSessionId,
        response: {
          content: result.response.content,
          action: result.response.action,
          confidence: result.response.confidence,
          requiresApproval: result.response.requiresApproval,
          reasoning: result.response.reasoning,
        },
        analysis: {
          intent: result.context.validatedInput?.intent || "unknown",
          confidence: result.context.validatedInput?.confidence || 0,
        },
        synthesis: result.context.synthesis
          ? {
              recommendation: result.context.synthesis.recommendation,
              confidence: result.context.synthesis.confidence,
            }
          : null,
        meta: {
          latencyMs,
          finalState: result.finalState,
        },
      });
    }

    // Streaming response
    const { stream: sseStream, send, close } = createSSEStream();

    // Process in background
    (async () => {
      try {
        // Send initial connection event
        send("connected", {
          sessionId: effectiveSessionId,
          timestamp: new Date().toISOString(),
        });

        // Store user message in memory
        if (storeInMemory) {
          try {
            await storeEpisode(userId, effectiveSessionId, "conversation", {
              role: "user",
              content: message,
              context,
            });
          } catch (error) {
            console.warn("[FRED Chat] Failed to store user message:", error);
          }
        }

        // Stream state updates
        let lastState = "";
        for await (const update of fredService.processStream({
          message,
          timestamp: new Date(),
          context,
        })) {
          // Only send if state changed
          if (update.state !== lastState) {
            send("state", {
              state: update.state,
              isComplete: update.isComplete,
              timestamp: new Date().toISOString(),
            });
            lastState = update.state;
          }

          // Send partial context updates
          if (update.context.validatedInput && !update.isComplete) {
            send("analysis", {
              intent: update.context.validatedInput.intent,
              confidence: update.context.validatedInput.confidence,
              entities: update.context.validatedInput.entities,
            });
          }

          if (update.context.mentalModels.length > 0 && !update.isComplete) {
            send("models", {
              models: update.context.mentalModels.map((m) => ({
                model: m.model,
                relevance: m.relevance,
                confidence: m.confidence,
              })),
            });
          }

          if (update.context.synthesis && !update.isComplete) {
            send("synthesis", {
              recommendation: update.context.synthesis.recommendation,
              confidence: update.context.synthesis.confidence,
              reasoning: update.context.synthesis.reasoning,
            });
          }

          // Send final response
          if (update.isComplete) {
            const latencyMs = Date.now() - startTime;

            const response = {
              content: update.context.decision?.content || "Unable to process request.",
              action: update.context.decision?.action || "defer",
              confidence: update.context.decision?.confidence || 0,
              requiresApproval: update.context.decision?.requiresHumanApproval || false,
              reasoning: update.context.decision?.reasoning,
            };

            send("response", {
              ...response,
              meta: {
                latencyMs,
                finalState: update.state,
              },
            });

            // Store assistant response in memory
            if (storeInMemory) {
              try {
                await storeEpisode(userId, effectiveSessionId, "conversation", {
                  role: "assistant",
                  content: response.content,
                  action: response.action,
                  confidence: response.confidence,
                });
              } catch (error) {
                console.warn("[FRED Chat] Failed to store assistant response:", error);
              }
            }

            send("done", {
              sessionId: effectiveSessionId,
              latencyMs,
            });
          }
        }
      } catch (error) {
        console.error("[FRED Chat] Streaming error:", error);
        send("error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        close();
      }
    })();

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Chat] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process chat",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
