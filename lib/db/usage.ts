/**
 * Usage tracking data layer (AI-6487).
 *
 * Records credit-consuming actions, computes remaining credits against the
 * user's tier allowance, and maintains usage_sessions for the VC success
 * metrics (10+ min sessions, return-within-48h).
 *
 * Uses the Supabase service client directly (not the brittle sql template
 * parser) and aggregates in JS — these tables are append-only and per-user, so
 * the row volume per query is small.
 *
 * Tables: usage_records, usage_sessions (migration 082).
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getUserSubscription } from "@/lib/db/subscriptions";
import { getPlanByPriceId } from "@/lib/stripe/config";
import { UserTier, getTierFromString } from "@/lib/constants";
import {
  getActionCost,
  computeRemainingCredits,
  getTierAllowance,
  type UsageActionType,
} from "@/lib/usage/credits";

/** A session is considered "open" if touched within this idle window. */
export const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes
/** Threshold for the "engaged session" VC metric. */
export const ENGAGED_SESSION_SECONDS = 10 * 60; // 10 minutes
/** Window for the "returning user" VC metric. */
export const RETURN_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface UsageRecord {
  id: string;
  userId: string;
  actionType: string;
  creditsConsumed: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreditStatus {
  tier: UserTier;
  allowance: number;
  consumed: number;
  remaining: number;
  periodStart: string;
}

/** Start of the current calendar month (UTC), ISO string. The billing period. */
export function currentPeriodStart(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

/**
 * Resolve a user's effective tier. Prefers an active Stripe subscription, then
 * an admin-managed profiles.tier, else FREE. Mirrors app/api/user/subscription.
 */
export async function resolveUserTier(userId: string): Promise<UserTier> {
  try {
    const sub = await getUserSubscription(userId);
    if (sub && ["active", "trialing", "past_due"].includes(sub.status)) {
      const plan = getPlanByPriceId(sub.stripePriceId);
      if (plan) return getTierFromString(plan.id);
    }
  } catch {
    /* fall through to profile / FREE */
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", userId)
      .maybeSingle();
    if (data?.tier) return getTierFromString(String(data.tier));
  } catch {
    /* ignore */
  }

  return UserTier.FREE;
}

/**
 * Record a credit-consuming action. Cost is derived from the action type
 * unless an explicit `credits` override is provided. Fail-soft: logs and
 * returns 0 on error so usage accounting never breaks a user request.
 */
export async function recordUsage(
  userId: string,
  action: UsageActionType | string,
  opts: { credits?: number; metadata?: Record<string, unknown> } = {}
): Promise<number> {
  const credits =
    typeof opts.credits === "number" && opts.credits >= 0
      ? opts.credits
      : getActionCost(action);
  try {
    const supabase = createServiceClient();
    await supabase.from("usage_records").insert({
      user_id: userId,
      action_type: action,
      credits_consumed: credits,
      metadata: opts.metadata ?? {},
    });
    return credits;
  } catch (error) {
    console.error("[recordUsage] failed:", error);
    return 0;
  }
}

/** Sum of credits consumed by a user since `sinceIso` (defaults to period start). */
export async function getCreditsConsumed(
  userId: string,
  sinceIso?: string
): Promise<number> {
  const since = sinceIso ?? currentPeriodStart();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("usage_records")
      .select("credits_consumed")
      .eq("user_id", userId)
      .gte("created_at", since);
    return (data ?? []).reduce(
      (sum, r) => sum + (Number(r.credits_consumed) || 0),
      0
    );
  } catch (error) {
    console.error("[getCreditsConsumed] failed:", error);
    return 0;
  }
}

/** Full credit status for a user this period (tier, allowance, consumed, remaining). */
export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  const periodStart = currentPeriodStart();
  const [tier, consumed] = await Promise.all([
    resolveUserTier(userId),
    getCreditsConsumed(userId, periodStart),
  ]);
  return {
    tier,
    allowance: getTierAllowance(tier),
    consumed,
    remaining: computeRemainingCredits(tier, consumed),
    periodStart,
  };
}

/** Recent usage history for a user, newest first. */
export async function getUsageHistory(
  userId: string,
  limit = 50
): Promise<UsageRecord[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("usage_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      actionType: r.action_type,
      creditsConsumed: Number(r.credits_consumed) || 0,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error("[getUsageHistory] failed:", error);
    return [];
  }
}

/**
 * Record session activity (start or heartbeat). Reuses the user's open session
 * if it was touched within SESSION_IDLE_MS, otherwise opens a new one. Returns
 * the session id and its current duration in seconds.
 */
export async function recordSessionActivity(
  userId: string,
  now: Date = new Date()
): Promise<{ sessionId: string; durationSeconds: number } | null> {
  try {
    const supabase = createServiceClient();
    const idleCutoff = new Date(now.getTime() - SESSION_IDLE_MS).toISOString();

    const { data: open } = await supabase
      .from("usage_sessions")
      .select("id, started_at")
      .eq("user_id", userId)
      .is("ended_at", null)
      .gte("last_activity_at", idleCutoff)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (open) {
      const durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(open.started_at).getTime()) / 1000)
      );
      await supabase
        .from("usage_sessions")
        .update({
          last_activity_at: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", open.id);
      return { sessionId: open.id, durationSeconds };
    }

    const { data: created } = await supabase
      .from("usage_sessions")
      .insert({
        user_id: userId,
        started_at: now.toISOString(),
        last_activity_at: now.toISOString(),
        duration_seconds: 0,
      })
      .select("id")
      .single();
    return created ? { sessionId: created.id, durationSeconds: 0 } : null;
  } catch (error) {
    console.error("[recordSessionActivity] failed:", error);
    return null;
  }
}

/** Explicitly close a user's open session(s). */
export async function endSession(
  userId: string,
  now: Date = new Date()
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("usage_sessions")
      .update({ ended_at: now.toISOString() })
      .eq("user_id", userId)
      .is("ended_at", null);
  } catch (error) {
    console.error("[endSession] failed:", error);
  }
}

// ============================================================================
// Admin aggregates / VC metrics
// ============================================================================

export interface UsageSummary {
  totalCredits: number;
  totalActions: number;
  uniqueUsers: number;
  byAction: Record<string, { credits: number; count: number }>;
  topUsers: Array<{ userId: string; credits: number; actions: number }>;
}

/** Aggregate usage across all users since `sinceIso` (default: period start). */
export async function getUsageSummary(
  sinceIso?: string,
  topN = 20
): Promise<UsageSummary> {
  const since = sinceIso ?? currentPeriodStart();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("usage_records")
    .select("user_id, action_type, credits_consumed, created_at")
    .gte("created_at", since)
    .limit(10000);

  const rows = data ?? [];
  const byAction: Record<string, { credits: number; count: number }> = {};
  const byUser: Record<string, { credits: number; actions: number }> = {};
  let totalCredits = 0;

  for (const r of rows) {
    const credits = Number(r.credits_consumed) || 0;
    totalCredits += credits;
    const a = (byAction[r.action_type] ??= { credits: 0, count: 0 });
    a.credits += credits;
    a.count += 1;
    const u = (byUser[r.user_id] ??= { credits: 0, actions: 0 });
    u.credits += credits;
    u.actions += 1;
  }

  const topUsers = Object.entries(byUser)
    .map(([userId, v]) => ({ userId, credits: v.credits, actions: v.actions }))
    .sort((a, b) => b.credits - a.credits)
    .slice(0, topN);

  return {
    totalCredits,
    totalActions: rows.length,
    uniqueUsers: Object.keys(byUser).length,
    byAction,
    topUsers,
  };
}

export interface SessionMetrics {
  totalSessions: number;
  engagedSessions: number; // >= 10 minutes
  engagedRate: number; // 0..1
  avgDurationSeconds: number;
  returningUsers: number; // had a session within 48h of a prior session
  usersWithSessions: number;
  returnWithin48hRate: number; // 0..1
}

/**
 * Session-based VC metrics since `sinceIso` (default: trailing 30 days):
 *  - share of sessions lasting 10+ minutes
 *  - share of users who returned within 48h of a previous session
 */
export async function getSessionMetrics(
  sinceIso?: string
): Promise<SessionMetrics> {
  const since =
    sinceIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("usage_sessions")
    .select("user_id, started_at, duration_seconds")
    .gte("started_at", since)
    .order("started_at", { ascending: true })
    .limit(10000);

  const rows = data ?? [];
  const total = rows.length;
  let engaged = 0;
  let durationSum = 0;
  const startsByUser: Record<string, number[]> = {};

  for (const r of rows) {
    const dur = Number(r.duration_seconds) || 0;
    durationSum += dur;
    if (dur >= ENGAGED_SESSION_SECONDS) engaged += 1;
    (startsByUser[r.user_id] ??= []).push(new Date(r.started_at).getTime());
  }

  let returningUsers = 0;
  const usersWithSessions = Object.keys(startsByUser).length;
  for (const starts of Object.values(startsByUser)) {
    starts.sort((a, b) => a - b);
    const returned = starts.some(
      (t, i) => i > 0 && t - starts[i - 1] <= RETURN_WINDOW_MS
    );
    if (returned) returningUsers += 1;
  }

  return {
    totalSessions: total,
    engagedSessions: engaged,
    engagedRate: total ? engaged / total : 0,
    avgDurationSeconds: total ? Math.round(durationSum / total) : 0,
    returningUsers,
    usersWithSessions,
    returnWithin48hRate: usersWithSessions
      ? returningUsers / usersWithSessions
      : 0,
  };
}
