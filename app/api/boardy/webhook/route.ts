/**
 * Boardy Webhook API Route
 * AI-3587: Boardy.ai warm investor introductions
 *
 * POST /api/boardy/webhook - Receive match notifications from Boardy
 *
 * Boardy sends webhooks when:
 * - match.created: A warm intro opportunity is found (double opt-in pending)
 * - match.accepted: Both parties agreed to connect
 * - match.declined: One party declined
 * - intro.completed: Introduction has been made
 *
 * Security: Validates webhook signature via BOARDY_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { createMatch, updateMatchStatus, getMatchById } from "@/lib/db/boardy";
import type { BoardyWebhookPayload } from "@/lib/boardy/types";

// ============================================================================
// Webhook Signature Verification
// ============================================================================

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// POST /api/boardy/webhook
// ============================================================================

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.BOARDY_WEBHOOK_SECRET;

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify signature if secret is configured
  if (webhookSecret) {
    const signature = request.headers.get("x-boardy-signature")
      || request.headers.get("x-webhook-signature");

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[Boardy Webhook] Invalid signature");
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  }

  // Parse payload
  let payload: BoardyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!payload.event || !payload.referenceId) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: event, referenceId" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (payload.event) {
      case "match.created": {
        // Find the user associated with this reference
        // The referenceId should map to an existing user via boardy_reference_id
        // or externalUserId from the initial call request
        const userId = await resolveUserId(supabase, payload);
        if (!userId) {
          console.warn(
            `[Boardy Webhook] Could not resolve user for ref ${payload.referenceId}`
          );
          // Still return 200 to prevent Boardy from retrying
          return NextResponse.json({ success: true, action: "skipped" });
        }

        if (payload.match) {
          await createMatch(supabase, {
            userId,
            matchType: mapMatchType(payload.match.type),
            matchName: formatMatchName(payload.match),
            matchDescription: payload.match.description || "",
            matchScore: payload.match.score ?? 0.8,
            status: "suggested",
            boardyReferenceId: payload.referenceId,
            metadata: {
              source: "boardy_webhook",
              event: payload.event,
              linkedinUrl: payload.match.linkedinUrl,
              title: payload.match.title,
              company: payload.match.company,
              ...payload.metadata,
            },
          });
        }

        return NextResponse.json({ success: true, action: "match_created" });
      }

      case "match.accepted": {
        // Update existing match to "connected" status
        const match = await findMatchByReference(supabase, payload.referenceId);
        if (match) {
          await updateMatchStatus(supabase, match.id, "connected");
        }
        return NextResponse.json({ success: true, action: "match_accepted" });
      }

      case "match.declined": {
        const match = await findMatchByReference(supabase, payload.referenceId);
        if (match) {
          await updateMatchStatus(supabase, match.id, "declined");
        }
        return NextResponse.json({ success: true, action: "match_declined" });
      }

      case "intro.completed": {
        const match = await findMatchByReference(supabase, payload.referenceId);
        if (match) {
          await updateMatchStatus(supabase, match.id, "intro_sent");
        }
        return NextResponse.json({ success: true, action: "intro_completed" });
      }

      default:
        console.warn(`[Boardy Webhook] Unknown event: ${payload.event}`);
        return NextResponse.json({ success: true, action: "ignored" });
    }
  } catch (error) {
    console.error("[Boardy Webhook] Processing error:", error);
    return NextResponse.json(
      { success: false, error: "Internal processing error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function resolveUserId(
  supabase: ReturnType<typeof createServiceClient>,
  payload: BoardyWebhookPayload
): Promise<string | null> {
  // Try to find a user who has a match with this boardy_reference_id
  const { data } = await supabase
    .from("boardy_matches")
    .select("user_id")
    .eq("boardy_reference_id", payload.referenceId)
    .limit(1)
    .single();

  if (data?.user_id) return data.user_id;

  // Check metadata for externalUserId
  if (payload.metadata?.externalUserId) {
    return payload.metadata.externalUserId as string;
  }

  return null;
}

async function findMatchByReference(
  supabase: ReturnType<typeof createServiceClient>,
  referenceId: string
) {
  const { data } = await supabase
    .from("boardy_matches")
    .select("*")
    .eq("boardy_reference_id", referenceId)
    .limit(1)
    .single();

  return data;
}

function mapMatchType(type: string): "investor" | "advisor" | "mentor" | "partner" {
  const normalized = type?.toLowerCase() || "";
  if (normalized.includes("invest") || normalized.includes("vc") || normalized.includes("angel")) {
    return "investor";
  }
  if (normalized.includes("mentor")) return "mentor";
  if (normalized.includes("partner")) return "partner";
  return "advisor";
}

function formatMatchName(match: { name: string; company?: string }): string {
  if (match.name && match.company) {
    return `${match.name}, ${match.company}`;
  }
  return match.name || "Unknown";
}
