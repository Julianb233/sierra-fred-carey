/**
 * Conversation Summaries Cron (AI-3522)
 *
 * GET /api/cron/conversation-summaries
 *
 * Authorization: Bearer {CRON_SECRET}
 * Vercel Cron: { "path": "/api/cron/conversation-summaries", "schedule": "0 11 * * *" }
 * (3am PT = 11:00 UTC — runs after overnight activity, before the workday)
 *
 * Automatically summarizes every founder who had conversation activity in the
 * lookback window, persists the structured summary, evaluates the free->paid
 * upsell opportunity, and returns a prioritized list of who needs attention +
 * who is an upsell candidate. Processes in small batches to avoid rate limits.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveUserTier } from "@/lib/db/usage";
import {
  summarizeUserConversations,
  saveSummary,
} from "@/lib/ai/conversation-summarizer";
import { evaluateUpsell } from "@/lib/sales/upsell-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LOG_PREFIX = "[Cron: Conversation Summaries]";
const BATCH_SIZE = 8;
const LOOKBACK_DAYS = 7;
const MAX_USERS = 200; // safety cap per run

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET not configured`);
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(cronSecret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Distinct user ids with conversation activity in the lookback window. */
async function getActiveUserIds(): Promise<string[]> {
  const supabase = createServiceClient();
  const since = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("fred_episodic_memory")
    .select("user_id")
    .eq("event_type", "conversation")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to load active users:`, error.message);
    return [];
  }

  const ids = Array.from(
    new Set((data || []).map((r) => String((r as { user_id: string }).user_id)))
  );
  return ids.slice(0, MAX_USERS);
}

export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIX} Starting scheduled run`);

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  const userIds = await getActiveUserIds();
  console.log(`${LOG_PREFIX} ${userIds.length} active founders to summarize`);

  let processed = 0;
  let failed = 0;
  const attentionQueue: Array<{ userId: string; priority: number; headline: string }> = [];
  const upsellCandidates: Array<{
    userId: string;
    targetTier: number | null;
    urgency: string;
    confidence: number;
  }> = [];

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (userId) => {
        try {
          const [summary, tier] = await Promise.all([
            summarizeUserConversations(userId),
            resolveUserTier(userId),
          ]);

          // Skip empty/no-activity summaries.
          if (summary.sourceEpisodes === 0) return;

          const upsell = evaluateUpsell({ currentTier: tier, summary });
          await saveSummary(userId, summary, {
            recommend: upsell.recommend,
            targetTier: upsell.targetTier,
            urgency: upsell.urgency,
            confidence: upsell.confidence,
          });

          processed++;
          if (summary.priorityScore >= 7) {
            attentionQueue.push({
              userId,
              priority: summary.priorityScore,
              headline: summary.headline,
            });
          }
          if (upsell.recommend) {
            upsellCandidates.push({
              userId,
              targetTier: upsell.targetTier,
              urgency: upsell.urgency,
              confidence: upsell.confidence,
            });
          }
        } catch (error) {
          failed++;
          console.error(`${LOG_PREFIX} Failed for ${userId}:`, error);
        }
      })
    );
  }

  attentionQueue.sort((a, b) => b.priority - a.priority);
  upsellCandidates.sort((a, b) => b.confidence - a.confidence);

  const durationMs = Date.now() - startedAt;
  console.log(
    `${LOG_PREFIX} Done: ${processed} processed, ${failed} failed, ` +
      `${attentionQueue.length} high-priority, ${upsellCandidates.length} upsell candidates (${durationMs}ms)`
  );

  return NextResponse.json({
    success: true,
    summary: {
      activeFounders: userIds.length,
      processed,
      failed,
      highPriority: attentionQueue.length,
      upsellCandidates: upsellCandidates.length,
      durationMs,
    },
    attentionQueue: attentionQueue.slice(0, 25),
    upsellCandidates: upsellCandidates.slice(0, 25),
  });
}
