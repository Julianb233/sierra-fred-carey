/**
 * FRED Chat API Endpoint
 * Phase 21: Tier-based model routing and memory gating
 * Phase 28-02: Push notification triggers for red flags and wellbeing alerts
 *
 * POST /api/fred/chat
 * Interactive chat with FRED using streaming responses.
 * Returns Server-Sent Events (SSE) with real-time updates.
 *
 * Tier behavior:
 * - Free:   session-only memory, fast model (GPT-4o-mini)
 * - Pro:    persistent 30-day memory, primary model (GPT-4o)
 * - Studio: persistent 90-day memory, primary model (GPT-4o), higher token limit
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createFredService } from "@/lib/fred/service";
import { storeEpisode, enforceRetentionLimits } from "@/lib/db/fred-memory";
import { checkRateLimitForUser, RATE_LIMIT_TIERS } from "@/lib/api/rate-limit";
import { getUserTier } from "@/lib/api/tier-middleware";
import { UserTier, TIER_NAMES, type MemoryTier } from "@/lib/constants";
import { getModelForTier } from "@/lib/ai/tier-routing";
import { sanitizeUserInput, detectInjectionAttempt } from "@/lib/ai/guards/prompt-guard";
import { extractProfileEnrichment } from "@/lib/fred/enrichment/extractor";
import { createServiceClient } from "@/lib/supabase/server";
import { createRedFlag } from "@/lib/db/red-flags";
import { withLogging } from "@/lib/api/with-logging";
import { notifyRedFlag, notifyWellbeingAlert } from "@/lib/push/triggers";
import { serverTrack } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { buildFounderContext } from "@/lib/fred/context-builder";
import { getOrCreateConversationState, getRealityLensGate, checkGateStatus, getGateRedirectCount, incrementGateRedirect, getActiveMode, updateActiveMode, markIntroductionDelivered } from "@/lib/db/conversation-state";
import type { ConversationState, ModeContext } from "@/lib/db/conversation-state";
import { buildStepGuidanceBlock, buildDriftRedirectBlock, buildRealityLensGateBlock, buildRealityLensStatusBlock, buildFrameworkInjectionBlock, buildModeTransitionBlock } from "@/lib/ai/prompts";
import { determineModeTransition, type DiagnosticMode } from "@/lib/ai/diagnostic-engine";
import type { ConversationStateContext } from "@/lib/fred/types";

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
// Enrichment Helper (fire-and-forget)
// ============================================================================

/**
 * Run enrichment extraction on conversation messages and persist any new data
 * to the profiles table. This is best-effort; errors are logged but never thrown.
 */
function fireEnrichment(
  userId: string,
  messages: Array<{ role: string; content: string }>
): void {
  // Fire-and-forget: do NOT await
  (async () => {
    try {
      const enrichment = extractProfileEnrichment(messages);
      if (!enrichment) return;

      const supabase = createServiceClient();

      // Fetch current profile to avoid overwriting existing data
      const { data: profile } = await supabase
        .from("profiles")
        .select("industry, enrichment_data")
        .eq("id", userId)
        .single();

      // Build update payload -- only fill in fields that are currently empty
      const updates: Record<string, unknown> = {};

      if (enrichment.industry && !profile?.industry) {
        updates.industry = enrichment.industry;
      }

      // Merge enrichment data into existing enrichment_data JSONB column
      const existingData = (profile?.enrichment_data as Record<string, unknown>) || {};
      const newData: Record<string, unknown> = { ...existingData };
      let hasNewData = false;

      if (enrichment.revenueHint && !existingData.revenueHint) {
        newData.revenueHint = enrichment.revenueHint;
        hasNewData = true;
      }
      if (enrichment.teamSizeHint && !existingData.teamSizeHint) {
        newData.teamSizeHint = enrichment.teamSizeHint;
        hasNewData = true;
      }
      if (enrichment.fundingHint && !existingData.fundingHint) {
        newData.fundingHint = enrichment.fundingHint;
        hasNewData = true;
      }
      if (enrichment.challenges && enrichment.challenges.length > 0) {
        const prev = (existingData.challenges as string[]) || [];
        const merged = [...new Set([...prev, ...enrichment.challenges])];
        if (merged.length > prev.length) {
          newData.challenges = merged;
          hasNewData = true;
        }
      }
      if (enrichment.competitorsMentioned && enrichment.competitorsMentioned.length > 0) {
        const prev = (existingData.competitorsMentioned as string[]) || [];
        const merged = [...new Set([...prev, ...enrichment.competitorsMentioned])];
        if (merged.length > prev.length) {
          newData.competitorsMentioned = merged;
          hasNewData = true;
        }
      }
      if (enrichment.metricsShared && Object.keys(enrichment.metricsShared).length > 0) {
        const prev = (existingData.metricsShared as Record<string, string>) || {};
        const merged = { ...prev, ...enrichment.metricsShared };
        if (Object.keys(merged).length > Object.keys(prev).length) {
          newData.metricsShared = merged;
          hasNewData = true;
        }
      }

      if (hasNewData) {
        updates.enrichment_data = newData;
      }

      // Only update if there's something new
      if (Object.keys(updates).length > 0) {
        updates.enriched_at = new Date().toISOString();
        updates.enrichment_source = "conversation";

        await supabase
          .from("profiles")
          .update(updates)
          .eq("id", userId);
      }
    } catch (error) {
      console.warn("[FRED Chat] Enrichment extraction failed (non-blocking):", error);
    }
  })();
}

// ============================================================================
// Phase 37: Quick Downstream Request Detection (pre-machine, regex-only)
// ============================================================================

/** Request verbs indicating founder wants ACTION, not information */
const QUICK_REQUEST_VERBS = /\b(help|build|create|make|write|review|prepare|start|plan|need|want|should\s*i|how\s*(do\s*i|to|can\s*i)|ready\s*to|let'?s|work\s*on|get\s*(started|ready))\b/;

/**
 * Quick downstream request detection for pre-machine prompt assembly.
 * Requires BOTH a domain keyword AND a request verb.
 * "What is a pitch deck?" -> no match (no request verb)
 * "Help me build a pitch deck" -> match (has "help" + "build" + "pitch deck")
 */
function detectDownstreamRequestQuick(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Gate 1: Must have a request/action verb
  if (!QUICK_REQUEST_VERBS.test(lowerMessage)) return null;

  // Gate 2: Match domain keyword
  if (/\b(pitch\s*deck|investor\s*deck|deck\s*review)\b/.test(lowerMessage)) return "pitch_deck";
  if (/\b(fundrais\w*|raise.*capital|valuation|term\s*sheet)\b/.test(lowerMessage)) return "fundraising";
  if (/\b(hir\w+|recruit\w*|first\s*hire)\b/.test(lowerMessage)) return "hiring";
  if (/\b(patent|ip\s*protect\w*)\b/.test(lowerMessage)) return "patents";
  if (/\b(scal\w+|series\s*[a-c])\b/.test(lowerMessage)) return "scaling";
  if (/\b(marketing\s*campaign|ad\s*spend|paid\s*ads)\b/.test(lowerMessage)) return "marketing_campaign";
  return null;
}

// ============================================================================
// Route Handler
// ============================================================================

async function handlePost(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Require authentication
    const userId = await requireAuth();

    // Check rate limit using actual user tier
    const userTier = await getUserTier(userId);
    const rateLimitKey = TIER_TO_RATE_KEY[userTier] ?? "free";
    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, rateLimitKey);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Resolve tier name for model routing and memory gating (Phase 21)
    const tierName = (TIER_NAMES[userTier] ?? "Free").toLowerCase();
    const _modelProviderKey = getModelForTier(tierName, "chat");

    // Determine if this tier gets persistent memory (Pro+ only)
    const hasPersistentMemory = userTier >= UserTier.PRO;

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

    const { message: rawMessage, context, sessionId, stream, storeInMemory } = parsed.data;

    // Prompt injection guard
    const injectionCheck = detectInjectionAttempt(rawMessage);
    if (injectionCheck.isInjection) {
      return NextResponse.json(
        {
          success: false,
          error: "Your message could not be processed. Please rephrase and try again.",
        },
        { status: 400 }
      );
    }

    const message = sanitizeUserInput(rawMessage);
    const isNewSession = !sessionId;
    const effectiveSessionId = sessionId || crypto.randomUUID();

    // Analytics: track chat events (server-side, fire-and-forget)
    serverTrack(userId, ANALYTICS_EVENTS.CHAT.MESSAGE_SENT, { tier: tierName, messageLength: message.length });
    if (isNewSession) {
      serverTrack(userId, ANALYTICS_EVENTS.CHAT.SESSION_STARTED, { tier: tierName });
    }

    // Phase 21: Only persist memory for Pro+ tiers; Free tier is session-only
    const shouldPersistMemory = storeInMemory && hasPersistentMemory;

    // Phase 34: Load dynamic founder context for personalized mentoring
    const founderContext = await buildFounderContext(userId, hasPersistentMemory);

    // Phase 36: Load conversation state for structured flow
    let conversationState: ConversationState | null = null;
    let stepGuidanceBlock = "";
    try {
      conversationState = await getOrCreateConversationState(userId);
      stepGuidanceBlock = buildStepGuidanceBlock(
        conversationState.currentStep,
        conversationState.stepStatuses,
        conversationState.currentBlockers
      );
    } catch (error) {
      console.warn("[FRED Chat] Failed to load conversation state (non-blocking):", error);
    }

    // Phase 37: Load Reality Lens gate status and check against downstream request
    let rlGateBlock = "";
    let rlStatusBlock = "";
    try {
      const rlGate = await getRealityLensGate(userId);
      if (rlGate) {
        rlStatusBlock = buildRealityLensStatusBlock(rlGate);

        // Check if downstream request detected AND gate is not open
        const downstreamRequest = detectDownstreamRequestQuick(message);
        if (downstreamRequest) {
          // Pass the specific request so only RELEVANT dimensions are checked
          const gateStatus = checkGateStatus(rlGate, downstreamRequest);
          if (!gateStatus.gateOpen) {
            // Load redirect count for compromise mode escalation
            const redirectCount = await getGateRedirectCount(userId, downstreamRequest);

            rlGateBlock = buildRealityLensGateBlock(
              downstreamRequest,
              gateStatus.weakDimensions,
              gateStatus.unassessedDimensions,
              redirectCount
            );

            // Fire-and-forget: increment redirect counter
            incrementGateRedirect(userId, downstreamRequest).catch(err =>
              console.warn("[FRED Chat] Failed to increment gate redirect:", err)
            );
          }
        }
      }
    } catch (error) {
      console.warn("[FRED Chat] Failed to load Reality Lens gate (non-blocking):", error);
    }

    // Phase 38: Load persisted diagnostic mode and run mode transition
    let activeMode: DiagnosticMode = "founder-os";
    let frameworkBlock = "";
    let modeTransitionBlock = "";
    let modeTransitioned = false;

    try {
      const persisted = await getActiveMode(userId);
      activeMode = persisted.activeMode;
      const modeContext = persisted.modeContext;

      // Run mode transition analysis on current message
      const hasUploadedDeck = false; // TODO: detect from attachments when file upload is wired
      const transition = determineModeTransition(
        message,
        activeMode,
        modeContext,
        hasUploadedDeck
      );

      // Update mode if transitioned
      if (transition.transitioned) {
        activeMode = transition.newMode;
        modeTransitioned = true;
      }

      // Build framework injection for system prompt
      frameworkBlock = buildFrameworkInjectionBlock(activeMode);

      // Build introduction block if entering a new mode
      if (transition.needsIntroduction && transition.framework) {
        modeTransitionBlock = buildModeTransitionBlock(
          transition.framework,
          "enter"
        );
      } else if (transition.transitioned && transition.direction === "exit" && transition.framework) {
        modeTransitionBlock = buildModeTransitionBlock(
          transition.framework,
          "exit"
        );
      }

      // Fire-and-forget: persist mode changes and signal history
      updateActiveMode(userId, activeMode, transition.updatedModeContext).catch(err =>
        console.warn("[FRED Chat] Failed to persist mode (non-blocking):", err)
      );

      // Fire-and-forget: mark introduction delivered if needed
      if (transition.needsIntroduction && transition.framework) {
        markIntroductionDelivered(
          userId,
          transition.framework,
          transition.detectedSignals.join(",")
        ).catch(err =>
          console.warn("[FRED Chat] Failed to mark introduction (non-blocking):", err)
        );
      }
    } catch (error) {
      console.warn("[FRED Chat] Failed to load diagnostic mode (non-blocking):", error);
    }

    // Phase 36+38: Build conversation state context for the machine
    const stateContext: ConversationStateContext | null = conversationState
      ? {
          currentStep: conversationState.currentStep,
          stepStatuses: conversationState.stepStatuses,
          processStatus: conversationState.processStatus,
          currentBlockers: conversationState.currentBlockers,
          diagnosticTags: conversationState.diagnosticTags as Record<string, string>,
          founderSnapshot: conversationState.founderSnapshot as Record<string, unknown>,
          progressContext: stepGuidanceBlock,
          activeMode,
          modeTransitioned,
        }
      : null;

    // Assemble full system prompt context
    // Order: founderContext + stepGuidance + rlStatus + rlGate + framework + modeTransition
    const fullContext = [
      founderContext,
      stepGuidanceBlock,
      rlStatusBlock,
      rlGateBlock,
      frameworkBlock,
      modeTransitionBlock,
    ].filter(Boolean).join("\n\n");

    // Create FRED service
    const fredService = createFredService({
      userId,
      sessionId: effectiveSessionId,
      enableObservability: true,
      founderContext: fullContext,
      conversationState: stateContext,
    });

    // Non-streaming response
    if (!stream) {
      const result = await fredService.process({
        message,
        timestamp: new Date(),
        context,
      });

      const latencyMs = Date.now() - startTime;

      // Store in episodic memory only for Pro+ tiers (Phase 21)
      if (shouldPersistMemory) {
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

      // Phase 18-02: Fire-and-forget enrichment extraction
      fireEnrichment(userId, [
        { role: "user", content: message },
        { role: "assistant", content: result.response.content },
      ]);

      // Phase 32-02: Fire-and-forget retention enforcement
      if (shouldPersistMemory) {
        enforceRetentionLimits(userId, tierName as MemoryTier).catch((err) =>
          console.warn("[FRED Chat] Retention enforcement failed:", err)
        );
      }

      // Phase 28-02: Fire-and-forget push for wellbeing alerts (non-streaming)
      if (result.context.validatedInput?.burnoutSignals?.detected) {
        const burnout = result.context.validatedInput.burnoutSignals;
        notifyWellbeingAlert(userId, {
          type: "burnout",
          message: burnout.recommendation || "FRED detected signs of burnout. Take a moment to check in.",
          severity: burnout.stressLevel > 70 ? "high" : burnout.stressLevel > 40 ? "medium" : "low",
        });
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
          topic: result.context.validatedInput?.topic || null,
          confidence: result.context.validatedInput?.confidence || 0,
        },
        wellbeing: result.context.validatedInput?.burnoutSignals?.detected
          ? { signals: result.context.validatedInput.burnoutSignals }
          : null,
        synthesis: result.context.synthesis
          ? {
              recommendation: result.context.synthesis.recommendation,
              confidence: result.context.synthesis.confidence,
            }
          : null,
        meta: {
          latencyMs,
          finalState: result.finalState,
          tier: tierName,
          persistentMemory: hasPersistentMemory,
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
          tier: tierName,
        });

        // Store user message in memory (Pro+ only, Phase 21)
        if (shouldPersistMemory) {
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
              topic: update.context.validatedInput.topic || null,
              confidence: update.context.validatedInput.confidence,
              entities: update.context.validatedInput.entities,
            });

            // Emit wellbeing event when burnout signals detected (Phase 17)
            if (update.context.validatedInput.burnoutSignals?.detected) {
              send("wellbeing", {
                type: "wellbeing",
                signals: update.context.validatedInput.burnoutSignals,
              });

              // Phase 28-02: Fire-and-forget push for wellbeing alerts
              notifyWellbeingAlert(userId, {
                type: "burnout",
                message: update.context.validatedInput.burnoutSignals.recommendation || "FRED detected signs of burnout. Take a moment to check in.",
                severity: update.context.validatedInput.burnoutSignals.stressLevel > 70 ? "high" : update.context.validatedInput.burnoutSignals.stressLevel > 40 ? "medium" : "low",
              });
            }
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

          // Persist and emit red flags if detected during synthesis
          if (update.context.synthesis?.redFlags && update.context.synthesis.redFlags.length > 0) {
            try {
              const persistedFlags = await Promise.all(
                update.context.synthesis.redFlags.map((flag) =>
                  createRedFlag({
                    ...flag,
                    userId,
                    status: flag.status || "active",
                  })
                )
              );
              send("red_flag", { type: "red_flag", flags: persistedFlags });

              // Phase 28-02: Fire-and-forget push for each red flag
              for (const flag of persistedFlags) {
                notifyRedFlag(userId, {
                  id: flag.id,
                  category: flag.category || "general",
                  title: flag.title || flag.description || "New red flag detected",
                  severity: flag.severity || "medium",
                });
              }
            } catch (rfError) {
              console.warn("[FRED Chat] Failed to persist red flags:", rfError);
            }
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
                tier: tierName,
                persistentMemory: hasPersistentMemory,
              },
            });

            // Store assistant response in memory (Pro+ only, Phase 21)
            if (shouldPersistMemory) {
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

            // Phase 18-02: Fire-and-forget enrichment extraction
            fireEnrichment(userId, [
              { role: "user", content: message },
              { role: "assistant", content: response.content },
            ]);

            // Phase 32-02: Fire-and-forget retention enforcement
            if (shouldPersistMemory) {
              enforceRetentionLimits(userId, tierName as MemoryTier).catch((err) =>
                console.warn("[FRED Chat] Retention enforcement failed:", err)
              );
            }
          }
        }
      } catch (error) {
        console.error("[FredChat] Streaming error:", error);
        send("error", {
          message: "An error occurred while processing your request",
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

    console.error("[FredChat] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Phase 25-02: Wrap with structured logging
export const POST = withLogging(handlePost as (request: Request, context?: unknown) => Promise<Response>);
