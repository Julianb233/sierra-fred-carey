/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats
 * Returns aggregated counts for the dashboard overview cards.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface DashboardStats {
  ideasAnalyzed: number;
  pitchDecksReviewed: number;
  checkInsCompleted: number;
  activeAgents: number;
  recentActivity: Array<{
    action: string;
    item: string;
    time: string;
    score: number | null;
  }>;
}

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Run all count queries in parallel with graceful fallbacks
    const [
      ideasResult,
      pitchResult,
      checkInsResult,
      agentsResult,
      recentResult,
    ] = await Promise.all([
      // Ideas analyzed: count fred_episodic_memory conversation entries
      // or reality lens assessments
      Promise.resolve(
        supabase
          .from("fred_episodic_memory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("event_type", "conversation")
      ).then((r) => r.count ?? 0)
        .catch(() => 0),

      // Pitch decks reviewed
      Promise.resolve(
        supabase
          .from("pitch_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      ).then((r) => r.count ?? 0)
        .catch(() => 0),

      // Check-ins completed
      Promise.resolve(
        supabase
          .from("sms_checkins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      ).then((r) => r.count ?? 0)
        .catch(() => 0),

      // Active agents (running or pending)
      Promise.resolve(
        supabase
          .from("agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["running", "pending"])
      ).then((r) => r.count ?? 0)
        .catch(() => 0),

      // Recent activity: last 5 items across tables
      getRecentActivity(supabase, userId),
    ]);

    const stats: DashboardStats = {
      ideasAnalyzed: ideasResult as number,
      pitchDecksReviewed: pitchResult as number,
      checkInsCompleted: checkInsResult as number,
      activeAgents: agentsResult as number,
      recentActivity: recentResult,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Dashboard Stats] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

async function getRecentActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<DashboardStats["recentActivity"]> {
  try {
    // Fetch recent items from multiple tables and merge
    const [episodes, pitchReviews, strategies] = await Promise.all([
      supabase
        .from("fred_episodic_memory")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("event_type", "conversation")
        .order("created_at", { ascending: false })
        .limit(3)
        .then((r) => r.data ?? []),

      supabase
        .from("pitch_reviews")
        .select("title, overall_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3)
        .then((r) => r.data ?? []),

      supabase
        .from("strategy_documents")
        .select("title, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3)
        .then((r) => r.data ?? []),
    ]);

    const activities: Array<{
      action: string;
      item: string;
      time: string;
      score: number | null;
      date: Date;
    }> = [];

    for (const ep of episodes) {
      const content = ep.content as { role?: string; content?: string } | null;
      if (content?.role === "user") {
        activities.push({
          action: "Analyzed",
          item: String(content.content || "Conversation").slice(0, 60),
          time: ep.created_at,
          score: null,
          date: new Date(ep.created_at),
        });
      }
    }

    for (const pr of pitchReviews) {
      activities.push({
        action: "Reviewed",
        item: pr.title || "Pitch Deck",
        time: pr.created_at,
        score: pr.overall_score ?? null,
        date: new Date(pr.created_at),
      });
    }

    for (const sd of strategies) {
      activities.push({
        action: "Generated",
        item: sd.title || "Strategy Document",
        time: sd.created_at,
        score: null,
        date: new Date(sd.created_at),
      });
    }

    // Sort by date descending, take top 5
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    const top5 = activities.slice(0, 5);

    // Format relative time
    return top5.map(({ action, item, time, score }) => ({
      action,
      item,
      time: formatRelativeTime(new Date(time)),
      score,
    }));
  } catch {
    return [];
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}
