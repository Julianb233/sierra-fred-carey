/**
 * Boardy Webhook API Route
 * AI-3587: Boardy.ai warm investor introductions
 *
 * POST /api/boardy/webhook - Receive match notifications from Boardy
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { createMatch, updateMatchStatus } from "@/lib/db/boardy";
import type { BoardyWebhookPayload, BoardyMatchType } from "@/lib/boardy/types";

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
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.BOARDY_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (webhookSecret) {
    const signature =
      request.headers.get("x-boardy-signature") ||
      request.headers.get("x-webhook-signature");
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  }

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
        const userId = await resolveUserId(supabase, payload);
        if (!userId) {
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
        const match = await findMatchByRef(supabase, payload.referenceId);
        if (match) await updateMatchStatus(supabase, match.id as string, "connected");
        return NextResponse.json({ success: true, action: "match_accepted" });
      }
      case "match.declined": {
        const match = await findMatchByRef(supabase, payload.referenceId);
        if (match) await updateMatchStatus(supabase, match.id as string, "declined");
        return NextResponse.json({ success: true, action: "match_declined" });
      }
      case "intro.completed": {
        const match = await findMatchByRef(supabase, payload.referenceId);
        if (match) await updateMatchStatus(supabase, match.id as string, "intro_sent");
        return NextResponse.json({ success: true, action: "intro_completed" });
      }
      default:
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

async function resolveUserId(
  supabase: ReturnType<typeof createServiceClient>,
  payload: BoardyWebhookPayload
): Promise<string | null> {
  const { data } = await supabase
    .from("boardy_matches")
    .select("user_id")
    .eq("boardy_reference_id", payload.referenceId)
    .limit(1)
    .single();
  if (data?.user_id) return data.user_id as string;
  if (payload.metadata?.externalUserId) return payload.metadata.externalUserId as string;
  return null;
}

async function findMatchByRef(
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

function mapMatchType(type: string): BoardyMatchType {
  const n = type?.toLowerCase() || "";
  if (n.includes("invest") || n.includes("vc") || n.includes("angel")) return "investor";
  if (n.includes("mentor")) return "mentor";
  if (n.includes("partner")) return "partner";
  return "advisor";
}

function formatMatchName(match: { name: string; company?: string }): string {
  return match.name && match.company ? `${match.name}, ${match.company}` : match.name || "Unknown";
}
